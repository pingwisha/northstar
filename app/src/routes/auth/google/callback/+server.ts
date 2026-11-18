import { error, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '../../../../hooks.server';
import { SESSION_SECONDS } from '$lib/server/auth/session';
import { appEnv } from '$lib/server/env';
import { completeGoogleSignIn } from '$lib/server/auth/signin';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	const env = await appEnv(platform);
	if (!env) error(503, 'Sign-in is not configured');

	const expectedState = cookies.get('oauth_state');
	const verifier = cookies.get('oauth_verifier');
	cookies.delete('oauth_state', { path: '/auth' });
	cookies.delete('oauth_verifier', { path: '/auth' });

	if (url.searchParams.has('error')) redirect(303, '/login?error=cancelled');

	const result = await completeGoogleSignIn({
		env,
		code: url.searchParams.get('code'),
		state: url.searchParams.get('state'),
		expectedState,
		verifier,
		redirectUri: `${url.origin}/auth/google/callback`
	});
	if (!result.ok) redirect(303, `/login?error=${result.reason}`);

	cookies.set(SESSION_COOKIE, result.session, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: SESSION_SECONDS
	});
	redirect(303, '/');
};
