// The page of one goal: its tasks grouped by stage, and never another person's goal.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { load } from '../src/routes/(app)/goals/[id]/+page.server';
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

type Event = Parameters<typeof load>[0];
const as = (userId: string, id: string) => ({ params: { id }, locals: { userId }, platform: { env: { DB: db } } }) as unknown as Event;

describe('goal page', () => {
	it('lists the tasks of the goal by stage, with the ones added by hand apart', async () => {
		const me = scoped(db, 'a');
		const goalId = await me.addGoal({ title: 'Сдать экзамен', description: 'час в день', deadline: '2030-05-18' }, '2026-11-18');
		await me.savePlan(goalId, [
			{ title: 'Основы', dueDate: '2026-12-01', tasks: [{ title: 'Прочитать главу', plannedFor: '2026-11-20', weight: 1, materials: [] }] },
			{ title: 'Практика', dueDate: '2026-12-10', tasks: [{ title: 'Решить вариант', plannedFor: '2026-12-05', weight: 1, materials: [] }] }
		]);
		await me.addTasks(goalId, ['Моя задача'], '2026-11-25');
		const data = (await load(as('a', goalId))) as unknown as { stages: { title: string; tasks: { title: string }[] }[]; own: { title: string }[]; card: { title: string; taskCount: number } };
		expect(data.card).toMatchObject({ title: 'Сдать экзамен', taskCount: 3 });
		expect(data.stages.map((s) => [s.title, s.tasks.map((t) => t.title)])).toEqual([
			['Основы', ['Прочитать главу']],
			['Практика', ['Решить вариант']]
		]);
		expect(data.own.map((t) => t.title)).toEqual(['Моя задача']);
	});

	it('answers 404 for a goal of another person and for one that does not exist', async () => {
		const goalId = await scoped(db, 'a').addGoal({ title: 'Моя цель', description: null, deadline: '2030-05-18' }, '2026-11-18');
		await expect(load(as('b', goalId))).rejects.toMatchObject({ status: 404 });
		await expect(load(as('a', 'nope'))).rejects.toMatchObject({ status: 404 });
	});
});
