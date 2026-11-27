// Friends (decision 0075): a one-time invitation link joins two people who see each other only by nickname.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { actions, load } from '../src/routes/(app)/friends/+page.server';
import { actions as joinActions } from '../src/routes/(app)/friends/join/[token]/+page.server';
import { MAX_ACTIVE_INVITES, MAX_FRIENDS } from '../src/lib/friends';
import { acceptInvite, hashKey } from '../src/lib/server/friends';
import { scoped } from '../src/lib/server/db';
import { makeDb } from './helpers';

let mf: Miniflare;
let db: D1Database;
beforeEach(async () => {
	({ mf, db } = await makeDb());
	await db.prepare("INSERT INTO users (id, email) VALUES ('a', 'a@example.com'), ('b', 'b@example.com'), ('c', 'c@example.com')").run();
});
afterEach(async () => {
	await mf.dispose();
});

const platform = () => ({ env: { DB: db } }) as unknown as App.Platform;
const form = (fields: Record<string, string>) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return new Request('http://localhost/', { method: 'POST', body });
};
const act = (name: 'invite' | 'dropInvite' | 'end', userId: string, fields: Record<string, string>) =>
	actions[name]!({ request: form(fields), locals: { userId }, platform: platform(), url: new URL('https://site.test/friends') } as never) as Promise<Record<string, unknown>>;
const page = (userId: string) => load({ locals: { userId }, platform: platform() } as never) as Promise<{ friends: { id: string; nickname: string }[]; invites: { id: string }[] }>;
const keyOf = (result: Record<string, unknown>) => String(result.link).split('/').pop()!;
// A successful join redirects, which SvelteKit throws; a refusal is returned as a fail result.
async function accept(userId: string, key: string, nickname: string): Promise<Record<string, unknown>> {
	try {
		return ((await joinActions.accept!({ request: form({ nickname }), params: { token: key }, locals: { userId }, platform: platform() } as never)) ?? {}) as Record<string, unknown>;
	} catch (e) {
		return e as Record<string, unknown>;
	}
}

describe('invitations', () => {
	it('shows the link once and stores only its hash', async () => {
		const made = await act('invite', 'a', { nickname: 'Маша' });
		expect(made).toMatchObject({ ok: true });
		const key = keyOf(made);
		expect(String(made.link)).toBe(`https://site.test/friends/join/${key}`);
		const rows = (await db.prepare('SELECT token_hash FROM friend_invites').all<{ token_hash: string }>()).results;
		expect(rows).toHaveLength(1);
		expect(rows[0].token_hash).toBe(await hashKey(key));
		expect(rows[0].token_hash).not.toContain(key);
		expect(JSON.stringify(await page('a'))).not.toContain(key);
	});

	it('refuses an empty or long nickname and too many invitations', async () => {
		expect(await act('invite', 'a', { nickname: '  ' })).toMatchObject({ status: 400 });
		expect(await act('invite', 'a', { nickname: 'я'.repeat(31) })).toMatchObject({ status: 400 });
		for (let i = 0; i < MAX_ACTIVE_INVITES; i++) expect(await act('invite', 'a', { nickname: 'Маша' })).toMatchObject({ ok: true });
		expect(await act('invite', 'a', { nickname: 'Маша' })).toMatchObject({ status: 400 });
	});

	it('lets only the owner withdraw an invitation', async () => {
		await act('invite', 'a', { nickname: 'Маша' });
		const id = (await page('a')).invites[0].id;
		expect(await act('dropInvite', 'b', { id })).toMatchObject({ status: 404 });
		expect(await act('dropInvite', 'a', { id })).toMatchObject({ ok: true });
		expect((await page('a')).invites).toHaveLength(0);
	});
});

describe('becoming friends', () => {
	it('joins two people who see each other only by the nicknames they chose', async () => {
		const key = keyOf(await act('invite', 'a', { nickname: 'Маша' }));
		const done = await accept('b', key, 'Боря');
		expect(done).toMatchObject({ status: 303, location: '/friends' });
		const ofA = await page('a');
		const ofB = await page('b');
		expect(ofA.friends.map((f) => f.nickname)).toEqual(['Боря']);
		expect(ofB.friends.map((f) => f.nickname)).toEqual(['Маша']);
		// What a friend gets holds no email, Google name or id of the other person.
		for (const view of [ofA, ofB]) {
			const text = JSON.stringify(view);
			for (const secret of ['example.com', '"a"', '"b"']) expect(text).not.toContain(secret);
		}
	});

	it('works once, and not for the creator of the link', async () => {
		const key = keyOf(await act('invite', 'a', { nickname: 'Маша' }));
		expect(await accept('a', key, 'Я')).toMatchObject({ status: 400 });
		expect(await accept('b', key, 'Боря')).toMatchObject({ status: 303 });
		expect(await accept('c', key, 'Вера')).toMatchObject({ status: 400 });
		expect(await scoped(db, 'c').countFriends()).toBe(0);
	});

	it('refuses an unknown or an expired link', async () => {
		expect(await accept('b', 'nonsense', 'Боря')).toMatchObject({ status: 404 });
		const key = keyOf(await act('invite', 'a', { nickname: 'Маша' }));
		await db.prepare("UPDATE friend_invites SET expires_at = '2000-01-01T00:00:00.000Z'").run();
		expect(await acceptInvite(db, 'b', key, 'Боря')).toEqual({ ok: false, error: 'expired' });
	});

	it('does not make the same two people friends twice', async () => {
		await accept('b', keyOf(await act('invite', 'a', { nickname: 'Маша' })), 'Боря');
		expect(await accept('b', keyOf(await act('invite', 'a', { nickname: 'Маша' })), 'Боря')).toMatchObject({ status: 400 });
		expect(await accept('a', keyOf(await act('invite', 'b', { nickname: 'Боря' })), 'Маша')).toMatchObject({ status: 400 });
		expect(await scoped(db, 'a').countFriends()).toBe(1);
	});

	it('stops at the friend limit', async () => {
		for (let i = 0; i < MAX_FRIENDS; i++) {
			await db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').bind(`f${String(i).padStart(2, '0')}`, `f${i}@example.com`).run();
			await db.prepare('INSERT INTO friendships (id, user_a, user_b, nick_a, nick_b) VALUES (?, ?, ?, ?, ?)').bind(`fr${i}`, 'a', `f${String(i).padStart(2, '0')}`, 'x', 'y').run();
		}
		expect(await act('invite', 'a', { nickname: 'Маша' })).toMatchObject({ status: 400 });
		const key = keyOf(await act('invite', 'b', { nickname: 'Боря' }));
		expect(await accept('a', key, 'Маша')).toMatchObject({ status: 400 });
	});
});

describe('ending a friendship', () => {
	it('lets either person end it, and nobody else', async () => {
		await accept('b', keyOf(await act('invite', 'a', { nickname: 'Маша' })), 'Боря');
		const id = (await page('a')).friends[0].id;
		expect(await act('end', 'c', { id })).toMatchObject({ status: 404 });
		expect(await act('end', 'b', { id })).toMatchObject({ ok: true });
		expect((await page('a')).friends).toEqual([]);
		expect((await page('b')).friends).toEqual([]);
	});

	it('goes away with the account and shows nicknames only in the export', async () => {
		await accept('b', keyOf(await act('invite', 'a', { nickname: 'Маша' })), 'Боря');
		const exported = JSON.stringify(await scoped(db, 'a').exportAll());
		expect(exported).toContain('Боря');
		expect(exported).not.toContain('b@example.com');
		await scoped(db, 'a').deleteAccount();
		expect((await page('b')).friends).toEqual([]);
	});
});
