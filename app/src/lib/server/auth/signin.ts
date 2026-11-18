// The server side of "Sign in with Google" and of checking a session on a request.
import { findOrCreateUser, isInvited, scoped, type Role } from '../db';
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
}

export type SignInFailure = 'state' | 'exchange' | 'id_token' | 'unverified' | 'not_allowed';

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

// The owner is whoever is on the ALLOWED_EMAILS secret; invited people are members.
// Null means this email may not sign in.
export async function roleFor(env: AuthEnv, email: string): Promise<Role | null> {
	if (isAllowed(parseAllowlist(env.ALLOWED_EMAILS), email)) return 'owner';
	return (await isInvited(env.DB, email)) ? 'member' : null;
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
