// The AI chat: owner only, the AI is told the real plan, history is kept per person.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actions, load } from '../src/routes/(app)/chat/+page.server';
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

const platform = () => ({ env: { DB: db, GEMINI_API_KEY: 'k' } }) as unknown as App.Platform;
const reply = (content: string) => vi.fn(async (_url: unknown, _init?: unknown) => Response.json({ choices: [{ message: { content } }] }));
const send = (userId: string, role: 'owner' | 'member', text: string) => {
	const body = new FormData();
	body.set('text', text);
	return actions.send!({ request: new Request('http://localhost/chat', { method: 'POST', body }), locals: { userId, role }, platform: platform() } as never);
};
const sentMessages = (fetchMock: ReturnType<typeof reply>) => JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).messages as { role: string; content: string }[];

describe('chat', () => {
	it('tells the AI the real goals and tasks, and the rules', async () => {
		const goalId = await scoped(db, 'o').addGoal({ title: 'Сдать ОГЭ', description: null, deadline: '2030-05-18' }, '2026-11-18');
		await db.prepare("INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('t1', 'o', ?, 'Решить пять уравнений', '2026-11-19')").bind(goalId).run();
		const fetchMock = reply('Сделай задачу Решить пять уравнений.');
		vi.stubGlobal('fetch', fetchMock);

		await send('o', 'owner', 'Что мне делать сегодня?');
		const [system, ...rest] = sentMessages(fetchMock);
		expect(system.role).toBe('system');
		expect(system.content).toContain('Сдать ОГЭ');
		expect(system.content).toContain('Решить пять уравнений');
		expect(system.content).toContain('не придумывай другие');
		expect(system.content).toContain('не спрашивай, что будем делать');
		expect(rest).toEqual([{ role: 'user', content: 'Что мне делать сегодня?' }]);
	});

	it('keeps the conversation and sends it back with the next question', async () => {
		const fetchMock = reply('Первый ответ');
		vi.stubGlobal('fetch', fetchMock);
		await send('o', 'owner', 'Первый вопрос');
		const second = reply('Второй ответ');
		vi.stubGlobal('fetch', second);
		await send('o', 'owner', 'Второй вопрос');
		expect(sentMessages(second).slice(1).map((m) => m.content)).toEqual(['Первый вопрос', 'Первый ответ', 'Второй вопрос']);
		const shown = (await load({ locals: { userId: 'o', role: 'owner' }, platform: platform() } as never)) as { messages: { content: string }[] };
		expect(shown.messages.map((m) => m.content)).toEqual(['Первый вопрос', 'Первый ответ', 'Второй вопрос', 'Второй ответ']);
	});

	it('starts a clean conversation on «Новая беседа»', async () => {
		vi.stubGlobal('fetch', reply('Ответ'));
		await send('o', 'owner', 'Вопрос');
		await actions.fresh!({ locals: { userId: 'o', role: 'owner' }, platform: platform() } as never);
		const shown = (await load({ locals: { userId: 'o', role: 'owner' }, platform: platform() } as never)) as { messages: unknown[] };
		expect(shown.messages).toEqual([]);
	});

	it('removes forbidden characters from the answer before storing it', async () => {
		vi.stubGlobal('fetch', reply('**Сделай** это (сегодня) / завтра'));
		await send('o', 'owner', 'Вопрос');
		const rows = await scoped(db, 'o').chatMessages((await scoped(db, 'o').currentChat())!);
		expect(rows[1].content).toBe('Сделай это сегодня завтра');
	});

	it('lets a member chat, and stops them at their own daily limit', async () => {
		const fetchMock = reply('Привет!');
		vi.stubGlobal('fetch', fetchMock);
		expect(await send('m', 'member', 'Привет')).toMatchObject({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await db.prepare("UPDATE ai_usage SET count = 1000 WHERE user_id = 'm'").run();
		expect(await send('m', 'member', 'Ещё')).toMatchObject({ status: 502 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('stores nothing and returns the text when the AI fails', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })));
		const result = await send('o', 'owner', 'Мой вопрос');
		expect(result).toMatchObject({ status: 502, data: { text: 'Мой вопрос' } });
		const chat = await scoped(db, 'o').currentChat();
		expect(chat ? await scoped(db, 'o').chatMessages(chat) : []).toEqual([]);
	});

	it('does not show one person\'s chat to another', async () => {
		vi.stubGlobal('fetch', reply('Ответ'));
		await send('o', 'owner', 'Секрет');
		const chat = (await scoped(db, 'o').currentChat())!;
		expect(await scoped(db, 'm').chatMessages(chat)).toEqual([]);
		expect(await scoped(db, 'm').addExchange(chat, 'чужое', 'чужое')).toBe(false);
	});

	it('refuses an empty or too long message', async () => {
		const fetchMock = reply('нет');
		vi.stubGlobal('fetch', fetchMock);
		expect(await send('o', 'owner', '   ')).toMatchObject({ status: 400 });
		expect(await send('o', 'owner', 'а'.repeat(2001))).toMatchObject({ status: 400 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('gives the AI the materials and lets only the person\'s own links through', async () => {
		const goalId = await scoped(db, 'o').addGoal({ title: 'Сдать ОГЭ', description: null, deadline: '2030-05-18' }, '2026-11-18');
		await db.prepare("INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES ('t1', 'o', ?, 'Решить уравнения', '2026-11-19')").bind(goalId).run();
		await db.prepare("INSERT INTO materials (id, user_id, task_id, kind, title, url) VALUES ('m1', 'o', 't1', 'trainer', 'Решу ОГЭ', 'https://oge.sdamgia.ru/')").run();
		const fetchMock = reply('Открой https://oge.sdamgia.ru/ и ещё https://выдуманный.example/page сегодня.');
		vi.stubGlobal('fetch', fetchMock);

		await send('o', 'owner', 'Какие сайты посмотреть?');
		expect(sentMessages(fetchMock)[0].content).toContain('Ссылка: https://oge.sdamgia.ru/');
		const rows = await scoped(db, 'o').chatMessages((await scoped(db, 'o').currentChat())!);
		expect(rows[1].content).toBe('Открой https://oge.sdamgia.ru/ и ещё ссылка не из плана сегодня.');
	});
});
