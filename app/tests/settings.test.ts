// The reminder actions on the settings page: who may save, remove and test what.
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actions, load } from '../src/routes/(app)/settings/+page.server';
import { toBase64Url } from '../src/lib/server/push';
import { listSubscriptions } from '../src/lib/server/reminders';
import { makeDb } from './helpers';

let mf: Miniflare;
let db: D1Database;

beforeEach(async () => {
	({ mf, db } = await makeDb());
	await db.prepare("INSERT INTO users (id, email) VALUES ('a', 'a@example.com'), ('b', 'b@example.com')").run();
});
afterEach(async () => {
	vi.unstubAllGlobals();
	await mf.dispose();
});

const FCM = 'https://fcm.googleapis.com/fcm/send/abc';
type Event = Parameters<NonNullable<typeof actions.subscribe>>[0];
const call = (name: 'subscribe' | 'unsubscribe' | 'test', userId: string, fields: Record<string, string> = {}, env: object = { DB: db }) => {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.set(k, v);
	return actions[name]!({ request: new Request('http://localhost/settings', { method: 'POST', body }), locals: { userId }, platform: { env } } as unknown as Event);
};
const good = { endpoint: FCM, timezone: 'Europe/Belgrade', hour: '8' };

async function keys() {
	const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair;
	return {
		VAPID_PUBLIC_KEY: toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))),
		VAPID_PRIVATE_KEY: ((await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey).d!
	};
}

describe('turning reminders on', () => {
	it('saves this browser with the hour and the time zone', async () => {
		expect(await call('subscribe', 'a', good)).toMatchObject({ ok: true });
		expect(await listSubscriptions(db, 'a')).toMatchObject([{ endpoint: FCM, hour: 8, timezone: 'Europe/Belgrade' }]);
	});

	it('refuses a wrong hour, an unknown zone and an address that is not a push service', async () => {
		expect(await call('subscribe', 'a', { ...good, hour: '25' })).toMatchObject({ status: 400 });
		expect(await call('subscribe', 'a', { ...good, timezone: 'Nowhere/Land' })).toMatchObject({ status: 400 });
		expect(await call('subscribe', 'a', { ...good, endpoint: 'https://evil.example/x' })).toMatchObject({ status: 400 });
		expect(await listSubscriptions(db, 'a')).toHaveLength(0);
	});

	it('shows the person their own subscriptions and the public key only', async () => {
		await call('subscribe', 'a', good);
		const env = { DB: db, VAPID_PUBLIC_KEY: 'public', VAPID_PRIVATE_KEY: 'secret' };
		const data = (await load({ locals: { userId: 'a' }, platform: { env } } as unknown as Parameters<NonNullable<typeof load>>[0])) as Record<string, unknown>;
		expect(data.vapidPublicKey).toBe('public');
		expect(JSON.stringify(data)).not.toContain('secret');
		expect(data.subscriptions).toEqual([{ endpoint: FCM, hour: 8 }]);
	});
});

describe('turning reminders off', () => {
	it('removes only the person\'s own subscription', async () => {
		await call('subscribe', 'a', good);
		await call('unsubscribe', 'b', { endpoint: FCM });
		expect(await listSubscriptions(db, 'a')).toHaveLength(1);
		await call('unsubscribe', 'a', { endpoint: FCM });
		expect(await listSubscriptions(db, 'a')).toHaveLength(0);
	});
});

describe('the test notification', () => {
	it('asks to turn reminders on first, and says so when the site has no keys', async () => {
		expect(await call('test', 'a')).toMatchObject({ status: 400 });
		await call('subscribe', 'a', good);
		expect(await call('test', 'a')).toMatchObject({ status: 503 });
	});

	it('sends to the person\'s own devices only, and forgets one that is gone', async () => {
		await call('subscribe', 'a', good);
		await call('subscribe', 'b', { ...good, endpoint: 'https://fcm.googleapis.com/fcm/send/other' });
		const send = vi.fn(async () => new Response(null, { status: 201 }));
		vi.stubGlobal('fetch', send);
		const env = { DB: db, ...(await keys()) };
		expect(await call('test', 'a', {}, env)).toMatchObject({ ok: true, sent: 1 });
		expect(send).toHaveBeenCalledTimes(1);
		expect(String((send.mock.calls[0] as unknown[])[0])).toBe(FCM);

		vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 410 })));
		expect(await call('test', 'a', {}, env)).toMatchObject({ status: 502 });
		expect(await listSubscriptions(db, 'a')).toHaveLength(0);
		expect(await listSubscriptions(db, 'b')).toHaveLength(1);
	});
});
