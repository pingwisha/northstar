// Sending a web push without a payload: the browser wakes the page's service worker, which then
// asks the site what to say. That needs only the VAPID signature (RFC 8292), no message encryption.
// Relative imports only: this file also runs in the separate reminder Worker.
import { isPushEndpoint } from '../reminders';

export const VAPID_SUBJECT = 'mailto:northstart.help@gmail.com';
const TOKEN_SECONDS = 12 * 60 * 60;
const TTL_SECONDS = 4 * 60 * 60;

export interface PushEnv {
	// Base64url: the public key is the 65-byte uncompressed point, the private key the 32-byte scalar.
	VAPID_PUBLIC_KEY?: string;
	VAPID_PRIVATE_KEY?: string;
}

export const toBase64Url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function fromBase64Url(text: string): Uint8Array {
	const padded = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
	return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const encode = (value: unknown): string => toBase64Url(new TextEncoder().encode(JSON.stringify(value)));

async function signingKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
	const point = fromBase64Url(publicKey);
	if (point.length !== 65 || point[0] !== 4) throw new Error('VAPID_PUBLIC_KEY must be a 65-byte uncompressed point');
	return crypto.subtle.importKey(
		'jwk',
		{ kty: 'EC', crv: 'P-256', x: toBase64Url(point.slice(1, 33)), y: toBase64Url(point.slice(33)), d: privateKey, ext: true },
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);
}

// The Authorization header for one push service: a signed token naming that service.
export async function vapidAuthorization(endpoint: string, publicKey: string, privateKey: string, now: Date = new Date()): Promise<string> {
	const claims = { aud: new URL(endpoint).origin, exp: Math.floor(now.getTime() / 1000) + TOKEN_SECONDS, sub: VAPID_SUBJECT };
	const unsigned = `${encode({ typ: 'JWT', alg: 'ES256' })}.${encode(claims)}`;
	const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await signingKey(publicKey, privateKey), new TextEncoder().encode(unsigned));
	return `vapid t=${unsigned}.${toBase64Url(new Uint8Array(signature))}, k=${publicKey}`;
}

// sent: the push service took it. gone: the browser unsubscribed, forget it. failed: try again later.
export type PushResult = 'sent' | 'gone' | 'failed' | 'not_configured' | 'bad_endpoint';

export async function sendPush(env: PushEnv, endpoint: string, send: typeof fetch = fetch, now: Date = new Date()): Promise<PushResult> {
	if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return 'not_configured';
	if (!isPushEndpoint(endpoint)) return 'bad_endpoint';
	try {
		const res = await send(endpoint, {
			method: 'POST',
			headers: { authorization: await vapidAuthorization(endpoint, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, now), ttl: String(TTL_SECONDS), urgency: 'normal' },
			signal: AbortSignal.timeout(10_000)
		});
		void res.body?.cancel();
		if (res.status === 404 || res.status === 410) return 'gone';
		return res.ok ? 'sent' : 'failed';
	} catch {
		return 'failed';
	}
}
