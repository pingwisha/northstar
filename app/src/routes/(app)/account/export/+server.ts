import { error } from '@sveltejs/kit';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import type { RequestHandler } from './$types';

// Downloads everything the signed-in person has stored, as one JSON file.
export const GET: RequestHandler = async ({ locals, platform }) => {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	const data = await scoped(env.DB, locals.userId).exportAll();
	return new Response(JSON.stringify(data, null, 2), {
		headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="northstar-moi-dannye.json"', 'cache-control': 'no-store' }
	});
};
