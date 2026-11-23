import { error, fail } from '@sveltejs/kit';
import { validTimeZone } from '$lib/goals';
import { DEFAULT_REMINDER_HOUR, parseHour } from '$lib/reminders';
import { sendPush } from '$lib/server/push';
import { appEnv } from '$lib/server/env';
import { listSubscriptions, removeSubscription, saveSubscription } from '$lib/server/reminders';
import type { Actions, PageServerLoad } from './$types';

async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return { env, userId: locals.userId };
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const { env, userId } = await mine(locals, platform);
	return {
		// The public key is meant to be shown to browsers; the private one never leaves the server.
		vapidPublicKey: env.VAPID_PUBLIC_KEY ?? null,
		defaultHour: DEFAULT_REMINDER_HOUR,
		subscriptions: (await listSubscriptions(env.DB, userId)).map((s) => ({ endpoint: s.endpoint, hour: s.hour }))
	};
};

const field = (data: FormData, name: string) => String(data.get(name) ?? '');

export const actions: Actions = {
	subscribe: async ({ request, locals, platform }) => {
		const { env, userId } = await mine(locals, platform);
		const data = await request.formData();
		const hour = parseHour(field(data, 'hour'));
		if (hour === null) return fail(400, { action: 'subscribe', message: 'Выбери час от 0 до 23.' });
		const timezone = field(data, 'timezone');
		if (!validTimeZone(timezone)) return fail(400, { action: 'subscribe', message: 'Браузер не назвал часовой пояс. Попробуй в другом браузере.' });
		const result = await saveSubscription(env.DB, userId, field(data, 'endpoint'), timezone, hour);
		if (result === 'bad_endpoint') return fail(400, { action: 'subscribe', message: 'Этот браузер не подходит для напоминаний.' });
		if (result === 'too_many') return fail(400, { action: 'subscribe', message: 'Напоминания уже включены на пяти устройствах. Выключи ненужные.' });
		return { action: 'subscribe', ok: true };
	},

	unsubscribe: async ({ request, locals, platform }) => {
		const { env, userId } = await mine(locals, platform);
		await removeSubscription(env.DB, userId, field(await request.formData(), 'endpoint'));
		return { action: 'unsubscribe', ok: true };
	},

	// A test message to every device the person turned reminders on for.
	test: async ({ locals, platform }) => {
		const { env, userId } = await mine(locals, platform);
		const subs = await listSubscriptions(env.DB, userId);
		if (subs.length === 0) return fail(400, { action: 'test', message: 'Сначала включи напоминания.' });
		let sent = 0;
		for (const s of subs) {
			const result = await sendPush(env, s.endpoint);
			if (result === 'sent') sent++;
			else if (result === 'gone') await removeSubscription(env.DB, userId, s.endpoint);
			else if (result === 'not_configured') return fail(503, { action: 'test', message: 'Напоминания на сайте ещё не настроены.' });
		}
		return sent > 0 ? { action: 'test', ok: true, sent } : fail(502, { action: 'test', message: 'Не получилось отправить. Включи напоминания заново.' });
	}
};

