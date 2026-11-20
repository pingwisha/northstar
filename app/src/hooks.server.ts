import type { Handle } from '@sveltejs/kit/hooks';
import { validTimeZone } from './lib/goals';
import { resolveIdentity } from './lib/server/auth/signin';
import { appEnv } from './lib/server/env';

export const SESSION_COOKIE = 'session';
export const TIMEZONE_COOKIE = 'tz';

// Everything except the sign-in page and the sign-in routes needs a signed-in
// person. The person comes only from the session cookie: no header, query or
// body field can name a user.
const PUBLIC = ['/login', '/auth/'];

const wantsPage = (method: string, path: string, accept: string | null): boolean =>
	(method === 'GET' || method === 'HEAD') && !path.startsWith('/api/') && (accept ?? '').includes('text/html');

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'));

	const tz = event.cookies.get(TIMEZONE_COOKIE);
	if (validTimeZone(tz)) event.locals.timezone = tz;

	let identity = null;
	const env = await appEnv(event.platform);
	if (env) {
		try {
			identity = await resolveIdentity(env, event.cookies.get(SESSION_COOKIE));
		} catch (err) {
			// A misconfigured secret must never let anyone in.
			console.error('sign-in check failed', err instanceof Error ? err.message : err);
		}
	}

	if (identity) {
		event.locals.userId = identity.userId;
		event.locals.email = identity.email;
		event.locals.role = identity.role;
	} else if (!isPublic) {
		if (wantsPage(event.request.method, path, event.request.headers.get('accept'))) {
			return new Response(null, { status: 303, headers: { location: '/login' } });
		}
		return new Response(JSON.stringify({ error: 'sign_in_required' }), {
			status: 401,
			headers: { 'content-type': 'application/json' }
		});
	}
	return resolve(event);
};
