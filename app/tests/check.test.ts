// The self-check: the AI is replaced by a stand-in, the database is real.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actions, load } from '../src/routes/(app)/check/+page.server';
import { scoped } from '../src/lib/server/db';
import { AI_BASE_URL, usedToday } from '../src/lib/server/ai';
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

const quiz = JSON.stringify({ questions: [{ q: 'Что такое дробь?', a: 'Часть целого.' }, { q: 'Чему равна 1/2 + 1/2?', a: 'Одному.' }, { q: 'Третий?', a: 'Да.' }] });
const ai = (content: string) => vi.fn(async () => Response.json({ choices: [{ message: { content } }] }));
const env = (extra: object = {}) => ({ DB: db, GEMINI_API_KEY: 'k', ...extra });
type Event = Parameters<NonNullable<typeof actions.ask>>[0];
const call = (name: 'ask' | 'miss', userId: string, role: 'owner' | 'member', fields: Record<string, string>, environment: object = env()) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return actions[name]!({ request: new Request('http://localhost/check', { method: 'POST', body }), locals: { userId, role }, platform: { env: environment } } as unknown as Event);
};
const goal = { title: 'Сдать ОГЭ', description: null, deadline: '2030-01-01' };

describe('asking for questions', () => {
	it('returns questions for a member and counts one request', async () => {
		vi.stubGlobal('fetch', ai(quiz));
		const id = await scoped(db, 'm').addGoal(goal, '2026-11-18');
		const r = await call('ask', 'm', 'member', { goalId: id, topic: 'Дроби' });
		expect(r).toMatchObject({ ok: true, topic: 'Дроби' });
		expect((r as { questions: unknown[] }).questions).toHaveLength(3);
		expect(await usedToday(db, 'm')).toBe(1);
	});

	it('uses the goal as the topic when none is given', async () => {
		vi.stubGlobal('fetch', ai(quiz));
		const id = await scoped(db, 'o').addGoal(goal, '2026-11-18');
		expect(await call('ask', 'o', 'owner', { goalId: id, topic: '  ' })).toMatchObject({ ok: true, topic: 'Сдать ОГЭ' });
	});

	it('tries once more when the first answer is not usable, then gives up', async () => {
		const send = ai('вот вопросы!');
		vi.stubGlobal('fetch', send);
		const id = await scoped(db, 'o').addGoal(goal, '2026-11-18');
		expect(await call('ask', 'o', 'owner', { goalId: id, topic: '' })).toMatchObject({ status: 502 });
		expect((send.mock.calls as unknown[][]).filter(([u]) => String(u).startsWith(AI_BASE_URL))).toHaveLength(2);
	});

	it('does not ask about someone else\'s goal, and respects the daily limit', async () => {
		const send = ai(quiz);
		vi.stubGlobal('fetch', send);
		const id = await scoped(db, 'm').addGoal(goal, '2026-11-18');
		expect(await call('ask', 'o', 'owner', { goalId: id, topic: '' })).toMatchObject({ status: 404 });
		expect(send).not.toHaveBeenCalled();
		await db.prepare('INSERT INTO ai_usage (user_id, day, count) VALUES (?, ?, 1)').bind('m', new Date().toISOString().slice(0, 10)).run();
		expect(await call('ask', 'm', 'member', { goalId: id, topic: '' }, env({ MEMBER_DAILY_LIMIT: '1' }))).toMatchObject({ status: 502 });
	});
});

describe('a question the person did not remember', () => {
	it('goes to the mistake notebook of that person', async () => {
		const id = await scoped(db, 'm').addGoal(goal, '2026-11-18');
		expect(await call('miss', 'm', 'member', { goalId: id, topic: 'Дроби', question: 'Что такое дробь? Ответ: часть целого.' })).toMatchObject({ ok: true });
		expect(await scoped(db, 'm').listMistakes()).toMatchObject([{ topic: 'Дроби', note: 'Что такое дробь? Ответ: часть целого.' }]);
	});

	it('is refused for another person\'s goal', async () => {
		const id = await scoped(db, 'm').addGoal(goal, '2026-11-18');
		expect(await call('miss', 'o', 'owner', { goalId: id, topic: 'Дроби', question: 'x' })).toMatchObject({ status: 404 });
		expect(await scoped(db, 'm').listMistakes()).toHaveLength(0);
	});
});

describe('the page data', () => {
	it('lists active goals with the tasks finished lately, newest first', async () => {
		const id = await scoped(db, 'm').addGoal(goal, '2026-11-18');
		await db.batch([
			db.prepare("INSERT INTO tasks (id, user_id, goal_id, title, planned_for, completed_at) VALUES ('t1', 'm', ?, 'Старая', '2026-11-19', '2026-11-19T10:00:00Z')").bind(id),
			db.prepare("INSERT INTO tasks (id, user_id, goal_id, title, planned_for, completed_at) VALUES ('t2', 'm', ?, 'Новая', '2026-11-20', '2026-11-20T10:00:00Z')").bind(id),
			db.prepare("INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('t3', 'm', ?, 'Не сделана', '2026-11-21')").bind(id)
		]);
		const data = (await load({ locals: { userId: 'm', role: 'member' }, platform: { env: env() } } as unknown as Parameters<NonNullable<typeof load>>[0])) as { goals: { recent: string[] }[] };
		expect(data.goals[0].recent).toEqual(['Новая', 'Старая']);
	});
});
