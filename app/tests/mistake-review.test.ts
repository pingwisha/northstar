// Spaced review of mistakes: they return after 1, 3 and 7 days, only to their owner, only while unfixed.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions, load } from '../src/routes/(app)/+page.server';
import { actions as mistakeActions } from '../src/routes/(app)/mistakes/+page.server';
import { todayIso } from '../src/lib/goals';
import { addDaysIso } from '../src/lib/mistakes';
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
const today = todayIso();
const form = (fields: Record<string, string>) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return new Request('http://localhost/', { method: 'POST', body });
};
const review = (userId: string, id: string, remembered: boolean) =>
	actions.review!({ request: form({ id, remembered: remembered ? '1' : '0' }), locals: { userId }, platform: platform() } as never);
const due = async (userId: string) =>
	((await load({ locals: { userId }, platform: platform() } as never)) as { reviews: { id: string; topic: string }[] }).reviews;
const state = (id: string) => db.prepare('SELECT review_step AS step, review_due AS due, fixed_at AS fixed FROM mistakes WHERE id = ?').bind(id).first<{ step: number; due: string | null; fixed: string | null }>();
const setDue = (id: string, day: string) => db.prepare('UPDATE mistakes SET review_due = ? WHERE id = ?').bind(day, id).run();

async function addMistake(userId: string, topic: string) {
	const me = scoped(db, userId);
	const goalId = await me.addGoal({ title: 'ЕГЭ', description: null, deadline: '2099-01-01' }, today);
	await me.addMistake(goalId, { topic, note: null }, today);
	return (await me.listMistakes()).find((m) => m.topic === topic)!.id;
}

describe('mistake review', () => {
	it('is not due on the day it was written, but tomorrow', async () => {
		const id = await addMistake('a', 'Дроби');
		expect(await state(id)).toMatchObject({ step: 0, due: addDaysIso(today, 1) });
		expect(await due('a')).toHaveLength(0);
		await setDue(id, today);
		expect(await due('a')).toMatchObject([{ id, topic: 'Дроби' }]);
	});

	it('moves the date 1 -> 3 -> 7 days on "remembered" and then stops returning', async () => {
		const id = await addMistake('a', 'Дроби');
		await setDue(id, today);
		expect(await review('a', id, true)).toMatchObject({ ok: true });
		expect(await state(id)).toMatchObject({ step: 1, due: addDaysIso(today, 3) });
		expect(await due('a')).toHaveLength(0);

		await setDue(id, today);
		await review('a', id, true);
		expect(await state(id)).toMatchObject({ step: 2, due: addDaysIso(today, 7) });

		await setDue(id, today);
		await review('a', id, true);
		expect(await state(id)).toMatchObject({ step: 3, due: null });
		expect(await due('a')).toHaveLength(0);
	});

	it('starts over on "not remembered"', async () => {
		const id = await addMistake('a', 'Дроби');
		await setDue(id, today);
		await review('a', id, true);
		await setDue(id, today);
		await review('a', id, false);
		expect(await state(id)).toMatchObject({ step: 0, due: addDaysIso(today, 1) });
	});

	it('does not let a double click skip an interval, or mark a mistake that is not due', async () => {
		const id = await addMistake('a', 'Дроби');
		expect(await review('a', id, true)).toMatchObject({ status: 404 });
		await setDue(id, today);
		await review('a', id, true);
		expect(await review('a', id, true)).toMatchObject({ status: 404 });
		expect(await state(id)).toMatchObject({ step: 1 });
	});

	it('shows an overdue mistake, oldest first, five at most', async () => {
		const me = scoped(db, 'a');
		const goalId = await me.addGoal({ title: 'ЕГЭ', description: null, deadline: '2099-01-01' }, today);
		for (let i = 0; i < 7; i++) await me.addMistake(goalId, { topic: `Тема ${i}`, note: null }, today);
		const ids = (await me.listMistakes()).map((m) => m.id);
		for (const [i, id] of ids.entries()) await setDue(id, addDaysIso(today, -i));
		const shown = await due('a');
		expect(shown).toHaveLength(5);
		expect(shown[0].id).toBe(ids[6]);
	});

	it('does not review fixed mistakes, and reopening starts the cycle again', async () => {
		const id = await addMistake('a', 'Дроби');
		await setDue(id, today);
		await mistakeActions.fix!({ request: form({ id, fixed: '1' }), locals: { userId: 'a' }, platform: platform() } as never);
		expect(await due('a')).toHaveLength(0);
		expect(await review('a', id, true)).toMatchObject({ status: 404 });
		await mistakeActions.fix!({ request: form({ id, fixed: '0' }), locals: { userId: 'a' }, platform: platform() } as never);
		expect(await state(id)).toMatchObject({ step: 0, due: addDaysIso(today, 1), fixed: null });
	});

	it('keeps one person from seeing or marking anothers mistakes', async () => {
		const id = await addMistake('a', 'Дроби');
		await setDue(id, today);
		expect(await due('b')).toHaveLength(0);
		expect(await review('b', id, true)).toMatchObject({ status: 404 });
		expect(await state(id)).toMatchObject({ step: 0 });
	});

	it('gives mistakes written before the migration a first review the day after they were written', async () => {
		const me = scoped(db, 'a');
		const goalId = await me.addGoal({ title: 'ЕГЭ', description: null, deadline: '2099-01-01' }, today);
		await db.prepare("INSERT INTO mistakes (id, user_id, goal_id, topic, created_at) VALUES ('old', 'a', ?, 'Старая', '2026-11-20T10:00:00.000Z')").bind(goalId).run();
		await db.prepare("UPDATE mistakes SET review_due = date(created_at, '+1 day') WHERE fixed_at IS NULL AND id = 'old'").run();
		expect(await state('old')).toMatchObject({ step: 0, due: '2026-11-21' });
		expect(await due('a')).toMatchObject([{ id: 'old' }]);
	});
});
