import { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeDb } from './helpers';

let mf: Miniflare;
let db: D1Database;

beforeEach(async () => {
	({ mf, db } = await makeDb());
});

afterEach(async () => {
	await mf.dispose();
});

const run = (sql: string, ...args: unknown[]) => db.prepare(sql).bind(...args).run();
const count = async (table: string) =>
	(await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())!.n;

async function seedGoal() {
	await run("INSERT INTO users (id, email) VALUES ('u1', 'a@example.com')");
	await run("INSERT INTO goals (id, user_id, title, start_date, deadline) VALUES ('g1', 'u1', 'Экзамен', '2026-11-18', '2027-05-18')");
	await run("INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('t1', 'u1', 'g1', 'Тема 1', '2026-11-19')");
}

describe('foundation schema', () => {
	it('creates the tables', async () => {
		const { results } = await db
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%'")
			.all<{ name: string }>();
		expect(results.map((r) => r.name).sort()).toEqual(['ai_usage', 'chat_messages', 'chats', 'friend_invites', 'friendships', 'goals', 'invites', 'materials',
			'mistakes', 'plan_drafts', 'push_subscriptions', 'stages', 'tasks', 'trials', 'users']);
	});

	it('keeps one user per email, ignoring case', async () => {
		await run("INSERT INTO users (id, email) VALUES ('u1', 'Mary@Example.com')");
		await expect(run("INSERT INTO users (id, email) VALUES ('u2', 'mary@example.com')")).rejects.toThrow();
	});

	it('starts users as members and goals as active', async () => {
		await seedGoal();
		expect((await db.prepare("SELECT role FROM users WHERE id = 'u1'").first<{ role: string }>())!.role).toBe('member');
		expect((await db.prepare("SELECT status FROM goals WHERE id = 'g1'").first<{ status: string }>())!.status).toBe('active');
	});

	it('rejects a task with a non-positive weight', async () => {
		await seedGoal();
		await expect(run("INSERT INTO tasks (id, user_id, goal_id, title, planned_for, weight) VALUES ('t2', 'u1', 'g1', 'x', '2026-11-20', 0)")).rejects.toThrow();
	});

	it('deletes a user together with all their rows', async () => {
		await seedGoal();
		await run("INSERT INTO materials (id, user_id, task_id, kind, title) VALUES ('m1', 'u1', 't1', 'article', 'Статья')");
		await run("INSERT INTO chats (id, user_id) VALUES ('c1', 'u1')");
		await run("INSERT INTO chat_messages (id, user_id, chat_id, role, content) VALUES ('cm1', 'u1', 'c1', 'user', 'привет')");
		await run("INSERT INTO ai_usage (user_id, day, count) VALUES ('u1', '2026-11-18', 3)");
		await run("INSERT INTO plan_drafts (goal_id, user_id, plan) VALUES ('g1', 'u1', '[]')");
		await run("INSERT INTO push_subscriptions (id, user_id, endpoint, timezone, hour) VALUES ('p1', 'u1', 'https://fcm.googleapis.com/fcm/send/x', 'UTC', 9)");
		await run("DELETE FROM users WHERE id = 'u1'");
		for (const table of ['goals', 'tasks', 'materials',
			'mistakes', 'plan_drafts', 'push_subscriptions', 'chats', 'chat_messages', 'ai_usage', 'friend_invites', 'friendships']) {
			expect(await count(table)).toBe(0);
		}
	});

	it('keeps the invite when the inviter is deleted', async () => {
		await run("INSERT INTO users (id, email, role) VALUES ('o1', 'owner@example.com', 'owner')");
		await run("INSERT INTO invites (email, invited_by) VALUES ('friend@example.com', 'o1')");
		await run("DELETE FROM users WHERE id = 'o1'");
		expect(await count('invites')).toBe(1);
	});
});
