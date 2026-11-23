// Web push: the signed header, the send results and the hourly run, on a real database.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromBase64Url, sendPush, toBase64Url, vapidAuthorization } from '../src/lib/server/push';
import { listSubscriptions, openTaskCounts, removeSubscription, runReminders, saveSubscription } from '../src/lib/server/reminders';
import { makeDb } from './helpers';

let mf: Miniflare;
let db: D1Database;

async function newKeys() {
	const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
	const publicKey = toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
	const jwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey;
	return { publicKey, privateKey: jwk.d!, pair };
}

beforeEach(async () => {
	({ mf, db } = await makeDb());
	await db.prepare("INSERT INTO users (id, email) VALUES ('a', 'a@example.com'), ('b', 'b@example.com')").run();
});
afterEach(async () => {
	await mf.dispose();
});

const FCM = 'https://fcm.googleapis.com/fcm/send/abc';
const at = new Date('2026-11-23T06:10:00Z');

describe('the VAPID header', () => {
	it('is a token signed with the private key, naming the push service', async () => {
		const { publicKey, privateKey, pair } = await newKeys();
		const header = await vapidAuthorization(FCM, publicKey, privateKey, at);
		const match = /^vapid t=(.+), k=(.+)$/.exec(header)!;
		const [token, k] = [match[1], match[2]];
		expect(k).toBe(publicKey);
		const [h, p, s] = token.split('.');
		expect(JSON.parse(new TextDecoder().decode(fromBase64Url(h)))).toEqual({ typ: 'JWT', alg: 'ES256' });
		const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(p)));
		expect(claims.aud).toBe('https://fcm.googleapis.com');
		expect(claims.exp).toBe(Math.floor(at.getTime() / 1000) + 12 * 3600);
		const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, fromBase64Url(s) as BufferSource, new TextEncoder().encode(`${h}.${p}`));
		expect(ok).toBe(true);
	});

	it('refuses a public key of the wrong shape', async () => {
		const { privateKey } = await newKeys();
		await expect(vapidAuthorization(FCM, 'AAAA', privateKey)).rejects.toThrow();
	});
});

describe('sendPush', () => {
	it('reports what the push service answered', async () => {
		const { publicKey, privateKey } = await newKeys();
		const env = { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey };
		const answer = (status: number) => vi.fn(async () => new Response(null, { status })) as unknown as typeof fetch;
		expect(await sendPush(env, FCM, answer(201))).toBe('sent');
		expect(await sendPush(env, FCM, answer(410))).toBe('gone');
		expect(await sendPush(env, FCM, answer(404))).toBe('gone');
		expect(await sendPush(env, FCM, answer(500))).toBe('failed');
		expect(await sendPush(env, FCM, vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toBe('failed');
	});

	it('sends only to push services and only when keys are set', async () => {
		const { publicKey, privateKey } = await newKeys();
		const send = vi.fn() as unknown as typeof fetch;
		expect(await sendPush({ VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey }, 'https://evil.example/x', send)).toBe('bad_endpoint');
		expect(await sendPush({}, FCM, send)).toBe('not_configured');
		expect(send).not.toHaveBeenCalled();
	});
});

describe('subscriptions', () => {
	it('saves one per browser, updates it, and keeps people apart', async () => {
		expect(await saveSubscription(db, 'a', FCM, 'UTC', 9)).toBe('saved');
		expect(await saveSubscription(db, 'a', FCM, 'Asia/Tokyo', 20)).toBe('saved');
		expect(await listSubscriptions(db, 'a')).toMatchObject([{ timezone: 'Asia/Tokyo', hour: 20 }]);
		expect(await listSubscriptions(db, 'b')).toHaveLength(0);
		expect(await removeSubscription(db, 'b', FCM)).toBe(false);
		expect(await listSubscriptions(db, 'a')).toHaveLength(1);
		expect(await removeSubscription(db, 'a', FCM)).toBe(true);
	});

	it('refuses a bad address and more than five browsers', async () => {
		expect(await saveSubscription(db, 'a', 'https://evil.example/x', 'UTC', 9)).toBe('bad_endpoint');
		for (let i = 0; i < 5; i++) expect(await saveSubscription(db, 'a', `https://fcm.googleapis.com/fcm/send/${i}`, 'UTC', 9)).toBe('saved');
		expect(await saveSubscription(db, 'a', 'https://fcm.googleapis.com/fcm/send/new', 'UTC', 9)).toBe('too_many');
	});
});

describe('the hourly run', () => {
	const seed = async (userId: string, planned: string, done = false) => {
		await db.prepare("INSERT OR IGNORE INTO goals (id, user_id, title, start_date, deadline) VALUES (?, ?, 'Цель', '2026-01-01', '2030-01-01')").bind(`g-${userId}`, userId).run();
		await db.prepare('INSERT INTO tasks (id, user_id, goal_id, title, planned_for, completed_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), userId, `g-${userId}`, 'Задача', planned, done ? '2026-11-22T10:00:00Z' : null).run();
	};
	const setup = async (status = 201) => {
		const { publicKey, privateKey } = await newKeys();
		const send = vi.fn(async () => new Response(null, { status }));
		return { env: { DB: db, VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey }, send };
	};

	it('counts only tasks not done in active goals', async () => {
		await seed('a', '2026-11-23');
		await seed('a', '2026-11-20');
		await seed('a', '2026-11-20', true);
		await seed('a', '2026-11-25');
		expect(await openTaskCounts(db, 'a', '2026-11-23')).toEqual({ todayOpen: 1, overdue: 1 });
		await db.prepare("UPDATE goals SET status = 'archived' WHERE id = 'g-a'").run();
		expect(await openTaskCounts(db, 'a', '2026-11-23')).toEqual({ todayOpen: 0, overdue: 0 });
	});

	it('sends one reminder in the hour, marks the day, and does not send again', async () => {
		await seed('a', '2026-11-23');
		await saveSubscription(db, 'a', FCM, 'UTC', 6);
		const { env, send } = await setup();
		expect(await runReminders(env, at, send as unknown as typeof fetch)).toMatchObject({ checked: 1, sent: 1 });
		expect((await listSubscriptions(db, 'a'))[0].last_sent_on).toBe('2026-11-23');
		expect(await runReminders(env, new Date('2026-11-23T06:40:00Z'), send as unknown as typeof fetch)).toMatchObject({ checked: 0, sent: 0 });
		expect(send).toHaveBeenCalledTimes(1);
	});

	it('is silent outside the hour and for a person with nothing left to do', async () => {
		await seed('a', '2026-11-23', true);
		await saveSubscription(db, 'a', FCM, 'UTC', 6);
		await seed('b', '2026-11-23');
		await saveSubscription(db, 'b', 'https://fcm.googleapis.com/fcm/send/b', 'UTC', 9);
		const { env, send } = await setup();
		expect(await runReminders(env, at, send as unknown as typeof fetch)).toMatchObject({ checked: 1, sent: 0 });
		expect(send).not.toHaveBeenCalled();
	});

	it('forgets a subscription the push service says is gone, and leaves a failed one for tomorrow', async () => {
		await seed('a', '2026-11-23');
		await saveSubscription(db, 'a', FCM, 'UTC', 6);
		const gone = await setup(410);
		expect(await runReminders(gone.env, at, gone.send as unknown as typeof fetch)).toMatchObject({ removed: 1 });
		expect(await listSubscriptions(db, 'a')).toHaveLength(0);

		await saveSubscription(db, 'a', FCM, 'UTC', 6);
		const failing = await setup(500);
		expect(await runReminders(failing.env, at, failing.send as unknown as typeof fetch)).toMatchObject({ failed: 1 });
		const [row] = await listSubscriptions(db, 'a');
		expect(row.last_sent_on).toBeNull();
	});

	it('works in each person\'s own time zone', async () => {
		await seed('a', '2026-11-23');
		await saveSubscription(db, 'a', FCM, 'Asia/Tokyo', 15);
		const { env, send } = await setup();
		expect(await runReminders(env, at, send as unknown as typeof fetch)).toMatchObject({ sent: 1 });
	});
});
