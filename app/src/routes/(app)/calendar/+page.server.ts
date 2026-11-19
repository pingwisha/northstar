import { error } from '@sveltejs/kit';
import { parseMonth } from '$lib/calendar';
import { summarizeDays } from '$lib/calendar';
import { todayIso } from '$lib/goals';
import { buildHome } from '$lib/home-view';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import { taskActions } from '$lib/server/task-actions';
import type { Actions, PageServerLoad } from './$types';

async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, locals.userId);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	const me = await mine(locals, platform);
	const today = todayIso();
	const month = parseMonth(url.searchParams.get('month'), today);
	const rawDay = url.searchParams.get('day');
	// The open day: the one in the address, else today when it is in this month.
	const day = rawDay && DATE.test(rawDay) ? rawDay : today.startsWith(month) ? today : null;

	const [goals, tasks, materials] = await Promise.all([me.listGoals(), me.listGoalTasks(), me.listMaterials()]);
	const active = goals.filter((g) => g.status === 'active');
	const activeIds = new Set(active.map((g) => g.id));
	const mineTasks = tasks.filter((t) => activeIds.has(t.goal_id));

	const info = summarizeDays(mineTasks, active.map((g) => ({ date: g.deadline, title: g.title })), today);
	// Reuses the home view to get each task with its goal title and materials.
	const forDay = day ? buildHome(goals, mineTasks.filter((t) => t.planned_for === day), day, materials).today : [];
	return {
		today,
		month,
		day,
		days: Object.fromEntries(info),
		dayTasks: forDay,
		dayDeadlines: day ? (info.get(day)?.deadlines ?? []) : [],
		taskTotal: mineTasks.length,
		goals: active.map((g) => ({ id: g.id, title: g.title, deadline: g.deadline }))
	};
};

export const actions: Actions = taskActions;
