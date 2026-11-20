import { error, fail } from '@sveltejs/kit';
import { buildExam, reviewPlan } from '$lib/exam';
import { todayIso } from '$lib/goals';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, locals.userId);
}

async function exams(me: ReturnType<typeof scoped>, today: string) {
	const [goals, tasks, trials] = await Promise.all([me.listGoals(), me.listGoalTasks(), me.listTrials()]);
	return buildExam(goals, tasks, trials, today);
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const today = todayIso(undefined, locals.timezone);
	return { today, goals: await exams(await mine(locals, platform), today) };
};

export const actions: Actions = {
	// One review task per weak topic that has none yet, spread before the deadline.
	addReviews: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = String((await request.formData()).get('goalId') ?? '');
		const today = todayIso(undefined, locals.timezone);
		const goal = (await exams(me, today)).find((g) => g.id === goalId);
		if (!goal) return fail(404, { action: 'addReviews', message: 'Выбери цель из списка.' });
		if (goal.toReview.length === 0) return fail(400, { action: 'addReviews', goalId, message: 'Нечего добавлять: для слабых тем повторение уже запланировано.' });
		for (const item of reviewPlan(goal.toReview, today, goal.deadline)) {
			if (!(await me.addTasks(goal.id, [item.title], item.day))) return fail(404, { action: 'addReviews', message: 'Выбери цель из списка.' });
		}
		return { action: 'addReviews', ok: true, goalId, added: goal.toReview.length };
	}
};
