import { error, redirect } from '@sveltejs/kit';
import { appEnv } from '$lib/server/env';
import { buildAuthUrl } from '$lib/server/auth/google';
import { challengeOf, randomToken } from '$lib/server/auth/pkce';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	const env = await appEnv(platform);
	if (!env?.GOOGLE_CLIENT_ID) error(503, 'Sign-in is not configured');

	const state = randomToken();
	const verifier = randomToken(48);
	const options = { path: '/auth', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: 600 } as const;
	cookies.set('oauth_state', state, options);
	cookies.set('oauth_verifier', verifier, options);

	// SvelteKit refuses redirects to other sites unless they are allowed by origin.
	redirect(
		302,
		buildAuthUrl({
			clientId: env.GOOGLE_CLIENT_ID,
			redirectUri: `${url.origin}/auth/google/callback`,
			state,
			challenge: await challengeOf(verifier)
		}),
		{ external: ['https://accounts.google.com'] }
	);
};
