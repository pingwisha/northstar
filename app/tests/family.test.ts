// Only the owner manages invites; a member is refused, an owner can add and remove.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions, load } from '../src/routes/(app)/family/+page.server';
import { listInvites } from '../src/lib/server/db';
import { makeDb } from './helpers';

let mf: Miniflare;
let db: D1Database;

beforeEach(async () => {
	({ mf, db } = await makeDb());
	await db.prepare("INSERT INTO users (id, email, role) VALUES ('o1', 'owner@example.com', 'owner')").run();
});

afterEach(async () => {
	await mf.dispose();
});

const platform = () => ({ env: { DB: db } }) as unknown as App.Platform;
const post = (email: string) => {
	const body = new FormData();
	body.set('email', email);
	return new Request('http://localhost/family', { method: 'POST', body });
};
type AddEvent = Parameters<NonNullable<typeof actions.add>>[0];
const event = (role: App.Locals['role'], request: Request) =>
	({ request, locals: { userId: 'o1', email: 'owner@example.com', role }, platform: platform() }) as unknown as AddEvent;

describe('the family page', () => {
	it('is forbidden to a member', async () => {
		await expect(load(event('member', post('')) as never)).rejects.toMatchObject({ status: 403 });
		await expect(actions.add!(event('member', post('x@example.com')))).rejects.toMatchObject({ status: 403 });
		expect(await listInvites(db)).toHaveLength(0);
	});

	it('lets the owner invite and remove, ignoring letter case', async () => {
		await actions.add!(event('owner', post(' Friend@Example.com ')));
		expect((await listInvites(db)).map((i) => i.email)).toEqual(['friend@example.com']);
		await actions.remove!(event('owner', post('FRIEND@example.com')));
		expect(await listInvites(db)).toHaveLength(0);
	});

	it('rejects something that is not an email', async () => {
		const result = await actions.add!(event('owner', post('not an email')));
		expect(result).toMatchObject({ status: 400 });
		expect(await listInvites(db)).toHaveLength(0);
	});
});

describe('site stats', () => {
	it('counts people and work without showing anyones content', async () => {
		const { siteStats } = await import('../src/lib/server/db');
		const now = new Date('2026-11-21T12:00:00Z');
		await db.prepare("DELETE FROM users").run();
		await db.prepare("INSERT INTO users (id, email, role, created_at) VALUES ('o', 'o@example.com', 'owner', '2026-10-01T00:00:00Z'), ('m', 'm@example.com', 'member', '2026-11-20T00:00:00Z')").run();
		await db.prepare("INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('g', 'm', 'Секретная цель', '2026-11-01', '2027-01-01')").run();
		await db.prepare("INSERT INTO tasks (id, user_id, goal_id, title, planned_for, completed_at) VALUES ('t1', 'm', 'g', 'a', '2026-11-20', '2026-11-20T08:00:00Z'), ('t2', 'm', 'g', 'b', '2026-11-01', '2026-11-01T08:00:00Z')").run();
		await db.prepare("INSERT INTO ai_usage (user_id, day, count) VALUES ('m', '2026-11-21', 3), ('o', '2026-11-21', 9)").run();
		const stats = await siteStats(db, now);
		expect(stats).toEqual({ users: 2, newThisWeek: 1, activeThisWeek: 1, goals: 1, tasksDoneThisWeek: 1, aiMembersToday: 3 });
		expect(JSON.stringify(stats)).not.toContain('Секретная');
	});
});
