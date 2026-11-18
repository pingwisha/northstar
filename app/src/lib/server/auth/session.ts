// The session is a JWT signed with SESSION_SECRET (HS256), carried in an
// HttpOnly cookie. It names the person (sub = users.id) and their email.
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_DAYS = 30;
export const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

export interface SessionClaims {
	userId: string;
	email: string;
}

function keyOf(secret: string): Uint8Array {
	// A short secret would make forged sessions cheap, so refuse to run with one.
	if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
	return new TextEncoder().encode(secret);
}

export async function createSession(secret: string, claims: SessionClaims, now: Date = new Date()): Promise<string> {
	const issued = Math.floor(now.getTime() / 1000);
	return new SignJWT({ email: claims.email })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(claims.userId)
		.setIssuedAt(issued)
		.setExpirationTime(issued + SESSION_SECONDS)
		.sign(keyOf(secret));
}

// Returns the claims of a genuine, unexpired session, or null for anything else
// (missing, altered, signed with another secret, expired).
export async function verifySession(secret: string, token: string | undefined, now: Date = new Date()): Promise<SessionClaims | null> {
	if (!token) return null;
	try {
		const { payload } = await jwtVerify(token, keyOf(secret), { algorithms: ['HS256'], currentDate: now });
		if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
		return { userId: payload.sub, email: payload.email };
	} catch {
		return null;
	}
}
