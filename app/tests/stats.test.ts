import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { load } from '../src/routes/(app)/stats/+page.server';
import { computeStats } from '../src/lib/stats';
import { makeDb } from './helpers';

let mf: Miniflare;
let db: D1Database;

beforeEach(async () => {
	({ mf, db } = await makeDb());
});
afterEach(async () => {
	await mf.dispose();
});

const run = (sql: string, ...binds: unknown[]) => db.prepare(sql).bind(...binds).run();
const user = (id: string, email: string, role: string, createdAt: string) => run('INSERT INTO users (id, email, role, created_at) VALUES (?, ?, ?, ?)', id, email, role, createdAt);
const goal = (id: string, userId: string, createdAt: string, deadline: string) =>
	run("INSERT INTO goals (id, user_id, title, start_date, deadline, created_at) VALUES (?, ?, 'СЕКРЕТНАЯ ЦЕЛЬ', ?, ?, ?)", id, userId, createdAt.slice(0, 10), deadline, createdAt);
const task = (id: string, userId: string, goalId: string, completedAt: string | null) =>
	run("INSERT INTO tasks (id, user_id, goal_id, title, planned_for, weight, completed_at) VALUES (?, ?, ?, 'Секретная задача', '2026-12-01', 1, ?)", id, userId, goalId, completedAt);

const event = (role: string | undefined) => ({ locals: { userId: 'x', role, timezone: 'UTC' }, platform: { env: { DB: db } } }) as never;

// today is 2026-12-10 in these tests (computeStats takes it as an argument; the page uses the clock).
async function seed() {
	await user('own', 'owner@example.com', 'owner', '2026-10-01T10:00:00.000Z');
	await user('old', 'old@example.com', 'member', '2026-11-10T10:00:00.000Z');
	await user('a', 'a@example.com', 'member', '2026-11-24T10:00:00.000Z');
	await user('b', 'b@example.com', 'member', '2026-11-25T10:00:00.000Z');
	await user('t', 'e2e-test@example.com', 'member', '2026-11-26T10:00:00.000Z');
	// a: checked on day 1 and on day 8; b: never; owner and test account have plans too.
	await goal('ga', 'a', '2026-11-24T10:00:00.000Z', '2026-12-04');
	await task('ta1', 'a', 'ga', '2026-11-25T09:00:00.000Z');
	await task('ta2', 'a', 'ga', '2026-12-02T09:00:00.000Z');
	await task('ta3', 'a', 'ga', null);
	await goal('gb', 'b', '2026-11-25T10:00:00.000Z', '2027-03-01');
	await goal('go', 'own', '2026-11-24T10:00:00.000Z', '2026-12-30');
	await task('to1', 'own', 'go', '2026-11-25T09:00:00.000Z');
	await goal('gt', 't', '2026-11-26T10:00:00.000Z', '2026-12-30');
	await task('tt1', 't', 'gt', '2026-11-27T09:00:00.000Z');
	// An earlier goal of someone who joined before the window does not count.
	await goal('gold', 'old', '2026-11-12T10:00:00.000Z', '2026-12-30');
	await task('told', 'old', 'gold', '2026-11-13T09:00:00.000Z');
}

describe('the statistics page', () => {
	it('is closed to a member and to nobody', async () => {
		await expect(load(event('member'))).rejects.toMatchObject({ status: 403 });
		await expect(load(event(undefined))).rejects.toMatchObject({ status: 403 });
	});

	it('counts other people only: not the owner, not test accounts, not people from before the window', async () => {
		await seed();
		const stats = (await load(event('owner'))) as { stats: ReturnType<typeof computeStats> };
		// Goals made in the window by real people: ga (has tasks) and gb (none).
		expect(stats.stats.planAccept).toEqual({ count: 1, of: 2 });
		// People who joined in the window: a and b; only a checked a task within 3 days.
		expect(stats.stats.firstThreeDays).toEqual({ count: 1, of: 2 });
	});

	it('holds only counts, no names, emails, ids or goal text', async () => {
		await seed();
		const body = JSON.stringify(await load(event('owner')));
		for (const secret of ['СЕКРЕТНАЯ', 'Секретная', '@example.com', '"a"', 'ga', 'user_id', 'email', 'title']) expect(body).not.toContain(secret);
	});
});

describe('computeStats', () => {
	const users = [
		{ id: 'a', createdAt: '2026-11-24T10:00:00.000Z' },
		{ id: 'b', createdAt: '2026-11-25T10:00:00.000Z' },
		{ id: 'c', createdAt: '2026-12-08T10:00:00.000Z' }
	];
	const goals = [
		{ id: 'ga', userId: 'a', createdAt: '2026-11-24T10:00:00.000Z', deadline: '2026-12-04' },
		{ id: 'gb', userId: 'b', createdAt: '2026-11-25T10:00:00.000Z', deadline: '2027-03-01' }
	];
	const tasks = [
		{ goalId: 'ga', userId: 'a', weight: 1, completedAt: '2026-11-25T09:00:00.000Z' },
		{ goalId: 'ga', userId: 'a', weight: 1, completedAt: '2026-12-02T09:00:00.000Z' },
		{ goalId: 'ga', userId: 'a', weight: 2, completedAt: null }
	];

	it('reads day 7 only among people who joined at least 7 days ago', () => {
		const s = computeStats(users, goals, tasks, '2026-12-10');
		// a and b are old enough, c is not; a checked a task on day 8.
		expect(s.daySevenReturn).toEqual({ count: 1, of: 2 });
	});

	it('averages the honest percent of goals past the middle of their term, only those with a plan', () => {
		const s = computeStats(users, goals, tasks, '2026-12-10');
		// ga: 2 of 4 weight checked = 50; gb has no tasks and its middle has not come.
		expect(s.midpoint).toEqual({ percent: 50, goals: 1 });
		expect(computeStats(users, goals, tasks, '2026-11-26').midpoint).toEqual({ percent: null, goals: 0 });
	});

	it('does not divide by zero on an empty site', () => {
		expect(computeStats([], [], [], '2026-12-10')).toMatchObject({ planAccept: { count: 0, of: 0 }, midpoint: { percent: null, goals: 0 } });
	});
});
