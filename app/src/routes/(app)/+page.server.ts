import { error } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { buildHome } from '$lib/home-view';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import { taskActions } from '$lib/server/task-actions';
import type { Actions, PageServerLoad } from './$types';

// The person comes only from the verified session set by hooks.server.ts.
async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, locals.userId);
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const me = await mine(locals, platform);
	const today = todayIso(undefined, locals.timezone);
	const [goals, tasks, materials] = await Promise.all([me.listGoals(), me.listGoalTasks(), me.listMaterials()]);
	return { today, home: buildHome(goals, tasks, today, materials, locals.timezone) };
};

export const actions: Actions = taskActions;
