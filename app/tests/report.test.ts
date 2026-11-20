// The weekly report: numbers for everyone, the AI comment for the owner only, and no invented numbers.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actions, load } from '../src/routes/(app)/report/+page.server';
import { todayIso } from '../src/lib/goals';
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
const comment = (userId: string, role: 'owner' | 'member') => actions.comment!({ request: new Request('http://localhost/report', { method: 'POST' }), locals: { userId, role }, platform: platform() } as never);
async function withWeek(userId: string) {
	const me = scoped(db, userId);
	const goalId = await me.addGoal({ title: 'Сдать ОГЭ', description: null, deadline: '2099-01-01' }, todayIso());
	await me.addTasks(goalId, ['Первая', 'Вторая'], todayIso());
	await me.setTaskCompleted((await me.listGoalTasks())[0].id, true);
}

describe('weekly report', () => {
	it('shows the real numbers to a member, without the AI', async () => {
		await withWeek('m');
		const data = (await load({ locals: { userId: 'm', role: 'member' }, platform: platform() } as never)) as { weekly: { doneInWeek: number; planned: number; goals: { percent: number }[] }; canAi: boolean };
		expect(data.canAi).toBe(false);
		expect(data.weekly).toMatchObject({ doneInWeek: 1, planned: 2 });
		expect(data.weekly.goals[0].percent).toBe(50);
	});

	it('does not show one person the numbers of another', async () => {
		await withWeek('o');
		const data = (await load({ locals: { userId: 'm', role: 'member' }, platform: platform() } as never)) as { weekly: { goals: unknown[] } };
		expect(data.weekly.goals).toEqual([]);
	});

	it('gives the AI only the real numbers and shows its comment', async () => {
		await withWeek('o');
		const fetchMock = reply('Сделана 1 задача из 2. Прогресс 50 процентов.');
		vi.stubGlobal('fetch', fetchMock);
		expect(await comment('o', 'owner')).toMatchObject({ ok: true, comment: 'Сделана 1 задача из 2. Прогресс 50 процентов.' });
		const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).messages as { content: string }[];
		expect(sent[0].content).toContain('Отмечено сделанными задач: 1');
		expect(sent[0].content).toContain('Прогресс 50 процентов');
	});

	it('throws away a comment with a number that is not in the report', async () => {
		await withWeek('o');
		vi.stubGlobal('fetch', reply('Сделано 9 задач!'));
		expect(await comment('o', 'owner')).toMatchObject({ status: 502 });
	});

	it('does not call the AI for a member', async () => {
		await withWeek('m');
		const fetchMock = reply('что-то');
		vi.stubGlobal('fetch', fetchMock);
		expect(await comment('m', 'member')).toMatchObject({ status: 403 });
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
