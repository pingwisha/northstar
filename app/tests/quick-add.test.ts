// Quick entry of a task: one line with the day in the text, each person only on their own active goals.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions } from '../src/routes/(app)/+page.server';
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

const today = todayIso();
const quick = (userId: string, fields: Record<string, string>) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return actions.quickAdd!({ request: new Request('http://localhost/', { method: 'POST', body }), locals: { userId }, platform: { env: { DB: db } } as unknown as App.Platform } as never);
};
const tasksOf = (userId: string) => scoped(db, userId).listGoalTasks();
const goalFor = (userId: string, deadline = addDaysIso(today, 30)) => scoped(db, userId).addGoal({ title: 'Цель', description: null, deadline }, today);

describe('quick entry', () => {
	it('puts "завтра в 18:00 решить варианты" on tomorrow with the time in the title', async () => {
		const goalId = await goalFor('a');
		expect(await quick('a', { goalId, text: 'завтра в 18:00 решить варианты' })).toMatchObject({ ok: true });
		expect(await tasksOf('a')).toMatchObject([{ title: '18:00 решить варианты', planned_for: addDaysIso(today, 1) }]);
	});

	it('puts a line without a day on today', async () => {
		const goalId = await goalFor('a');
		await quick('a', { goalId, text: 'решить варианты' });
		expect(await tasksOf('a')).toMatchObject([{ title: 'решить варианты', planned_for: today }]);
	});

	it('refuses an empty title, a day after the goal deadline and a very long title', async () => {
		const goalId = await goalFor('a', addDaysIso(today, 3));
		expect(await quick('a', { goalId, text: 'завтра' })).toMatchObject({ status: 400 });
		expect(await quick('a', { goalId, text: '   ' })).toMatchObject({ status: 400 });
		expect(await quick('a', { goalId, text: 'через 10 дней повторить' })).toMatchObject({ status: 400 });
		expect(await quick('a', { goalId, text: 'а'.repeat(161) })).toMatchObject({ status: 400 });
		expect(await tasksOf('a')).toEqual([]);
	});

	it('refuses a goal of another person or a finished goal', async () => {
		const goalId = await goalFor('a');
		expect(await quick('b', { goalId, text: 'повторить' })).toMatchObject({ status: 404 });
		await scoped(db, 'a').setGoalStatus(goalId, 'done');
		expect(await quick('a', { goalId, text: 'повторить' })).toMatchObject({ status: 404 });
		expect(await tasksOf('a')).toEqual([]);
	});
});
