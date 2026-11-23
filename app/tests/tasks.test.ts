// Tasks written by hand: add, rename, move and delete, each person only their own.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions, load } from '../src/routes/(app)/+page.server';
import { todayIso } from '../src/lib/goals';
import { scoped } from '../src/lib/server/db';
import { makeDb } from './helpers';

let mf: Miniflare;
let db: D1Database;

beforeEach(async () => {
	({ mf, db } = await makeDb());
	await db.prepare("INSERT INTO users (id, email) VALUES ('a', 'a@example.com'), ('b', 'b@example.com')").run();
});

afterEach(async () => {
	await mf.dispose();
});

const platform = () => ({ env: { DB: db } }) as unknown as App.Platform;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const today = () => todayIso();

const run = (name: 'addTask' | 'editTask' | 'deleteTask' | 'check' | 'postpone', userId: string, fields: Record<string, string>) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return actions[name]!({ request: new Request('http://localhost/', { method: 'POST', body }), locals: { userId }, platform: platform() } as never);
};
const tasksOf = (userId: string) => scoped(db, userId).listGoalTasks();
const goalFor = (userId: string, deadline = addDays(today(), 30)) => scoped(db, userId).addGoal({ title: 'Цель', description: null, deadline }, today());

describe('adding tasks by hand', () => {
	it('adds one task, or a list with one task per line', async () => {
		const goalId = await goalFor('a');
		expect(await run('addTask', 'a', { goalId, titles: 'Первая', day: today() })).toMatchObject({ ok: true });
		expect(await run('addTask', 'a', { goalId, titles: '- Вторая\n2. Третья\n', day: addDays(today(), 2) })).toMatchObject({ ok: true });
		const rows = await tasksOf('a');
		expect(rows.map((t) => t.title)).toEqual(['Первая', 'Вторая', 'Третья']);
		expect(rows.map((t) => t.planned_for)).toEqual([today(), addDays(today(), 2), addDays(today(), 2)]);
	});

	it('lowers the percent honestly: a new task counts as not done', async () => {
		const goalId = await goalFor('a');
		await run('addTask', 'a', { goalId, titles: 'Первая', day: today() });
		await scoped(db, 'a').setTaskCompleted((await tasksOf('a'))[0].id, true);
		expect(((await load({ locals: { userId: 'a' }, platform: platform() } as never)) as { home: { overall: number } }).home.overall).toBe(100);
		await run('addTask', 'a', { goalId, titles: 'Вторая', day: today() });
		expect(((await load({ locals: { userId: 'a' }, platform: platform() } as never)) as { home: { overall: number } }).home.overall).toBe(50);
	});

	it('refuses a past day, a day after the deadline, an empty text and another person\'s goal', async () => {
		const goalId = await goalFor('a', addDays(today(), 5));
		expect(await run('addTask', 'a', { goalId, titles: 'З', day: addDays(today(), -1) })).toMatchObject({ status: 400 });
		expect(await run('addTask', 'a', { goalId, titles: 'З', day: addDays(today(), 6) })).toMatchObject({ status: 400 });
		expect(await run('addTask', 'a', { goalId, titles: '  ', day: today() })).toMatchObject({ status: 400 });
		expect(await run('addTask', 'b', { goalId, titles: 'З', day: today() })).toMatchObject({ status: 404 });
		expect(await tasksOf('a')).toEqual([]);
		expect(await tasksOf('b')).toEqual([]);
	});

	it('does not add to a finished goal', async () => {
		const goalId = await goalFor('a');
		await scoped(db, 'a').setGoalStatus(goalId, 'done');
		expect(await run('addTask', 'a', { goalId, titles: 'З', day: today() })).toMatchObject({ status: 404 });
	});
});

describe('changing and deleting tasks', () => {
	const seed = async (userId = 'a') => {
		const goalId = await goalFor(userId);
		await run('addTask', userId, { goalId, titles: 'Исходная', day: today() });
		return (await tasksOf(userId))[0].id;
	};

	it('renames and moves a task', async () => {
		const id = await seed();
		expect(await run('editTask', 'a', { id, title: '  Новая  ', day: addDays(today(), 3) })).toMatchObject({ ok: true });
		expect((await tasksOf('a'))[0]).toMatchObject({ title: 'Новая', planned_for: addDays(today(), 3) });
	});

	it('lets a task that is already past be renamed without moving it', async () => {
		const goalId = await goalFor('a');
		const past = addDays(today(), -3);
		await db.prepare("INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('old', 'a', ?, 'Старая', ?)").bind(goalId, past).run();
		expect(await run('editTask', 'a', { id: 'old', title: 'Старая, но с новым названием', day: past })).toMatchObject({ ok: true });
		expect(await run('editTask', 'a', { id: 'old', title: 'Старая', day: addDays(today(), -2) })).toMatchObject({ status: 400 });
	});

	it('refuses a bad title or a day after the deadline', async () => {
		const id = await seed();
		expect(await run('editTask', 'a', { id, title: '   ', day: today() })).toMatchObject({ status: 400 });
		expect(await run('editTask', 'a', { id, title: 'Х', day: addDays(today(), 31) })).toMatchObject({ status: 400 });
		expect((await tasksOf('a'))[0].title).toBe('Исходная');
	});

	it('deletes a task, and the percent follows', async () => {
		const goalId = await goalFor('a');
		await run('addTask', 'a', { goalId, titles: 'Одна\nДругая', day: today() });
		const [one, other] = await tasksOf('a');
		await scoped(db, 'a').setTaskCompleted(one.id, true);
		expect(await run('deleteTask', 'a', { id: other.id })).toMatchObject({ ok: true });
		expect(((await load({ locals: { userId: 'a' }, platform: platform() } as never)) as { home: { overall: number } }).home.overall).toBe(100);
	});

	it('does not let another person change or delete a task', async () => {
		const id = await seed();
		expect(await run('editTask', 'b', { id, title: 'Взлом', day: today() })).toMatchObject({ status: 404 });
		expect(await run('deleteTask', 'b', { id })).toMatchObject({ status: 404 });
		expect(await tasksOf('a')).toHaveLength(1);
		expect((await tasksOf('a'))[0].title).toBe('Исходная');
	});

	it('does not change or delete a task of a finished goal', async () => {
		const id = await seed();
		await scoped(db, 'a').setGoalStatus((await tasksOf('a'))[0].goal_id, 'done');
		expect(await run('editTask', 'a', { id, title: 'Х', day: today() })).toMatchObject({ status: 404 });
		expect(await run('deleteTask', 'a', { id })).toMatchObject({ status: 404 });
		expect(await tasksOf('a')).toHaveLength(1);
	});
});

describe('moving a task to tomorrow', () => {
	const add = async (userId: string, goalId: string, day: string) => {
		await scoped(db, userId).addTasks(goalId, ['Задача'], day);
		return (await tasksOf(userId))[0];
	};

	it('moves an overdue task to tomorrow and keeps its title', async () => {
		const goalId = await goalFor('a');
		const task = await add('a', goalId, addDays(today(), -3));
		expect(await run('postpone', 'a', { id: task.id })).toMatchObject({ ok: true });
		expect((await tasksOf('a'))[0]).toMatchObject({ title: 'Задача', planned_for: addDays(today(), 1) });
	});

	it('refuses a done task, a task already later than today, and another person\'s task', async () => {
		const goalId = await goalFor('a');
		const done = await add('a', goalId, addDays(today(), -1));
		await scoped(db, 'a').setTaskCompleted(done.id, true);
		expect(await run('postpone', 'a', { id: done.id })).toMatchObject({ status: 400 });
		await scoped(db, 'a').addTasks(goalId, ['Будущая'], addDays(today(), 5));
		const future = (await tasksOf('a')).find((t) => t.title === 'Будущая')!;
		expect(await run('postpone', 'a', { id: future.id })).toMatchObject({ status: 400 });
		expect(await run('postpone', 'b', { id: done.id })).toMatchObject({ status: 404 });
	});

	it('does not push a task past the deadline of its goal', async () => {
		const goalId = await goalFor('a', today());
		const task = await add('a', goalId, today());
		expect(await run('postpone', 'a', { id: task.id })).toMatchObject({ status: 400 });
		expect((await tasksOf('a'))[0].planned_for).toBe(today());
	});
});
