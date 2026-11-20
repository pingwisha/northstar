import { error, fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '../../../hooks.server';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

// Typed by the person to confirm that everything will be erased.
const CONFIRM_WORD = 'УДАЛИТЬ';

async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, locals.userId);
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const me = await mine(locals, platform);
	const [goals, tasks] = await Promise.all([me.listGoals(), me.countTasks()]);
	return { email: locals.email ?? '', goalCount: goals.length, taskCount: tasks, confirmWord: CONFIRM_WORD };
};

export const actions: Actions = {
	delete: async ({ request, locals, platform, cookies }) => {
		const me = await mine(locals, platform);
		const typed = String((await request.formData()).get('confirm') ?? '').trim();
		if (typed.toLocaleUpperCase('ru') !== CONFIRM_WORD) return fail(400, { message: `Чтобы удалить всё, напиши слово ${CONFIRM_WORD}.` });
		await me.deleteAccount();
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login?deleted=1');
	}
};
