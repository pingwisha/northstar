import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actions, load } from '../src/routes/(app)/goals/[id]/+page.server';
import { AI_BASE_URL } from '../src/lib/server/ai';
import { scoped } from '../src/lib/server/db';
import { makeDb } from './helpers';

let mf: Miniflare;
let db: D1Database;

beforeEach(async () => {
	({ mf, db } = await makeDb());
	await db.prepare("INSERT INTO users (id, email, role) VALUES ('o', 'o@example.com', 'owner'), ('m', 'm@example.com', 'member')").run();
});
afterEach(async () => {
	vi.unstubAllGlobals();
	await mf.dispose();
});

const env = { DB: undefined as unknown as D1Database, GEMINI_API_KEY: 'k' };
const ai = (content: string) =>
	vi.fn(async (url: string | URL | Request) => {
		if (String(url).startsWith(AI_BASE_URL)) return Response.json({ choices: [{ message: { content } }] });
		return new Response('gone', { status: 404 });
	});
const answer = JSON.stringify({ materials: [[{ kind: 'trainer', title: 'Ударения', site: 'oge-rus', query: 'ударения' }]] });

async function setup(userId = 'o') {
	const me = scoped(db, userId);
	const goalId = await me.addGoal({ title: 'Сдать ОГЭ по русскому', description: null, deadline: '2030-01-01' }, '2026-11-18');
	await me.addTasks(goalId, ['Выучить ударения'], '2026-12-01');
	return { me, goalId };
}
const run = (name: 'fillTasks', userId: string, role: 'owner' | 'member', goalId: string) => {
	const body = new FormData();
	body.set('goalId', goalId);
	const request = new Request('http://localhost/goals/x', { method: 'POST', body });
	return actions[name]!({ request, locals: { userId, role }, platform: { env: { ...env, DB: db } } } as never);
};
const page = (userId: string, goalId: string) => load({ locals: { userId, role: 'owner' }, platform: { env: { ...env, DB: db } }, params: { id: goalId } } as never) as Promise<{ needMaterials: boolean }>;

describe('materials for tasks the person added by hand', () => {
	it('are found by the AI from the verified list, once', async () => {
		const send = ai(answer);
		vi.stubGlobal('fetch', send);
		const { me, goalId } = await setup();
		expect((await page('o', goalId)).needMaterials).toBe(true);
		expect(await run('fillTasks', 'o', 'owner', goalId)).toMatchObject({ ok: true });
		const [m] = await me.listMaterials();
		expect(m).toMatchObject({ title: 'Ударения', url: 'https://rus-oge.sdamgia.ru/search?search=' + encodeURIComponent('ударения') });
		expect((await page('o', goalId)).needMaterials).toBe(false);
		const calls = send.mock.calls.length;
		await run('fillTasks', 'o', 'owner', goalId);
		expect(send.mock.calls.length).toBe(calls);
	});

	it('gets the AI helper for a task when the AI finds nothing', async () => {
		vi.stubGlobal('fetch', ai('не json'));
		const { me, goalId } = await setup();
		await run('fillTasks', 'o', 'owner', goalId);
		expect((await me.listMaterials())[0].url).toBe('/chat');
	});

	it('does not touch another person\'s goal', async () => {
		vi.stubGlobal('fetch', ai(answer));
		const { goalId } = await setup('o');
		expect(await run('fillTasks', 'm', 'member', goalId)).toMatchObject({ status: 404 });
		expect(await scoped(db, 'o').listMaterials()).toHaveLength(0);
	});

	it('tells the person when the AI limit is spent and keeps the task', async () => {
		vi.stubGlobal('fetch', ai(answer));
		const { me, goalId } = await setup('m');
		await db.prepare('INSERT INTO ai_usage (user_id, day, count) VALUES (?, ?, 1)').bind('m', new Date().toISOString().slice(0, 10)).run();
		const body = new FormData();
		body.set('goalId', goalId);
		const result = await actions.fillTasks!({ request: new Request('http://localhost', { method: 'POST', body }), locals: { userId: 'm', role: 'member' }, platform: { env: { ...env, DB: db, MEMBER_DAILY_LIMIT: '1' } } } as never);
		expect(result).toMatchObject({ status: 429 });
		expect(await me.listGoalTasks()).toHaveLength(1);
	});
});
