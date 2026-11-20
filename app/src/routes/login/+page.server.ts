import { appEnv } from '$lib/server/env';
import type { PageServerLoad } from './$types';

// Tells the sign-in page whether anyone may join or only invited people.
export const load: PageServerLoad = async ({ platform }) => {
	const env = await appEnv(platform);
	return { open: env?.SIGNUP === 'open' };
};
