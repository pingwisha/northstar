// The sign-in routes as a whole: the start of the Google flow must really send the
// browser to Google. A unit test of the pieces missed that SvelteKit 3 refuses
// redirects to other sites unless they are allowed.
import { describe, expect, it } from 'vitest';
import { GET as start } from '../src/routes/auth/google/+server';

type Input = Parameters<typeof start>[0];

async function run() {
	const jar = new Map<string, string>();
	const event = {
		url: new URL('https://site.test/auth/google'),
		cookies: { set: (n: string, v: string) => jar.set(n, v), delete: () => undefined, get: (n: string) => jar.get(n) },
		platform: {
			env: { GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 's', SESSION_SECRET: 'x'.repeat(40), ALLOWED_EMAILS: 'a@example.com' }
		}
	} as unknown as Input;
	try {
		await start(event);
	} catch (thrown) {
		return { thrown: thrown as { status?: number; location?: string; message?: string }, jar };
	}
	throw new Error('the route did not redirect');
}

describe('GET /auth/google', () => {
	it('redirects the browser to Google with state, PKCE and the callback address', async () => {
		const { thrown, jar } = await run();
		expect(thrown.status, thrown.message).toBe(302);
		const url = new URL(thrown.location!);
		expect(url.origin).toBe('https://accounts.google.com');
		expect(url.searchParams.get('client_id')).toBe('client-id.apps.googleusercontent.com');
		expect(url.searchParams.get('redirect_uri')).toBe('https://site.test/auth/google/callback');
		expect(url.searchParams.get('scope')).toBe('openid email');
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('state')).toBe(jar.get('oauth_state'));
		expect(jar.get('oauth_verifier')).toBeTruthy();
	});

	it('is not configured without a client id', async () => {
		const event = { url: new URL('https://site.test/auth/google'), cookies: { set: () => undefined }, platform: { env: {} } } as unknown as Input;
		await expect(start(event)).rejects.toMatchObject({ status: 503 });
	});
});
