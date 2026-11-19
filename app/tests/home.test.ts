// The home page «Сегодня»: what it loads and how checking a task is kept per person.
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
const today = () => todayIso();

async function seed(userId: string, planned: string[]): Promise<{ goalId: string; taskIds: string[] }> {
	const goalId = await scoped(db, userId).addGoal({ title: 'Цель', description: null, deadline: '2030-01-01' }, today());
	const taskIds = planned.map(() => crypto.randomUUID());
	await db.batch(
		planned.map((p, i) => db.prepare('INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES (?, ?, ?, ?, ?)').bind(taskIds[i], userId, goalId, `Задача ${i}`, p))
	);
	return { goalId, taskIds };
}

const check = (userId: string, id: string, done: boolean) => {
	const body = new FormData();
	body.set('id', id);
	body.set('done', done ? '1' : '0');
	return actions.check!({ request: new Request('http://localhost/', { method: 'POST', body }), locals: { userId }, platform: platform() } as never);
};
const loadFor = (userId: string) => load({ locals: { userId }, platform: platform() } as never) as Promise<{ home: Awaited<ReturnType<typeof import('../src/lib/home-view').buildHome>> }>;

describe('home page', () => {
	it('changes the percent as soon as a task is checked, and back when unchecked', async () => {
		const { taskIds } = await seed('a', [today(), today()]);
		expect((await loadFor('a')).home.overall).toBe(0);
		await check('a', taskIds[0], true);
		const home = (await loadFor('a')).home;
		expect(home.overall).toBe(50);
		expect(home.today.find((t) => t.id === taskIds[0])?.done).toBe(true);
		await check('a', taskIds[0], false);
		expect((await loadFor('a')).home.overall).toBe(0);
	});

	it('keeps the first completion time when a done task is checked again', async () => {
		const { taskIds } = await seed('a', [today()]);
		await scoped(db, 'a').setTaskCompleted(taskIds[0], true, new Date('2026-01-01T10:00:00Z'));
		await scoped(db, 'a').setTaskCompleted(taskIds[0], true, new Date('2026-01-02T10:00:00Z'));
		const row = await db.prepare('SELECT completed_at FROM tasks WHERE id = ?').bind(taskIds[0]).first<{ completed_at: string }>();
		expect(row!.completed_at).toBe('2026-01-01T10:00:00.000Z');
	});

	it('does not let one person check another\'s task', async () => {
		const { taskIds } = await seed('a', [today()]);
		const result = await check('b', taskIds[0], true);
		expect(result).toMatchObject({ status: 404 });
		expect((await loadFor('a')).home.overall).toBe(0);
	});

	it('does not change a task of a finished goal', async () => {
		const { goalId, taskIds } = await seed('a', [today()]);
		await scoped(db, 'a').setGoalStatus(goalId, 'done');
		expect(await scoped(db, 'a').setTaskCompleted(taskIds[0], true)).toBe(false);
	});

	it('shows only the person\'s own tasks', async () => {
		await seed('a', [today()]);
		expect((await loadFor('b')).home.today).toEqual([]);
	});

	it('shows the materials of a task, with a link or a hint where to look', async () => {
		const { taskIds } = await seed('a', [today()]);
		await db.batch([
			db.prepare("INSERT INTO materials (id, user_id, task_id, kind, title, url) VALUES ('m1', 'a', ?, 'trainer', 'Тренажёр', 'https://example.com/')").bind(taskIds[0]),
			db.prepare("INSERT INTO materials (id, user_id, task_id, kind, title, source) VALUES ('m2', 'a', ?, 'article', 'Конспект', 'учебник')").bind(taskIds[0])
		]);
		const task = (await loadFor('a')).home.today[0];
		expect(task.materials).toEqual([
			{ kind: 'trainer', title: 'Тренажёр', url: 'https://example.com/', hint: null },
			{ kind: 'article', title: 'Конспект', url: null, hint: 'учебник' }
		]);
		expect((await loadFor('b')).home.today).toEqual([]);
	});
});
