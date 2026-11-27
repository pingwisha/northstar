import { error, fail } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { MAX_REVIEWS_SHOWN } from '$lib/mistakes';
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
	const [goals, tasks, materials, reviews] = await Promise.all([me.listGoals(), me.listGoalTasks(), me.listMaterials(), me.listDueReviews(today, MAX_REVIEWS_SHOWN)]);
	return { today, home: buildHome(goals, tasks, today, materials, locals.timezone), reviews };
};

export const actions: Actions = {
	...taskActions,

	// «Вспомнил» / «не вспомнил» for a mistake that came back for review.
	review: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const remembered = String(data.get('remembered') ?? '') === '1';
		if (!(await me.reviewMistake(String(data.get('id') ?? ''), remembered, todayIso(undefined, locals.timezone)))) return fail(404, { action: 'review', message: 'Такой ошибки сейчас нет в повторении.' });
		return { action: 'review', ok: true };
	}
};
