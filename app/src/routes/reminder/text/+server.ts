import { error, json } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { reminderText } from '$lib/reminders';
import { appEnv } from '$lib/server/env';
import { openTaskCounts } from '$lib/server/reminders';
import type { RequestHandler } from './$types';

// What the service worker shows when a reminder arrives. It is asked at that moment, so the
// numbers are current. Only for a signed-in person (hooks.server.ts closes it to everyone else).
export const GET: RequestHandler = async ({ locals, platform }) => {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	const counts = await openTaskCounts(env.DB, locals.userId, todayIso(undefined, locals.timezone));
	const text = reminderText(counts.todayOpen, counts.overdue) ?? { title: 'Northstart', body: 'Все задачи на сегодня сделаны. Так держать.' };
	return json(text, { headers: { 'cache-control': 'no-store' } });
};
