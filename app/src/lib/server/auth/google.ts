// Google sign-in: authorization URL and ID token verification.
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export type VerificationKey = Parameters<typeof jwtVerify>[1];

let remoteKeys: ReturnType<typeof createRemoteJWKSet> | undefined;
export const googleKeys = (): VerificationKey => (remoteKeys ??= createRemoteJWKSet(new URL(GOOGLE_CERTS_URL)));

export function buildAuthUrl(p: { clientId: string; redirectUri: string; state: string; challenge: string }): string {
	const url = new URL(GOOGLE_AUTH_URL);
	url.search = new URLSearchParams({
		client_id: p.clientId,
		redirect_uri: p.redirectUri,
		response_type: 'code',
		scope: 'openid email',
		state: p.state,
		code_challenge: p.challenge,
		code_challenge_method: 'S256',
		prompt: 'select_account'
	}).toString();
	return url.toString();
}

export interface GoogleIdentity {
	email: string;
	emailVerified: boolean;
}

// Checks signature, issuer, audience and expiry of Google's ID token.
export async function verifyIdToken(idToken: string, clientId: string, key: VerificationKey, now: Date = new Date()): Promise<GoogleIdentity> {
	const { payload } = await jwtVerify(idToken, key, { issuer: GOOGLE_ISSUERS, audience: clientId, currentDate: now });
	if (typeof payload.email !== 'string') throw new Error('ID token has no email');
	return { email: payload.email, emailVerified: payload.email_verified === true };
}
