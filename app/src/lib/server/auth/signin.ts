// The server side of "Sign in with Google" and of checking a session on a request.
import { countUsersSince, findOrCreateUser, isInvited, scoped, userExists, type Role } from '../db';
import { isAllowed, parseAllowlist } from './allowlist';
import { GOOGLE_TOKEN_URL, googleKeys, verifyIdToken, type VerificationKey } from './google';
import { createSession, verifySession } from './session';

export interface AuthEnv {
	DB: D1Database;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	SESSION_SECRET: string;
	// The owner's Google emails, comma-separated.
	ALLOWED_EMAILS: string;
	// Server-only AI settings, read by src/lib/server/ai.ts.
	GEMINI_API_KEY?: string;
	AI_MODEL?: string;
	DAILY_LIMIT?: string;
	// With open sign-up: how many new accounts one day may bring (default 30).
	SIGNUP_DAILY_LIMIT?: string;
	// Set to "open" to let any verified Google account in as a member. Anything else keeps the site invite-only.
	SIGNUP?: string;
}

export type SignInFailure = 'state' | 'exchange' | 'id_token' | 'unverified' | 'not_allowed' | 'signups_full';

export type SignInResult = { ok: true; session: string } | { ok: false; reason: SignInFailure };

export interface SignInInput {
	env: AuthEnv;
	code: string | null;
	state: string | null;
	expectedState: string | undefined;
	verifier: string | undefined;
	redirectUri: string;
	fetchImpl?: typeof fetch;
	key?: VerificationKey;
	now?: Date;
}

// The owner is whoever is on the ALLOWED_EMAILS secret; invited people are members, and so is everyone
// when SIGNUP is open.
// Null means this email may not sign in.
export async function roleFor(env: AuthEnv, email: string): Promise<Role | null> {
	if (isAllowed(parseAllowlist(env.ALLOWED_EMAILS), email)) return 'owner';
	if (env.SIGNUP === 'open') return 'member';
	return (await isInvited(env.DB, email)) ? 'member' : null;
}

export const DEFAULT_SIGNUP_LIMIT = 30;

export function signupLimitOf(raw: unknown): number {
	const n = Number(raw);
	return Number.isInteger(n) && n >= 0 ? n : DEFAULT_SIGNUP_LIMIT;
}

// With open sign-up, a brand new person may join only while today's cap is not used up.
// Owners, invited people and people who already have an account are never turned away.
export async function signupAllowed(env: AuthEnv, email: string, role: Role, now: Date = new Date()): Promise<boolean> {
	if (role === 'owner' || env.SIGNUP !== 'open') return true;
	if ((await isInvited(env.DB, email)) || (await userExists(env.DB, email))) return true;
	return (await countUsersSince(env.DB, now.toISOString().slice(0, 10))) < signupLimitOf(env.SIGNUP_DAILY_LIMIT);
}

export async function completeGoogleSignIn(input: SignInInput): Promise<SignInResult> {
	const { env, code, state, expectedState, verifier, redirectUri } = input;
	if (!code || !state || !expectedState || !verifier || state !== expectedState) return { ok: false, reason: 'state' };

	let idToken: string;
	try {
		const res = await (input.fetchImpl ?? fetch)(GOOGLE_TOKEN_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: env.GOOGLE_CLIENT_ID,
				client_secret: env.GOOGLE_CLIENT_SECRET,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
				code_verifier: verifier
			})
		});
		if (!res.ok) return { ok: false, reason: 'exchange' };
		const body = (await res.json()) as { id_token?: string };
		if (!body.id_token) return { ok: false, reason: 'exchange' };
		idToken = body.id_token;
	} catch {
		return { ok: false, reason: 'exchange' };
	}

	let identity;
	try {
		identity = await verifyIdToken(idToken, env.GOOGLE_CLIENT_ID, input.key ?? googleKeys(), input.now);
	} catch {
		return { ok: false, reason: 'id_token' };
	}
	if (!identity.emailVerified) return { ok: false, reason: 'unverified' };
	const role = await roleFor(env, identity.email);
	if (!role) return { ok: false, reason: 'not_allowed' };
	if (!(await signupAllowed(env, identity.email, role, input.now))) return { ok: false, reason: 'signups_full' };

	const user = await findOrCreateUser(env.DB, identity.email, role);
	return { ok: true, session: await createSession(env.SESSION_SECRET, { userId: user.id, email: user.email }, input.now) };
}

export interface Identity {
	userId: string;
	email: string;
	role: Role;
}

// Who is making this request? Null unless the session is genuine and unexpired,
// the email is still allowed (owner list or invite), and the account still exists.
export async function resolveIdentity(env: AuthEnv, sessionToken: string | undefined, now?: Date): Promise<Identity | null> {
	const claims = await verifySession(env.SESSION_SECRET, sessionToken, now);
	if (!claims) return null;
	const role = await roleFor(env, claims.email);
	if (!role) return null;
	const user = await scoped(env.DB, claims.userId).getUser();
	if (!user || user.email !== claims.email.trim().toLowerCase()) return null;
	return { userId: user.id, email: user.email, role };
}
