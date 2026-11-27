import { error } from '@sveltejs/kit';
import { buildCards } from '$lib/goal-view';
import { todayIso } from '$lib/goals';
import { taskViews } from '$lib/home-view';
import { buildStages } from '$lib/stages';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import { taskActions } from '$lib/server/task-actions';
import type { Actions, PageServerLoad } from './$types';

// One goal with all its tasks. The person comes only from the verified session, and every read is scoped to them,
// so another person's goal looks exactly like a goal that does not exist.
export const load: PageServerLoad = async ({ locals, platform, params }) => {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	const me = scoped(env.DB, locals.userId);
	const today = todayIso(undefined, locals.timezone);
	const [goals, allTasks, materials, stages] = await Promise.all([me.listGoals(), me.listGoalTasks(), me.listMaterials(), me.listStages()]);
	const goal = goals.find((g) => g.id === params.id);
	if (!goal) error(404, 'Такой цели нет');
	const tasks = allTasks.filter((t) => t.goal_id === goal.id);
	const card = buildCards([goal], tasks, today).cards[0];
	const views = taskViews([goal], tasks, materials);
	const stageList = stages.filter((s) => s.goal_id === goal.id);
	const group = (stageId: string | null) => tasks.filter((t) => t.stage_id === stageId).map((t) => views.get(t.id)!);
	const built = buildStages(stageList, tasks);
	const knownStages = new Set(built.map((s) => s.id));
	// Tasks added by hand that still wait for the AI to find materials.
	const have = new Set(materials.map((m) => m.task_id));
	const needMaterials = goal.status === 'active' && tasks.some((t) => t.stage_id === null && t.completed_at === null && !have.has(t.id));
	return {
		today,
		goalId: goal.id,
		deadline: goal.deadline,
		needMaterials,
		card,
		active: goal.status === 'active',
		stages: built.map((s) => ({ ...s, tasks: group(s.id) })),
		// Tasks the person added by hand, or whose stage is gone.
		own: tasks.filter((t) => !t.stage_id || !knownStages.has(t.stage_id)).map((t) => views.get(t.id)!)
	};
};

export const actions: Actions = taskActions;
