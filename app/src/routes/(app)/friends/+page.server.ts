import { error, fail } from '@sveltejs/kit';
import { INVITE_DAYS, MAX_ACTIVE_INVITES, MAX_FRIENDS, parseNickname } from '$lib/friends';
import { hashKey, newInviteKey } from '$lib/server/friends';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, locals.userId);
}

const field = (data: FormData, name: string) => String(data.get(name) ?? '');

export const load: PageServerLoad = async ({ locals, platform }) => {
	const me = await mine(locals, platform);
	const now = new Date().toISOString();
	const [friends, invites] = await Promise.all([me.listFriends(), me.listInvites(now)]);
	return { friends, invites, maxFriends: MAX_FRIENDS, inviteDays: INVITE_DAYS };
};

export const actions: Actions = {
	// The link is shown once, right in the answer; only its hash is stored.
	invite: async ({ request, locals, platform, url }) => {
		const me = await mine(locals, platform);
		const nickname = parseNickname(field(await request.formData(), 'nickname'));
		if (!nickname.ok) return fail(400, { action: 'invite', message: nickname.message });
		const now = new Date();
		if ((await me.countActiveInvites(now.toISOString())) >= MAX_ACTIVE_INVITES) return fail(400, { action: 'invite', message: `Действующих приглашений уже ${MAX_ACTIVE_INVITES}. Удали ненужные.` });
		if ((await me.countFriends()) >= MAX_FRIENDS) return fail(400, { action: 'invite', message: `Друзей уже ${MAX_FRIENDS}, это предел.` });
		const key = newInviteKey();
		await me.createInvite(await hashKey(key), nickname.value, new Date(now.getTime() + INVITE_DAYS * 86_400_000).toISOString());
		return { action: 'invite', ok: true, link: `${url.origin}/friends/join/${key}` };
	},

	dropInvite: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		if (!(await me.deleteInvite(field(await request.formData(), 'id')))) return fail(404, { action: 'dropInvite', message: 'Такого приглашения нет.' });
		return { action: 'dropInvite', ok: true };
	},

	end: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		if (!(await me.endFriendship(field(await request.formData(), 'id')))) return fail(404, { action: 'end', message: 'Такого друга нет.' });
		return { action: 'end', ok: true };
	}
};
