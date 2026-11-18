// Who gets in (owner list or invite), and that the person comes only from a
// verified session.
import { SignJWT, generateKeyPair } from 'jose';
import type { Miniflare } from 'miniflare';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handle } from '../src/hooks.server';
import { addInvite, findOrCreateUser, removeInvite } from '../src/lib/server/db';
import { createSession, verifySession } from '../src/lib/server/auth/session';
import { completeGoogleSignIn, resolveIdentity, type AuthEnv } from '../src/lib/server/auth/signin';
import { makeDb } from './helpers';

const SECRET = 'a-test-session-secret-of-at-least-32-chars';
const CLIENT_ID = 'test-client-id';
const DAY = 24 * 60 * 60 * 1000;

let mf: Miniflare;
let env: AuthEnv;
let publicKey: CryptoKey;
let privateKey: CryptoKey;

beforeEach(async () => {
	const made = await makeDb();
	mf = made.mf;
	env = {
		DB: made.db,
		GOOGLE_CLIENT_ID: CLIENT_ID,
		GOOGLE_CLIENT_SECRET: 'test-client-secret',
		SESSION_SECRET: SECRET,
		ALLOWED_EMAILS: 'a@example.com, B@example.com'
	};
	({ publicKey, privateKey } = await generateKeyPair('RS256'));
});

afterEach(async () => {
	await mf.dispose();
});

// A stand-in for Google: signs ID tokens with a key the test also hands to the verifier.
async function idToken(claims: Record<string, unknown>, opts: { aud?: string; exp?: number; key?: CryptoKey } = {}) {
	return new SignJWT({ email_verified: true, ...claims })
		.setProtectedHeader({ alg: 'RS256' })
		.setIssuer('https://accounts.google.com')
		.setAudience(opts.aud ?? CLIENT_ID)
		.setIssuedAt()
		.setExpirationTime(opts.exp ?? Math.floor(Date.now() / 1000) + 600)
		.sign(opts.key ?? privateKey);
}

const googleReturns = (token: string): typeof fetch => (async () => Response.json({ id_token: token })) as typeof fetch;

const signIn = (token: string, over: Partial<Parameters<typeof completeGoogleSignIn>[0]> = {}) =>
	completeGoogleSignIn({
		env,
		code: 'code',
		state: 's1',
		expectedState: 's1',
		verifier: 'v1',
		redirectUri: 'http://localhost/auth/google/callback',
		fetchImpl: googleReturns(token),
		key: publicKey,
		...over
	});

const userCount = async () => (await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>())!.n;

describe('signing in with Google', () => {
	it('signs in an allowlisted person with a verified email and creates their account', async () => {
		const result = await signIn(await idToken({ email: 'a@example.com' }));
		expect(result.ok).toBe(true);
		expect(await userCount()).toBe(1);
		if (result.ok) expect((await verifySession(SECRET, result.session))?.email).toBe('a@example.com');
	});

	it('reaches the same account whatever the letter case', async () => {
		const first = await signIn(await idToken({ email: 'b@example.com' }));
		const second = await signIn(await idToken({ email: 'B@Example.com' }));
		expect(first.ok && second.ok).toBe(true);
		expect(await userCount()).toBe(1);
		if (first.ok && second.ok) {
			expect((await verifySession(SECRET, first.session))?.userId).toBe((await verifySession(SECRET, second.session))?.userId);
		}
	});

	it('refuses an email Google has not verified', async () => {
		const result = await signIn(await idToken({ email: 'a@example.com', email_verified: false }));
		expect(result).toEqual({ ok: false, reason: 'unverified' });
		expect(await userCount()).toBe(0);
	});

	it('refuses a person who is not on the allowlist and creates no account', async () => {
		const result = await signIn(await idToken({ email: 'stranger@example.com' }));
		expect(result).toEqual({ ok: false, reason: 'not_allowed' });
		expect(await userCount()).toBe(0);
	});

	it('refuses a token meant for another application', async () => {
		const result = await signIn(await idToken({ email: 'a@example.com' }, { aud: 'someone-elses-client' }));
		expect(result).toEqual({ ok: false, reason: 'id_token' });
	});

	it('refuses an expired token', async () => {
		const result = await signIn(await idToken({ email: 'a@example.com' }, { exp: Math.floor(Date.now() / 1000) - 60 }));
		expect(result).toEqual({ ok: false, reason: 'id_token' });
	});

	it('refuses a token not signed by Google', async () => {
		const other = await generateKeyPair('RS256');
		const result = await signIn(await idToken({ email: 'a@example.com' }, { key: other.privateKey }));
		expect(result).toEqual({ ok: false, reason: 'id_token' });
	});

	it('refuses a mismatched or missing state without calling Google', async () => {
		const fetchImpl = vi.fn(googleReturns('x'));
		expect(await signIn('x', { state: 'other', fetchImpl })).toEqual({ ok: false, reason: 'state' });
		expect(await signIn('x', { verifier: undefined, fetchImpl })).toEqual({ ok: false, reason: 'state' });
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('reports a failed code exchange', async () => {
		const fetchImpl = (async () => new Response('no', { status: 400 })) as typeof fetch;
		expect(await signIn('x', { fetchImpl })).toEqual({ ok: false, reason: 'exchange' });
	});
});

describe('the session', () => {
	const now = new Date('2026-11-16T10:00:00Z');

	it('lasts thirty days', async () => {
		const token = await createSession(SECRET, { userId: 'u1', email: 'a@example.com' }, now);
		expect(await verifySession(SECRET, token, new Date(now.getTime() + 20 * DAY))).toEqual({ userId: 'u1', email: 'a@example.com' });
		expect(await verifySession(SECRET, token, new Date(now.getTime() + 31 * DAY))).toBeNull();
	});

	it('is not accepted when altered or signed with another secret', async () => {
		const token = await createSession(SECRET, { userId: 'u1', email: 'a@example.com' }, now);
		const [h, p, s] = token.split('.');
		const forgedPayload = btoa(JSON.stringify({ sub: 'someone-else', email: 'a@example.com', exp: 9999999999 })).replace(/=+$/, '');
		expect(await verifySession(SECRET, `${h}.${forgedPayload}.${s}`, now)).toBeNull();
		expect(await verifySession('another-secret-another-secret-another!', token, now)).toBeNull();
		expect(await verifySession(SECRET, undefined, now)).toBeNull();
		expect(await verifySession(SECRET, 'not-a-token', now)).toBeNull();
		expect(p).toBeTruthy();
	});

	it('refuses to be made with a short secret', async () => {
		await expect(createSession('short', { userId: 'u1', email: 'a@example.com' })).rejects.toThrow(/32/);
	});
});

describe('who is making a request', () => {
	it('ends access at once when the person is removed from the allowlist', async () => {
		const user = await findOrCreateUser(env.DB, 'a@example.com');
		const token = await createSession(SECRET, { userId: user.id, email: user.email });
		expect(await resolveIdentity(env, token)).toEqual({ userId: user.id, email: 'a@example.com', role: 'owner' });
		expect(await resolveIdentity({ ...env, ALLOWED_EMAILS: 'b@example.com' }, token)).toBeNull();
	});

	it('refuses a session whose account no longer exists', async () => {
		const user = await findOrCreateUser(env.DB, 'a@example.com');
		const token = await createSession(SECRET, { userId: user.id, email: user.email });
		await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
		expect(await resolveIdentity(env, token)).toBeNull();
	});

	it('refuses a session that names another email than the account has', async () => {
		const user = await findOrCreateUser(env.DB, 'a@example.com');
		const token = await createSession(SECRET, { userId: user.id, email: 'b@example.com' });
		expect(await resolveIdentity(env, token)).toBeNull();
	});
});

describe('the request hook', () => {
	type Input = Parameters<typeof handle>[0];
	const run = async (path: string, opts: { session?: string; headers?: Record<string, string>; env?: AuthEnv } = {}) => {
		const url = new URL(`http://localhost${path}`);
		const jar: Record<string, string> = { ...(opts.session && { session: opts.session }) };
		const event = {
			url,
			request: new Request(url, { headers: { accept: 'text/html', ...opts.headers } }),
			cookies: { get: (n: string) => jar[n] },
			locals: {} as App.Locals,
			platform: { env: opts.env ?? env }
		} as unknown as Input['event'];
		const resolve = vi.fn(async () => new Response('ok'));
		const response = await handle({ event, resolve } as unknown as Input);
		return { response, locals: event.locals, resolve };
	};

	it('sends an anonymous visitor to the sign-in page and gives no content', async () => {
		const { response, resolve } = await run('/');
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/login');
		expect(resolve).not.toHaveBeenCalled();
	});

	it('refuses an anonymous data request', async () => {
		const { response } = await run('/api/tasks', { headers: { accept: 'application/json' } });
		expect(response.status).toBe(401);
	});

	it('lets anyone reach the sign-in pages', async () => {
		expect((await run('/login')).response.status).toBe(200);
		expect((await run('/auth/google')).response.status).toBe(200);
	});

	it('takes the person only from the session, ignoring any user header', async () => {
		const a = await findOrCreateUser(env.DB, 'a@example.com');
		const b = await findOrCreateUser(env.DB, 'b@example.com');
		const session = await createSession(SECRET, { userId: a.id, email: a.email });
		const { locals } = await run('/api/tasks', { session, headers: { 'x-user-id': b.id, 'x-forwarded-user': b.email } });
		expect(locals.userId).toBe(a.id);
		const anonymous = await run('/api/tasks', { headers: { 'x-user-id': a.id, accept: 'application/json' } });
		expect(anonymous.response.status).toBe(401);
	});

	it('refuses everyone when the signing secret is misconfigured', async () => {
		const { response } = await run('/', { session: 'whatever', env: { ...env, SESSION_SECRET: 'short' } });
		expect(response.status).toBe(303);
	});
});

describe('invited people', () => {
	const invited = 'friend@example.com';
	beforeEach(async () => {
		await findOrCreateUser(env.DB, 'owner@example.com', 'owner');
	});
	const ownerId = async () => (await env.DB.prepare("SELECT id FROM users WHERE email = 'owner@example.com'").first<{ id: string }>())!.id;

	it('signs in a person the owner invited, as a member', async () => {
		await addInvite(env.DB, invited, await ownerId());
		const result = await signIn(await idToken({ email: 'Friend@Example.com' }));
		expect(result.ok).toBe(true);
		if (result.ok) {
			const identity = await resolveIdentity(env, result.session);
			expect(identity).toMatchObject({ email: invited, role: 'member' });
		}
	});

	it('lets the owner in without an invite, as owner', async () => {
		const result = await signIn(await idToken({ email: 'a@example.com' }));
		expect(result.ok).toBe(true);
		if (result.ok) expect((await resolveIdentity(env, result.session))?.role).toBe('owner');
	});

	it('refuses a person nobody invited', async () => {
		expect(await signIn(await idToken({ email: invited }))).toEqual({ ok: false, reason: 'not_allowed' });
	});

	it('ends access at once when the owner removes the invite', async () => {
		await addInvite(env.DB, invited, await ownerId());
		const result = await signIn(await idToken({ email: invited }));
		if (!result.ok) throw new Error('sign-in failed');
		expect(await resolveIdentity(env, result.session)).not.toBeNull();
		await removeInvite(env.DB, invited);
		expect(await resolveIdentity(env, result.session)).toBeNull();
	});
});
