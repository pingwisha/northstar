import { pickLang } from '$lib/lang';
import { appEnv } from '$lib/server/env';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, url, request }) => {
	const env = await appEnv(platform);
	return { open: env?.SIGNUP === 'open', lang: pickLang(url, request.headers.get('accept-language')) };
};
