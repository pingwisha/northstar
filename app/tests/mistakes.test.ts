// The mistake notebook: each person sees and changes only their own, only on active goals.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions, load } from '../src/routes/(app)/mistakes/+page.server';
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
const run = (name: 'add' | 'fix' | 'delete', userId: string, fields: Record<string, string>) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return actions[name]!({ request: new Request('http://localhost/', { method: 'POST', body }), locals: { userId }, platform: platform() } as never);
};
type Page = { open: { id: string; topic: string }[]; fixed: { id: string }[]; frequent: { topic: string; count: number }[] };
const page = (userId: string) => load({ locals: { userId }, platform: platform() } as never) as Promise<Page>;
const goalFor = (userId: string) => scoped(db, userId).addGoal({ title: 'ЕГЭ', description: null, deadline: '2099-01-01' }, todayIso());

describe('mistake notebook', () => {
	it('adds, fixes, unfixes and deletes a mistake', async () => {
		const goalId = await goalFor('a');
		expect(await run('add', 'a', { goalId, topic: 'Дроби', note: 'забыла сократить' })).toMatchObject({ ok: true });
		const id = (await page('a')).open[0].id;
		await run('fix', 'a', { id, fixed: '1' });
		expect((await page('a')).open).toHaveLength(0);
		expect((await page('a')).fixed).toHaveLength(1);
		await run('fix', 'a', { id, fixed: '0' });
		expect((await page('a')).open).toHaveLength(1);
		expect(await run('delete', 'a', { id })).toMatchObject({ ok: true });
		expect((await page('a')).open).toHaveLength(0);
	});

	it('shows repeated topics', async () => {
		const goalId = await goalFor('a');
		await run('add', 'a', { goalId, topic: 'Дроби' });
		await run('add', 'a', { goalId, topic: 'дроби' });
		expect((await page('a')).frequent).toEqual([{ topic: 'дроби', count: 2 }]);
	});

	it('refuses wrong input and a goal that is not the persons own', async () => {
		const goalId = await goalFor('a');
		expect(await run('add', 'a', { goalId, topic: '  ' })).toMatchObject({ status: 400 });
		expect(await run('add', 'b', { goalId, topic: 'Дроби' })).toMatchObject({ status: 404 });
		expect(await scoped(db, 'a').countMistakes()).toBe(0);
	});

	it('does not let one person see, fix or delete anothers entries', async () => {
		const goalId = await goalFor('a');
		await run('add', 'a', { goalId, topic: 'Дроби' });
		const id = (await page('a')).open[0].id;
		expect((await page('b')).open).toHaveLength(0);
		expect(await run('fix', 'b', { id, fixed: '1' })).toMatchObject({ status: 404 });
		expect(await run('delete', 'b', { id })).toMatchObject({ status: 404 });
		expect((await page('a')).open).toHaveLength(1);
	});

	it('does not add a mistake to a finished goal', async () => {
		const goalId = await goalFor('a');
		await scoped(db, 'a').setGoalStatus(goalId, 'done');
		expect(await run('add', 'a', { goalId, topic: 'Дроби' })).toMatchObject({ status: 404 });
	});

	it('goes away with the account and appears in the export', async () => {
		const goalId = await goalFor('a');
		await run('add', 'a', { goalId, topic: 'Дроби' });
		expect((await scoped(db, 'a').exportAll()).mistakes).toHaveLength(1);
		await scoped(db, 'a').deleteAccount();
		expect((await db.prepare('SELECT COUNT(*) AS n FROM mistakes').first<{ n: number }>())!.n).toBe(0);
	});
});
