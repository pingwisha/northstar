// The AI module: owner only, one fixed address, a daily limit, and the key stays on the server.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_BASE_URL, DEFAULT_MODEL, askAi, usedToday, type AiEnv } from '../src/lib/server/ai';
import { makeDb } from './helpers';

let mf: Miniflare;
let env: AiEnv;

const KEY = 'test-secret-key-123';
const owner = { userId: 'o', role: 'owner' as const };
const member = { userId: 'm', role: 'member' as const };
const hello = [{ role: 'user' as const, content: 'привет' }];
const answer = (content: unknown = 'ответ') => vi.fn(async () => Response.json({ choices: [{ message: { content } }] }));

beforeEach(async () => {
	const made = await makeDb();
	mf = made.mf;
	env = { DB: made.db, GEMINI_API_KEY: KEY };
	await env.DB.prepare("INSERT INTO users (id, email, role) VALUES ('o', 'o@example.com', 'owner'), ('m', 'm@example.com', 'member')").run();
});

afterEach(async () => {
	await mf.dispose();
});

describe('askAi', () => {
	it('returns the answer and sends the key only to the fixed address', async () => {
		const fetch = answer();
		expect(await askAi(env, owner, hello, { fetch })).toEqual({ ok: true, content: 'ответ' });
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(`${AI_BASE_URL}/chat/completions`);
		expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
		expect(JSON.parse(init.body as string).model).toBe(DEFAULT_MODEL);
	});

	it('does not put the key in the body or in the result', async () => {
		const fetch = answer();
		const result = await askAi(env, owner, hello, { fetch });
		const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(init.body as string).not.toContain(KEY);
		expect(JSON.stringify(result)).not.toContain(KEY);
	});

	it('is closed to members and calls nobody', async () => {
		const fetch = answer();
		expect(await askAi(env, member, hello, { fetch })).toEqual({ ok: false, error: 'not_available' });
		expect(fetch).not.toHaveBeenCalled();
		expect(await usedToday(env.DB, 'm')).toBe(0);
	});

	it('says so when no key is configured', async () => {
		const fetch = answer();
		expect(await askAi({ ...env, GEMINI_API_KEY: undefined }, owner, hello, { fetch })).toEqual({ ok: false, error: 'not_configured' });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('refuses bad messages without using the budget', async () => {
		const fetch = answer();
		expect((await askAi(env, owner, [], { fetch })).ok).toBe(false);
		expect((await askAi(env, owner, [{ role: 'user', content: 'x'.repeat(20_001) }], { fetch })).ok).toBe(false);
		expect((await askAi(env, owner, [{ role: 'admin' as 'user', content: 'x' }], { fetch })).ok).toBe(false);
		expect(fetch).not.toHaveBeenCalled();
		expect(await usedToday(env.DB, 'o')).toBe(0);
	});

	it('stops at the daily limit and starts over the next day', async () => {
		const fetch = answer();
		const e = { ...env, DAILY_LIMIT: '2' };
		const day1 = () => new Date('2026-11-18T10:00:00Z');
		expect((await askAi(e, owner, hello, { fetch, now: day1 })).ok).toBe(true);
		expect((await askAi(e, owner, hello, { fetch, now: day1 })).ok).toBe(true);
		expect(await askAi(e, owner, hello, { fetch, now: day1 })).toEqual({ ok: false, error: 'limit_reached' });
		expect(fetch).toHaveBeenCalledTimes(2);
		expect((await askAi(e, owner, hello, { fetch, now: () => new Date('2026-11-19T00:01:00Z') })).ok).toBe(true);
	});

	it('reports a provider failure and still counts the request', async () => {
		const down = vi.fn(async () => new Response('no', { status: 500 }));
		expect(await askAi(env, owner, hello, { fetch: down })).toEqual({ ok: false, error: 'ai_unavailable' });
		expect(await usedToday(env.DB, 'o')).toBe(1);
		const broken = vi.fn(async () => { throw new Error('network'); });
		expect(await askAi(env, owner, hello, { fetch: broken })).toEqual({ ok: false, error: 'ai_unavailable' });
		expect((await askAi(env, owner, hello, { fetch: answer('') })).ok).toBe(false);
		expect((await askAi(env, owner, hello, { fetch: answer(42) })).ok).toBe(false);
	});
});
