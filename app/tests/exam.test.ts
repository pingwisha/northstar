// Exam mode: review tasks for weak topics, only on the person's own active goals, never twice.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions, load } from '../src/routes/(app)/exam/+page.server';
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
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const addReviews = (userId: string, goalId: string) => {
	const body = new FormData();
	body.set('goalId', goalId);
	return actions.addReviews!({ request: new Request('http://localhost/exam', { method: 'POST', body }), locals: { userId }, platform: platform() } as never);
};
const view = (userId: string) => load({ locals: { userId }, platform: platform() } as never) as Promise<{ goals: { id: string; exam: boolean; toReview: string[]; reviewing: string[] }[] }>;
async function goalWithWeak(userId: string, deadline = addDays(todayIso(), 30)) {
	const me = scoped(db, userId);
	const goalId = await me.addGoal({ title: 'ОГЭ', description: null, deadline }, todayIso());
	await me.addTrial(goalId, { takenOn: todayIso(), title: 'П1', score: 10, maxScore: 30, weakTopics: 'Дроби, Графики' });
	return goalId;
}

describe('exam mode', () => {
	it('shows a goal within sixty days with its weak topics', async () => {
		const goalId = await goalWithWeak('a');
		const [g] = (await view('a')).goals;
		expect(g).toMatchObject({ id: goalId, exam: true });
		expect(g.toReview.sort()).toEqual(['Графики', 'Дроби']);
	});

	it('adds one review task per topic before the deadline, and not twice', async () => {
		const deadline = addDays(todayIso(), 30);
		const goalId = await goalWithWeak('a', deadline);
		expect(await addReviews('a', goalId)).toMatchObject({ ok: true, added: 2 });
		const rows = await scoped(db, 'a').listGoalTasks();
		expect(rows.map((t) => t.title).sort()).toEqual(['Повторить: Графики', 'Повторить: Дроби']);
		expect(rows.every((t) => t.planned_for >= todayIso() && t.planned_for < deadline)).toBe(true);
		expect(await addReviews('a', goalId)).toMatchObject({ status: 400 });
		expect(await scoped(db, 'a').listGoalTasks()).toHaveLength(2);
		expect((await view('a')).goals[0]).toMatchObject({ toReview: [], reviewing: ['Графики', 'Дроби'].sort() });
	});

	it("does not touch someone else's goal", async () => {
		const goalId = await goalWithWeak('a');
		expect(await addReviews('b', goalId)).toMatchObject({ status: 404 });
		expect(await scoped(db, 'a').listGoalTasks()).toEqual([]);
		expect((await view('b')).goals).toEqual([]);
	});

	it('does not add to a finished goal', async () => {
		const goalId = await goalWithWeak('a');
		await db.prepare("UPDATE goals SET status = 'done' WHERE id = ?").bind(goalId).run();
		expect(await addReviews('a', goalId)).toMatchObject({ status: 404 });
	});

	it('keeps a far deadline out of exam mode', async () => {
		await goalWithWeak('a', addDays(todayIso(), 400));
		expect((await view('a')).goals[0].exam).toBe(false);
	});
});
