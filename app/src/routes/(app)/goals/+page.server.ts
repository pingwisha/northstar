import { error, fail } from '@sveltejs/kit';
import { buildCards } from '$lib/goal-view';
import { ALL_DAYS, MAX_ACTIVE_GOALS, parseDeadline, parseNewGoal, parseStudyDays, todayIso } from '$lib/goals';
import { colorOf, isGoalIcon, nextColor, parseLook } from '$lib/goal-look';
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
	not_available: 'Этот помощник пока доступен только владельцу сайта.',
	not_configured: 'ИИ ещё не подключён: нет ключа.',
	limit_reached: 'На сегодня твой лимит запросов к ИИ исчерпан. Попробуй завтра.',
	service_busy: 'Сегодня ИИ слишком загружен у всех. Попробуй завтра или добавь задачи вручную.',
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
		// Without the weekday boxes (an old form) every day counts; with them, one must stay ticked.
		const days = data.has('days_form') ? parseStudyDays(data.getAll('days')) : { ok: true as const, value: ALL_DAYS };
		if (!days.ok) return fail(400, { action: 'add', message: days.message, values });
		const look = parseLook({ color: data.get('color'), icon: data.get('icon') }, nextColor((await me.listGoals()).length));
		await me.addGoal({ ...parsed.value, studyDays: days.value, ...look }, today);
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

	days: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const goalId = field(data, 'id');
		const days = parseStudyDays(data.getAll('days'));
		if (!days.ok) return fail(400, { action: 'days', goalId, message: days.message });
		if (!(await me.setStudyDays(goalId, days.value))) return fail(404, { action: 'days', goalId, message: 'Такой цели нет.' });

		// Open tasks are laid out again on the new days; done ones and the deadline stay.
		const goal = (await me.listGoals()).find((g) => g.id === goalId)!;
		const today = todayIso(undefined, locals.timezone);
		const open = (await me.listGoalTasks()).filter((t) => t.goal_id === goalId);
		if (open.length === 0 || daysUntil(today, goal.deadline) < 0) return { action: 'days', ok: true, goalId };
		const result = replan(open.map((t) => ({ id: t.id, plannedFor: t.planned_for, weight: t.weight, done: t.completed_at !== null })), today, goal.deadline, days.value);
		await me.moveTasks(goalId, result.moves);
		return { action: 'days', ok: true, goalId, summary: result.changed ? result.summary : null };
	},

	look: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const goalId = field(data, 'id');
		const goal = (await me.listGoals()).find((g) => g.id === goalId);
		if (!goal) return fail(404, { action: 'look', goalId, message: 'Такой цели нет.' });
		const look = parseLook({ color: data.get('color'), icon: data.get('icon') }, colorOf(goal.color), isGoalIcon(goal.icon) ? goal.icon : 'target');
		await me.setLook(goalId, look.color, look.icon);
		return { action: 'look', ok: true, goalId };
	},

	finish: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		if (!(await me.setGoalStatus(goalId, 'done'))) return fail(404, { action: 'finish', goalId, message: 'Такой цели нет.' });
		return { action: 'finish', ok: true };
	},

	archive: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		const goal = (await me.listGoals()).find((g) => g.id === goalId && g.status === 'active');
		if (!goal || !(await me.setGoalStatus(goalId, 'archived'))) return fail(404, { action: 'archive', goalId, message: 'Такой цели нет.' });
		return { action: 'archive', ok: true };
	},

	restore: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		const goal = (await me.listGoals()).find((g) => g.id === goalId && g.status === 'archived');
		if (!goal) return fail(404, { action: 'restore', goalId, message: 'Такой цели нет в архиве.' });
		if ((await me.countActiveGoals()) >= MAX_ACTIVE_GOALS) {
			return fail(400, { action: 'restore', goalId, message: `Активных целей может быть не больше ${MAX_ACTIVE_GOALS}. Сначала заверши или убери лишние.` });
		}
		if (!(await me.setGoalStatus(goalId, 'active'))) return fail(404, { action: 'restore', goalId, message: 'Такой цели нет в архиве.' });
		return { action: 'restore', ok: true };
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

		const result = replan(own.map((t) => ({ id: t.id, plannedFor: t.planned_for, weight: t.weight, done: t.completed_at !== null })), today, goal.deadline, goal.study_days);
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
