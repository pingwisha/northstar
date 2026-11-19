// The calendar: only the person's own active goals appear, and checking works from here too.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions, load } from '../src/routes/(app)/calendar/+page.server';
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
const open = (userId: string, query = '') => load({ locals: { userId }, platform: platform(), url: new URL(`http://localhost/calendar${query}`) } as never) as Promise<{ month: string; days: Record<string, { total: number; deadlines: string[] }>; dayTasks: { id: string }[] }>;

async function seed(userId: string, date: string) {
	const goalId = await scoped(db, userId).addGoal({ title: 'Цель', description: null, deadline: '2030-01-01' }, '2026-11-01');
	await db.prepare('INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES (?, ?, ?, ?, ?)').bind(`t-${userId}`, userId, goalId, 'Задача', date).run();
	return goalId;
}

describe('calendar', () => {
	it('counts the person\'s tasks per day and marks the deadline', async () => {
		await seed('a', '2026-11-20');
		const result = await open('a', '?month=2026-11&day=2026-11-20');
		expect(result.days['2026-11-20'].total).toBe(1);
		expect(result.days['2030-01-01'].deadlines).toEqual(['Цель']);
		expect(result.dayTasks.map((t) => t.id)).toEqual(['t-a']);
	});

	it('does not show another person\'s tasks', async () => {
		await seed('a', '2026-11-20');
		const result = await open('b', '?month=2026-11&day=2026-11-20');
		expect(result.days).toEqual({});
		expect(result.dayTasks).toEqual([]);
	});

	it('leaves out the tasks of a finished goal', async () => {
		const goalId = await seed('a', '2026-11-20');
		await scoped(db, 'a').setGoalStatus(goalId, 'done');
		expect((await open('a', '?month=2026-11&day=2026-11-20')).dayTasks).toEqual([]);
	});

	it('falls back to the current month for a bad month in the address', async () => {
		const result = await open('a', '?month=nonsense&day=also-bad');
		expect(result.month).toMatch(/^\d{4}-\d{2}$/);
	});

	it('checks a task from the calendar, and only one\'s own', async () => {
		await seed('a', '2026-11-20');
		const body = new FormData();
		body.set('id', 't-a');
		body.set('done', '1');
		const as = (userId: string) => actions.check!({ request: new Request('http://localhost/calendar', { method: 'POST', body }), locals: { userId }, platform: platform() } as never);
		expect(await as('b')).toMatchObject({ status: 404 });
		expect(await as('a')).toMatchObject({ ok: true });
	});
});
