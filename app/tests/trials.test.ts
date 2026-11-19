// Practice test results: each person sees and changes only their own, only on active goals.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions, load } from '../src/routes/(app)/trials/+page.server';
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
const run = (name: 'add' | 'delete', userId: string, fields: Record<string, string>) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return actions[name]!({ request: new Request('http://localhost/', { method: 'POST', body }), locals: { userId }, platform: platform() } as never);
};
const page = (userId: string) => load({ locals: { userId }, platform: platform() } as never) as Promise<{ blocks: { goalId: string; summary: { last: number | null; weak: { topic: string; count: number }[] }; list: { id: string }[] }[] }>;
const goalFor = (userId: string) => scoped(db, userId).addGoal({ title: 'ЕГЭ', description: null, deadline: '2099-01-01' }, todayIso());
const fields = (goalId: string, over: Record<string, string> = {}) => ({ goalId, title: 'Пробник 1', day: todayIso(), score: '21', maxScore: '30', topics: 'Дроби', ...over });

describe('trial results', () => {
	it('adds a result, shows the percent and weak topics, and deletes it', async () => {
		const goalId = await goalFor('a');
		expect(await run('add', 'a', fields(goalId))).toMatchObject({ ok: true });
		const { blocks } = await page('a');
		expect(blocks[0].summary.last).toBe(70);
		expect(blocks[0].summary.weak).toEqual([{ topic: 'Дроби', count: 1 }]);
		expect(await run('delete', 'a', { id: blocks[0].list[0].id })).toMatchObject({ ok: true });
		expect((await page('a')).blocks[0].list).toEqual([]);
	});

	it('refuses wrong input and keeps the typed values', async () => {
		const goalId = await goalFor('a');
		const bad = await run('add', 'a', fields(goalId, { score: '40' }));
		expect(bad).toMatchObject({ status: 400 });
		expect(await scoped(db, 'a').listTrials()).toEqual([]);
	});

	it("does not add to someone else's goal and does not show or delete someone else's results", async () => {
		const goalA = await goalFor('a');
		expect(await run('add', 'b', fields(goalA))).toMatchObject({ status: 404 });
		await run('add', 'a', fields(goalA));
		const id = (await scoped(db, 'a').listTrials())[0].id;
		expect((await page('b')).blocks).toEqual([]);
		expect(await run('delete', 'b', { id })).toMatchObject({ status: 404 });
		expect(await scoped(db, 'a').listTrials()).toHaveLength(1);
	});

	it('does not add to a finished goal but keeps its old results visible', async () => {
		const goalId = await goalFor('a');
		await run('add', 'a', fields(goalId));
		await db.prepare("UPDATE goals SET status = 'done' WHERE id = ?").bind(goalId).run();
		expect(await run('add', 'a', fields(goalId, { title: 'Ещё' }))).toMatchObject({ status: 404 });
		expect((await page('a')).blocks[0].list).toHaveLength(1);
	});
});
