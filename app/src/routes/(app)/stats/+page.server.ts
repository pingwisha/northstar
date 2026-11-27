import { error } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { appEnv } from '$lib/server/env';
import { readStats } from '$lib/server/stats';
import type { PageServerLoad } from './$types';

// Only the owner reads it; a member gets "forbidden", not an empty page. Counts only.
export const load: PageServerLoad = async ({ locals, platform }) => {
	if (locals.role !== 'owner') error(403, 'Только владелец сайта видит статистику');
	const env = await appEnv(platform);
	if (!env) error(503, 'База данных не подключена');
	return { stats: await readStats(env.DB, todayIso(undefined, locals.timezone)) };
};
