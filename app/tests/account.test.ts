// Account page and public sign-up: download and delete own data, caps, and the open sign-up switch.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as exportData } from '../src/routes/(app)/account/export/+server';
import { actions } from '../src/routes/(app)/account/+page.server';
import { actions as trialActions } from '../src/routes/(app)/trials/+page.server';
import { todayIso } from '../src/lib/goals';
import { roleFor, resolveIdentity, type AuthEnv } from '../src/lib/server/auth/signin';
import { createSession } from '../src/lib/server/auth/session';
import { scoped } from '../src/lib/server/db';
import { taskActions } from '../src/lib/server/task-actions';
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
const cookies = () => ({ deleted: false, delete() { this.deleted = true; } });
async function fill(userId: string) {
	const me = scoped(db, userId);
	const goalId = await me.addGoal({ title: `Цель ${userId}`, description: null, deadline: '2099-01-01' }, todayIso());
	await me.addTasks(goalId, [`Задача ${userId}`], todayIso());
	await me.addTrial(goalId, { takenOn: todayIso(), title: `Пробник ${userId}`, score: 5, maxScore: 10, weakTopics: null });
	return goalId;
}

describe('download', () => {
	it('contains only the signed-in person\'s data', async () => {
		await fill('a');
		await fill('b');
		const res = await exportData({ locals: { userId: 'a' }, platform: platform() } as never);
		expect(res.headers.get('content-disposition')).toContain('attachment');
		const body = JSON.stringify(await res.json());
		expect(body).toContain('Цель a');
		expect(body).toContain('Пробник a');
		expect(body).not.toContain('Цель b');
		expect(body).not.toContain('b@example.com');
	});
});

describe('delete everything', () => {
	const del = (userId: string, confirm: string, jar = cookies()) => {
		const body = new FormData();
		body.set('confirm', confirm);
		return Promise.resolve(actions.delete!({ request: new Request('http://localhost/account', { method: 'POST', body }), locals: { userId }, platform: platform(), cookies: jar } as never)).catch((e) => e);
	};

	it('needs the confirmation word and then removes the person and all their data, and only theirs', async () => {
		await fill('a');
		await fill('b');
		expect(await del('a', 'нет')).toMatchObject({ status: 400 });
		expect(await scoped(db, 'a').listGoals()).toHaveLength(1);

		const jar = cookies();
		const result = await del('a', 'удалить', jar);
		expect(result).toMatchObject({ status: 303, location: '/login?deleted=1' });
		expect(jar.deleted).toBe(true);
		for (const table of ['goals', 'tasks', 'trials']) {
			expect((await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = 'a'`).first<{ n: number }>())!.n).toBe(0);
		}
		expect(await db.prepare("SELECT 1 FROM users WHERE id = 'a'").first()).toBeNull();
		expect(await scoped(db, 'b').listGoals()).toHaveLength(1);
		expect(await scoped(db, 'b').listTrials()).toHaveLength(1);
	});

	it('makes an old session of the deleted person useless', async () => {
		const env = { DB: db, SESSION_SECRET: 'x'.repeat(40), ALLOWED_EMAILS: '', SIGNUP: 'open' } as unknown as AuthEnv;
		const token = await createSession(env.SESSION_SECRET, { userId: 'a', email: 'a@example.com' });
		expect(await resolveIdentity(env, token)).toMatchObject({ userId: 'a' });
		await scoped(db, 'a').deleteAccount();
		expect(await resolveIdentity(env, token)).toBeNull();
	});
});

describe('sign-up switch', () => {
	const env = (extra: Partial<AuthEnv>) => ({ DB: db, ALLOWED_EMAILS: 'owner@example.com', ...extra }) as AuthEnv;
	it('is invite-only by default and open only when SIGNUP is open', async () => {
		expect(await roleFor(env({}), 'stranger@example.com')).toBeNull();
		expect(await roleFor(env({ SIGNUP: 'closed' }), 'stranger@example.com')).toBeNull();
		expect(await roleFor(env({ SIGNUP: 'open' }), 'stranger@example.com')).toBe('member');
	});
	it('never makes a stranger the owner', async () => {
		expect(await roleFor(env({ SIGNUP: 'open' }), 'owner@example.com')).toBe('owner');
		expect(await roleFor(env({ SIGNUP: 'open' }), 'someone@example.com')).toBe('member');
	});
});

describe('caps per person', () => {
	it('stops adding tasks over the cap', async () => {
		const goalId = await fill('a');
		await db.prepare("UPDATE goals SET status = 'active' WHERE id = ?").bind(goalId).run();
		// Fill up to the cap with one statement.
		await db
			.prepare("INSERT INTO tasks (id, user_id, goal_id, title, planned_for) WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM c WHERE n < 2998) SELECT 'bulk-' || n, 'a', ?, 'x', '2099-01-01' FROM c")
			.bind(goalId)
			.run();
		const body = new FormData();
		body.set('goalId', goalId);
		body.set('titles', 'Одна\nДве');
		body.set('day', todayIso());
		const res = await taskActions.addTask({ request: new Request('http://localhost/', { method: 'POST', body }), locals: { userId: 'a' }, platform: platform() } as never);
		expect(res).toMatchObject({ status: 400 });
		expect(await scoped(db, 'a').countTasks()).toBe(2999);
	});
	it('stops adding trials over the cap', async () => {
		const goalId = await fill('a');
		const stmts = Array.from({ length: 499 }, (_, i) => db.prepare("INSERT INTO trials (id, user_id, goal_id, taken_on, title, score, max_score) VALUES (?, 'a', ?, '2026-01-01', 'p', 1, 2)").bind(`t-${i}`, goalId));
		await db.batch(stmts);
		const body = new FormData();
		for (const [k, v] of Object.entries({ goalId, title: 'Ещё', day: todayIso(), score: '1', maxScore: '2', topics: '' })) body.set(k, v);
		const res = await trialActions.add!({ request: new Request('http://localhost/', { method: 'POST', body }), locals: { userId: 'a' }, platform: platform() } as never);
		expect(res).toMatchObject({ status: 400 });
	});
});
