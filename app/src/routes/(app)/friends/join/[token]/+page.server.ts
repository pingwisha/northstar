import { error, fail, redirect } from '@sveltejs/kit';
import { ACCEPT_MESSAGES, parseNickname } from '$lib/friends';
import { acceptInvite } from '$lib/server/friends';
import { appEnv } from '$lib/server/env';
import type { Actions } from './$types';

export const load = () => ({});

export const actions: Actions = {
	accept: async ({ request, params, locals, platform }) => {
		const env = await appEnv(platform);
		if (!env || !locals.userId) error(503, 'База данных не подключена');
		const nickname = parseNickname(String((await request.formData()).get('nickname') ?? ''));
		if (!nickname.ok) return fail(400, { message: nickname.message });
		const result = await acceptInvite(env.DB, locals.userId, params.token, nickname.value);
		if (!result.ok) return fail(result.error === 'not_found' ? 404 : 400, { message: ACCEPT_MESSAGES[result.error] });
		redirect(303, '/friends');
	}
};
