import { error, fail } from '@sveltejs/kit';
import { buildCards } from '$lib/goal-view';
import { MAX_ACTIVE_GOALS, parseDeadline, parseNewGoal, todayIso } from '$lib/goals';
import { scoped } from '$lib/server/db';
import { replan } from '$lib/plan';
import { daysUntil } from '$lib/progress';
import { generatePlan, type PlanError } from '$lib/server/plan';
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
	const today = todayIso(undefined, locals.timezone);
	const [goals, tasks] = await Promise.all([me.listGoals(), me.listGoalTasks()]);
	return { today, ...buildCards(goals, tasks, today) };
};

const PLAN_MESSAGES: Record<PlanError, string> = {
	not_available: 'ИИ пока доступен только владельцу сайта.',
	not_configured: 'ИИ ещё не подключён: нет ключа.',
	limit_reached: 'На сегодня лимит запросов к ИИ исчерпан. Попробуй завтра.',
	ai_unavailable: 'ИИ сейчас не отвечает. Попробуй через несколько минут.',
	bad_answer: 'ИИ не смог составить план в нужном виде. Попробуй ещё раз.',
	deadline_passed: 'Срок цели уже прошёл. Сначала измени срок.'
};

const field = (data: FormData, name: string) => String(data.get(name) ?? '');

export const actions: Actions = {
	add: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const values = { title: field(data, 'title'), description: field(data, 'description'), deadline: field(data, 'deadline') };
		const today = todayIso(undefined, locals.timezone);
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
		const parsed = parseDeadline(field(data, 'deadline'), todayIso(undefined, locals.timezone));
		if (!parsed.ok) return fail(400, { action: 'deadline', goalId, message: parsed.message });
		if (!(await me.setDeadline(goalId, parsed.value))) return fail(404, { action: 'deadline', goalId, message: 'Такой цели нет.' });
		return { action: 'deadline', ok: true };
	},

	finish: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		if (!(await me.setGoalStatus(goalId, 'done'))) return fail(404, { action: 'finish', goalId, message: 'Такой цели нет.' });
		return { action: 'finish', ok: true };
	},

	behind: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		const goal = (await me.listGoals()).find((g) => g.id === goalId && g.status === 'active');
		if (!goal) return fail(404, { action: 'behind', goalId, message: 'Такой цели нет.' });
		const today = todayIso(undefined, locals.timezone);
		if (daysUntil(today, goal.deadline) < 0) return fail(400, { action: 'behind', goalId, message: PLAN_MESSAGES.deadline_passed });
		const own = (await me.listGoalTasks()).filter((t) => t.goal_id === goal.id);
		if (own.length === 0) return fail(400, { action: 'behind', goalId, message: 'У цели ещё нет плана, пересчитывать нечего.' });

		const result = replan(own.map((t) => ({ id: t.id, plannedFor: t.planned_for, weight: t.weight, done: t.completed_at !== null })), today, goal.deadline);
		await me.moveTasks(goal.id, result.moves);
		return { action: 'behind', ok: true, goalId, summary: result.summary };
	},

	plan: async ({ request, locals, platform }) => {
		const env = await appEnv(platform);
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		const goal = (await me.listGoals()).find((g) => g.id === goalId && g.status === 'active');
		if (!goal) return fail(404, { action: 'plan', goalId, message: 'Такой цели нет.' });

		const result = await generatePlan(env!, { userId: locals.userId!, role: locals.role ?? 'member' }, goal, todayIso(undefined, locals.timezone));
		if (!result.ok) return fail(result.error === 'not_available' ? 403 : 502, { action: 'plan', goalId, message: PLAN_MESSAGES[result.error] });

		const saved = await me.savePlan(goal.id, result.stages);
		if (saved === 'has_plan') return fail(409, { action: 'plan', goalId, message: 'У этой цели уже есть план.' });
		if (saved === 'not_found') return fail(404, { action: 'plan', goalId, message: 'Такой цели нет.' });
		return { action: 'plan', ok: true };
	}
};
