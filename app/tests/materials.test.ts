// A person's own links and notes on tasks: only on their own open tasks, and the AI gets them.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions } from '../src/routes/(app)/+page.server';
import { buildChatContext } from '../src/lib/chat-context';
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
const today = () => todayIso();
const run = (name: 'addMaterial' | 'deleteMaterial' | 'saveNote', userId: string, fields: Record<string, string>) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return actions[name]!({ request: new Request('http://localhost/', { method: 'POST', body }), locals: { userId }, platform: platform() } as never);
};
async function taskFor(userId: string) {
	const me = scoped(db, userId);
	const goalId = await me.addGoal({ title: 'Цель', description: null, deadline: '2099-01-01' }, today());
	await me.addTasks(goalId, ['Задача'], today());
	return { goalId, taskId: (await me.listGoalTasks())[0].id };
}

describe('own links', () => {
	it('adds, shows as own and deletes a link', async () => {
		const { taskId } = await taskFor('a');
		expect(await run('addMaterial', 'a', { id: taskId, title: 'Курс', url: 'https://example.com/c' })).toMatchObject({ ok: true });
		const [m] = await scoped(db, 'a').listMaterials();
		expect(m).toMatchObject({ title: 'Курс', url: 'https://example.com/c', own: 1, task_id: taskId });
		expect(await run('deleteMaterial', 'a', { materialId: m.id })).toMatchObject({ ok: true });
		expect(await scoped(db, 'a').listMaterials()).toEqual([]);
	});

	it('refuses links that are not https', async () => {
		const { taskId } = await taskFor('a');
		expect(await run('addMaterial', 'a', { id: taskId, title: 'x', url: 'http://example.com' })).toMatchObject({ status: 400 });
		expect(await run('addMaterial', 'a', { id: taskId, title: 'x', url: 'javascript:alert(1)' })).toMatchObject({ status: 400 });
		expect(await scoped(db, 'a').listMaterials()).toEqual([]);
	});

	it('limits own links per task', async () => {
		const { taskId } = await taskFor('a');
		for (let i = 0; i < 20; i++) await run('addMaterial', 'a', { id: taskId, title: `m${i}`, url: `https://example.com/${i}` });
		expect(await run('addMaterial', 'a', { id: taskId, title: 'лишняя', url: 'https://example.com/z' })).toMatchObject({ status: 400 });
	});

	it("does not touch someone else's task or links", async () => {
		const { taskId } = await taskFor('a');
		expect(await run('addMaterial', 'b', { id: taskId, title: 'x', url: 'https://example.com' })).toMatchObject({ status: 404 });
		await run('addMaterial', 'a', { id: taskId, title: 'мой', url: 'https://example.com' });
		const [m] = await scoped(db, 'a').listMaterials();
		expect(await run('deleteMaterial', 'b', { materialId: m.id })).toMatchObject({ status: 404 });
		expect(await scoped(db, 'a').listMaterials()).toHaveLength(1);
	});

	it('does not delete a material the AI planned', async () => {
		const me = scoped(db, 'a');
		const { taskId } = await taskFor('a');
		await db.prepare("INSERT INTO materials (id, user_id, task_id, kind, title, url) VALUES ('m1', 'a', ?, 'article', 'От ИИ', 'https://example.com/ai')").bind(taskId).run();
		expect(await run('deleteMaterial', 'a', { materialId: 'm1' })).toMatchObject({ status: 404 });
		expect(await me.listMaterials()).toHaveLength(1);
	});

	it('does not add to a task of a finished goal', async () => {
		const { goalId, taskId } = await taskFor('a');
		await db.prepare("UPDATE goals SET status = 'done' WHERE id = ?").bind(goalId).run();
		expect(await run('addMaterial', 'a', { id: taskId, title: 'x', url: 'https://example.com' })).toMatchObject({ status: 404 });
	});
});

describe('notes', () => {
	it('saves, clears and guards a note', async () => {
		const { taskId } = await taskFor('a');
		expect(await run('saveNote', 'a', { id: taskId, note: 'Начать с главы 2' })).toMatchObject({ ok: true });
		expect((await scoped(db, 'a').listGoalTasks())[0].note).toBe('Начать с главы 2');
		await run('saveNote', 'a', { id: taskId, note: '  ' });
		expect((await scoped(db, 'a').listGoalTasks())[0].note).toBeNull();
		expect(await run('saveNote', 'b', { id: taskId, note: 'чужое' })).toMatchObject({ status: 404 });
		expect(await run('saveNote', 'a', { id: taskId, note: 'а'.repeat(1001) })).toMatchObject({ status: 400 });
	});
});

describe('the AI sees them', () => {
	it('puts the note and own links into the chat context', async () => {
		const { taskId } = await taskFor('a');
		await run('saveNote', 'a', { id: taskId, note: 'Мне нужен\nпростой язык' });
		await run('addMaterial', 'a', { id: taskId, title: 'Мой курс', url: 'https://example.com/my' });
		const me = scoped(db, 'a');
		const text = buildChatContext(await me.listGoals(), await me.listGoalTasks(), today(), await me.listMaterials());
		expect(text).toContain('Заметка человека: Мне нужен простой язык');
		expect(text).toContain('Свой материал человека: Мой курс. Ссылка: https://example.com/my');
	});
});
