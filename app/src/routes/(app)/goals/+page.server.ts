import { error, fail } from '@sveltejs/kit';
import { buildCards } from '$lib/goal-view';
import { ALL_DAYS, MAX_ACTIVE_GOALS, parseDeadline, parseNewGoal, parseStudyDays, todayIso } from '$lib/goals';
import { colorOf, isGoalIcon, nextColor, parseLook } from '$lib/goal-look';
import { scoped } from '$lib/server/db';
import { replan, schedulePlan, type PlanStage } from '$lib/plan';
import { buildStages } from '$lib/stages';
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
	const [goals, tasks, drafts, stages] = await Promise.all([me.listGoals(), me.listGoalTasks(), me.listDrafts(), me.listStages()]);
	// A proposed plan is shown dated from today, so a draft left for a few days is never stale.
	const proposals = drafts.flatMap((d) => {
		const goal = goals.find((g) => g.id === d.goalId && g.status === 'active');
		if (!goal || daysUntil(today, goal.deadline) < 0 || tasks.some((t) => t.goal_id === goal.id)) return [];
		return [{ goalId: goal.id, missing: d.missing, stages: previewStages(d.stages, today, goal.deadline, goal.study_days) }];
	});
	// Progress of each stage, for the goals that have a plan.
	const stagesByGoal = Object.fromEntries(
		goals.map((g) => [g.id, buildStages(stages.filter((s) => s.goal_id === g.id), tasks.filter((t) => t.goal_id === g.id))])
	);
	return { today, ...buildCards(goals, tasks, today), proposals, stagesByGoal };
};

// The proposed plan as the page shows it: every task has a flat number the person can untick.
function previewStages(stages: PlanStage[], today: string, deadline: string, studyDays: number) {
	let n = 0;
	return schedulePlan(stages, today, deadline, studyDays).map((s) => ({
		title: s.title,
		dueDate: s.dueDate,
		tasks: s.tasks.map((t) => ({ n: n++, title: t.title, plannedFor: t.plannedFor, materials: t.materials.length }))
	}));
}

const PLAN_MESSAGES: Record<PlanError, string> = {
	not_available: 'Эта функция пока недоступна.',
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
		const goalId = await me.addGoal({ ...parsed.value, studyDays: days.value, ...look }, today);
		// The person only names the goal: the plan is asked for right away and waits as a draft.
		const goal = (await me.listGoals()).find((g) => g.id === goalId)!;
		const drafted = await draftPlan(me, await appEnv(platform), locals, goal, today);
		return { action: 'add', ok: true, goalId, planMessage: drafted.ok ? null : drafted.message };
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

	// Step one: shows what would move. Nothing is saved until the person confirms.
	behind: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		const found = await behindPlan(me, goalId, locals.timezone);
		if (!found.ok) return fail(found.status, { action: 'behind', goalId, message: found.message });
		const { result, own } = found;
		const title = new Map(own.map((t) => [t.id, t]));
		const changes = result.moves.map((m) => ({ title: title.get(m.id)!.title, from: title.get(m.id)!.planned_for, to: m.to }));
		return { action: 'behind', ok: true, goalId, summary: result.summary, changed: result.changed, total: changes.length, changes: changes.slice(0, 12) };
	},

	// Step two: the same calculation again on the server, then it is saved.
	behindApply: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		const found = await behindPlan(me, goalId, locals.timezone);
		if (!found.ok) return fail(found.status, { action: 'behind', goalId, message: found.message });
		await me.moveTasks(goalId, found.result.moves);
		return { action: 'behindApply', ok: true, goalId, summary: found.result.summary };
	},

	// Asks the AI and keeps the answer as a draft: nothing becomes the person's plan yet.
	plan: async ({ request, locals, platform }) => {
		const env = await appEnv(platform);
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		const goal = (await me.listGoals()).find((g) => g.id === goalId && g.status === 'active');
		if (!goal) return fail(404, { action: 'plan', goalId, message: 'Такой цели нет.' });
		if ((await me.listGoalTasks()).some((t) => t.goal_id === goal.id)) return fail(409, { action: 'plan', goalId, message: 'У этой цели уже есть план.' });

		const drafted = await draftPlan(me, env, locals, goal, todayIso(undefined, locals.timezone));
		if (!drafted.ok) return fail(drafted.status, { action: 'plan', goalId, message: drafted.message });
		return { action: 'plan', ok: true, goalId };
	},

	// The person accepted the draft, maybe without some tasks. The dates are laid out again from today.
	acceptPlan: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const goalId = field(data, 'id');
		const goal = (await me.listGoals()).find((g) => g.id === goalId && g.status === 'active');
		const draft = (await me.listDrafts()).find((d) => d.goalId === goalId);
		if (!goal || !draft) return fail(404, { action: 'acceptPlan', goalId, message: 'Черновика плана нет. Построй план заново.' });
		const today = todayIso(undefined, locals.timezone);
		if (daysUntil(today, goal.deadline) < 0) return fail(400, { action: 'acceptPlan', goalId, message: PLAN_MESSAGES.deadline_passed });

		const skip = new Set(data.getAll('skip').map(String));
		let n = 0;
		const kept = draft.stages
			.map((s) => ({ ...s, tasks: s.tasks.filter(() => !skip.has(String(n++))) }))
			.filter((s) => s.tasks.length > 0);
		if (kept.length === 0) return fail(400, { action: 'acceptPlan', goalId, message: 'Оставь в плане хотя бы одну задачу.' });

		const saved = await me.savePlan(goal.id, schedulePlan(kept, today, goal.deadline, goal.study_days));
		if (saved === 'has_plan') {
			await me.discardDraft(goal.id);
			return fail(409, { action: 'acceptPlan', goalId, message: 'У этой цели уже есть план.' });
		}
		if (saved === 'not_found') return fail(404, { action: 'acceptPlan', goalId, message: 'Такой цели нет.' });
		return { action: 'acceptPlan', ok: true, goalId };
	},

	discardPlan: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const goalId = field(await request.formData(), 'id');
		await me.discardDraft(goalId);
		return { action: 'discardPlan', ok: true, goalId };
	}
};

// Asks the AI for a plan and keeps it as a draft. Says why when it cannot.
async function draftPlan(
	me: ReturnType<typeof scoped>,
	env: Awaited<ReturnType<typeof appEnv>>,
	locals: App.Locals,
	goal: Parameters<typeof generatePlan>[2] & { id: string },
	today: string
): Promise<{ ok: true } | { ok: false; status: 403 | 502; message: string }> {
	if (!env) return { ok: false, status: 403, message: PLAN_MESSAGES.not_available };
	const result = await generatePlan(env, { userId: locals.userId!, role: locals.role ?? 'member' }, goal, today);
	if (!result.ok) return { ok: false, status: result.error === 'not_available' ? 403 : 502, message: PLAN_MESSAGES[result.error] };
	await me.saveDraft(goal.id, result.draft, result.missingMaterials);
	return { ok: true };
}

// What «Я отстаю» would do for a goal, or why it cannot.
async function behindPlan(me: ReturnType<typeof scoped>, goalId: string, timezone: string | undefined) {
	const goal = (await me.listGoals()).find((g) => g.id === goalId && g.status === 'active');
	if (!goal) return { ok: false as const, status: 404, message: 'Такой цели нет.' };
	const today = todayIso(undefined, timezone);
	if (daysUntil(today, goal.deadline) < 0) return { ok: false as const, status: 400, message: PLAN_MESSAGES.deadline_passed };
	const own = (await me.listGoalTasks()).filter((t) => t.goal_id === goal.id);
	if (own.length === 0) return { ok: false as const, status: 400, message: 'У цели ещё нет плана, пересчитывать нечего.' };
	const result = replan(own.map((t) => ({ id: t.id, plannedFor: t.planned_for, weight: t.weight, done: t.completed_at !== null })), today, goal.deadline, goal.study_days);
	return { ok: true as const, result, own };
}
