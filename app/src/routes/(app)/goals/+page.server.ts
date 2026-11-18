import { error, fail } from '@sveltejs/kit';
import { buildCards } from '$lib/goal-view';
import { MAX_ACTIVE_GOALS, parseDeadline, parseNewGoal, todayIso } from '$lib/goals';
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
	return { today, ...buildCards(goals, tasks, today) };
};

const field = (data: FormData, name: string) => String(data.get(name) ?? '');

export const actions: Actions = {
	add: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const values = { title: field(data, 'title'), description: field(data, 'description'), deadline: field(data, 'deadline') };
		const today = todayIso();
		const parsed = parseNewGoal(values, today);
		if (!parsed.ok) return fail(400, { action: 'add', message: parsed.message, values });
		if ((await me.countActiveGoals()) >= MAX_ACTIVE_GOALS) {
			return fail(400, { action: 'add', message: `Активных целей может быть не больше ${MAX_ACTIVE_GOALS}. Заверши или убери лишние.`, values });
		}
		await me.addGoal(parsed.value, today);
		return { action: 'add', ok: true };
	},

	deadline: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const goalId = field(data, 'id');
		const parsed = parseDeadline(field(data, 'deadline'), todayIso());
		if (!parsed.ok) return fail(400, { action: 'deadline', goalId, message: parsed.message });
		if (!(await me.setDeadline(goalId, parsed.value))) return fail(404, { action: 'deadline', goalId, message: 'Такой цели нет.' });
		return { action: 'deadline', ok: true };
	},

	finish: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		if (!(await me.setGoalStatus(goalId, 'done'))) return fail(404, { action: 'finish', goalId, message: 'Такой цели нет.' });
		return { action: 'finish', ok: true };
	}
};
