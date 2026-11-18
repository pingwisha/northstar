import { error, fail } from '@sveltejs/kit';
import { addInvite, listInvites, removeInvite } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only the owner manages access; a member gets "forbidden", not an empty page.
async function ownerDb(locals: App.Locals, platform: App.Platform | undefined): Promise<D1Database> {
	if (locals.role !== 'owner') error(403, 'Только владелец сайта может менять доступ');
	const env = await appEnv(platform);
	if (!env) error(503, 'База данных не подключена');
	return env.DB;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const db = await ownerDb(locals, platform);
	return { invites: await listInvites(db) };
};

export const actions: Actions = {
	add: async ({ request, locals, platform }) => {
		const db = await ownerDb(locals, platform);
		const email = String((await request.formData()).get('email') ?? '').trim().toLowerCase();
		if (!EMAIL.test(email)) return fail(400, { email, message: 'Это не похоже на почту. Пример: name@gmail.com' });
		await addInvite(db, email, locals.userId!);
		return { added: email };
	},
	remove: async ({ request, locals, platform }) => {
		const db = await ownerDb(locals, platform);
		const email = String((await request.formData()).get('email') ?? '');
		await removeInvite(db, email);
		return { removed: email };
	}
};
