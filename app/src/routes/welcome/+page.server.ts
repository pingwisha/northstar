import { appEnv } from '$lib/server/env';
import type { PageServerLoad } from './$types';

// The language of the description: ?lang=ru or ?lang=en when the visitor chose, otherwise the
// browser's language (Russian for Russian browsers, English for everyone else).
export const load: PageServerLoad = async ({ platform, url, request }) => {
	const env = await appEnv(platform);
	const asked = url.searchParams.get('lang');
	const header = (request.headers.get('accept-language') ?? '').trim().toLowerCase();
	const lang: 'ru' | 'en' = asked === 'ru' || asked === 'en' ? asked : header.startsWith('ru') ? 'ru' : 'en';
	return { open: env?.SIGNUP === 'open', lang };
};
