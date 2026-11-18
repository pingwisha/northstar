// Goals in the database: each person sees and changes only their own.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions, load } from '../src/routes/(app)/goals/+page.server';
import { scoped } from '../src/lib/server/db';
import { MAX_ACTIVE_GOALS } from '../src/lib/goals';
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

const goal = { title: 'Сдать экзамен', description: null, deadline: '2030-05-18' };
const platform = () => ({ env: { DB: db } }) as unknown as App.Platform;
const post = (fields: Record<string, string>) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return new Request('http://localhost/goals', { method: 'POST', body });
};
type Event = Parameters<NonNullable<typeof actions.add>>[0];
const as = (userId: string, request: Request) => ({ request, locals: { userId }, platform: platform() }) as unknown as Event;

describe('goals in the database', () => {
	it('keeps one person\'s goals out of another\'s list', async () => {
		await scoped(db, 'a').addGoal(goal, '2026-11-18');
		expect(await scoped(db, 'a').listGoals()).toHaveLength(1);
		expect(await scoped(db, 'b').listGoals()).toHaveLength(0);
	});

	it('does not let one person change or finish another\'s goal', async () => {
		const id = await scoped(db, 'a').addGoal(goal, '2026-11-18');
		expect(await scoped(db, 'b').setDeadline(id, '2031-01-01')).toBe(false);
		expect(await scoped(db, 'b').setGoalStatus(id, 'done')).toBe(false);
		const [still] = await scoped(db, 'a').listGoals();
		expect(still).toMatchObject({ deadline: '2030-05-18', status: 'active' });
	});

	it('does not move the deadline of a goal that is already finished', async () => {
		const id = await scoped(db, 'a').addGoal(goal, '2026-11-18');
		await scoped(db, 'a').setGoalStatus(id, 'done');
		expect(await scoped(db, 'a').setDeadline(id, '2031-01-01')).toBe(false);
	});
});

describe('the goals page actions', () => {
	it('adds a goal and shows it on the page with 0% and no plan', async () => {
		await actions.add!(as('a', post({ title: 'Выучить сербский', description: '', deadline: '2030-02-12' })));
		const page = (await load(as('a', post({})) as never)) as { cards: { title: string; percent: number; nextStep: unknown }[] };
		expect(page.cards).toMatchObject([{ title: 'Выучить сербский', percent: 0, nextStep: null }]);
	});

	it('refuses a goal without a title or with a past deadline and stores nothing', async () => {
		expect(await actions.add!(as('a', post({ title: ' ', deadline: '2030-02-12' })))).toMatchObject({ status: 400 });
		expect(await actions.add!(as('a', post({ title: 'x', deadline: '2020-02-12' })))).toMatchObject({ status: 400 });
		expect(await scoped(db, 'a').listGoals()).toHaveLength(0);
	});

	it('stops at the limit of active goals', async () => {
		for (let i = 0; i < MAX_ACTIVE_GOALS; i++) await scoped(db, 'a').addGoal(goal, '2026-11-18');
		expect(await actions.add!(as('a', post({ title: 'ещё одна', deadline: '2030-02-12' })))).toMatchObject({ status: 400 });
	});

	it('changes a deadline and finishes a goal, only for its owner', async () => {
		const id = await scoped(db, 'a').addGoal(goal, '2026-11-18');
		expect(await actions.deadline!(as('b', post({ id, deadline: '2031-01-01' })))).toMatchObject({ status: 404 });
		expect(await actions.deadline!(as('a', post({ id, deadline: '2031-01-01' })))).toMatchObject({ ok: true });
		expect(await actions.finish!(as('b', post({ id })))).toMatchObject({ status: 404 });
		expect(await actions.finish!(as('a', post({ id })))).toMatchObject({ ok: true });
		expect((await scoped(db, 'a').listGoals())[0]).toMatchObject({ deadline: '2031-01-01', status: 'done' });
	});
});

describe('«Я отстаю»', () => {
	const addTasks = async (userId: string, goalId: string, days: string[]) => {
		await db.batch(days.map((d, i) => db.prepare('INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES (?, ?, ?, ?, ?)').bind(`${userId}-${goalId}-${i}`, userId, goalId, `З${i}`, d)));
	};
	const behind = (userId: string, id: string) => actions.behind!(as(userId, post({ id })));

	it('moves overdue tasks to today or later and keeps the deadline', async () => {
		const id = await scoped(db, 'a').addGoal(goal, '2026-01-01');
		await addTasks('a', id, ['2026-01-02', '2026-01-03', '2026-01-04']);
		const result = (await behind('a', id)) as { ok?: boolean; summary?: string };
		expect(result.ok).toBe(true);
		const rows = await scoped(db, 'a').listGoalTasks();
		expect(rows.every((t) => t.planned_for >= '2026-01-02')).toBe(true);
		expect(rows.some((t) => t.planned_for < new Date().toISOString().slice(0, 10) && t.completed_at === null)).toBe(false);
		expect(rows.every((t) => t.planned_for < goal.deadline)).toBe(true);
		expect((await scoped(db, 'a').listGoals())[0].deadline).toBe(goal.deadline);
	});

	it('does not move another person\'s tasks', async () => {
		const id = await scoped(db, 'a').addGoal(goal, '2026-01-01');
		await addTasks('a', id, ['2026-01-02']);
		const result = await behind('b', id);
		expect(result).toMatchObject({ status: 404 });
		expect((await scoped(db, 'a').listGoalTasks())[0].planned_for).toBe('2026-01-02');
	});

	it('keeps the date of a done task', async () => {
		const id = await scoped(db, 'a').addGoal(goal, '2026-01-01');
		await addTasks('a', id, ['2026-01-02', '2026-01-03']);
		await scoped(db, 'a').setTaskCompleted('a-' + id + '-0', true);
		await behind('a', id);
		const rows = await scoped(db, 'a').listGoalTasks();
		expect(rows.find((t) => t.id === 'a-' + id + '-0')!.planned_for).toBe('2026-01-02');
	});
});
