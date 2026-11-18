import { error, fail } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { buildHome } from '$lib/home-view';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

// The person comes only from the verified session set by hooks.server.ts.
async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, locals.userId);
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const me = await mine(locals, platform);
	const today = todayIso();
	const [goals, tasks] = await Promise.all([me.listGoals(), me.listGoalTasks()]);
	return { today, home: buildHome(goals, tasks, today) };
};

export const actions: Actions = {
	check: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const taskId = String(data.get('id') ?? '');
		const done = data.get('done') === '1';
		if (!(await me.setTaskCompleted(taskId, done))) return fail(404, { taskId, message: 'Такой задачи нет.' });
		return { ok: true };
	}
};
