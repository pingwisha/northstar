// The form actions for tasks that more than one page offers (Сегодня and Календарь), so both
// behave the same. The person comes only from the verified session set by hooks.server.ts.
import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { parseOneTitle, parseTaskDay, parseTaskTitles } from '$lib/tasks';
import { scoped } from './db';
import { appEnv } from './env';

async function mine(event: RequestEvent) {
	const env = await appEnv(event.platform);
	if (!env || !event.locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, event.locals.userId);
}

const field = (data: FormData, name: string) => String(data.get(name) ?? '');
const NO_TASK = 'Такой задачи нет.';

export const taskActions = {
	check: async (event: RequestEvent) => {
		const me = await mine(event);
		const data = await event.request.formData();
		if (!(await me.setTaskCompleted(field(data, 'id'), data.get('done') === '1'))) return fail(404, { action: 'check', message: NO_TASK });
		return { action: 'check', ok: true };
	},

	addTask: async (event: RequestEvent) => {
		const me = await mine(event);
		const data = await event.request.formData();
		const values = { goalId: field(data, 'goalId'), titles: field(data, 'titles'), day: field(data, 'day') };
		const goal = (await me.listGoals()).find((g) => g.id === values.goalId && g.status === 'active');
		if (!goal) return fail(404, { action: 'addTask', message: 'Выбери цель из списка.', values });
		const titles = parseTaskTitles(values.titles);
		if (!titles.ok) return fail(400, { action: 'addTask', message: titles.message, values });
		const day = parseTaskDay(values.day, todayIso(), goal.deadline);
		if (!day.ok) return fail(400, { action: 'addTask', message: day.message, values });
		if (!(await me.addTasks(goal.id, titles.value, day.value))) return fail(404, { action: 'addTask', message: 'Выбери цель из списка.', values });
		return { action: 'addTask', ok: true };
	},

	editTask: async (event: RequestEvent) => {
		const me = await mine(event);
		const data = await event.request.formData();
		const taskId = field(data, 'id');
		const task = (await me.listGoalTasks()).find((t) => t.id === taskId);
		const goal = task ? (await me.listGoals()).find((g) => g.id === task.goal_id && g.status === 'active') : undefined;
		if (!task || !goal) return fail(404, { action: 'editTask', taskId, message: NO_TASK });
		const title = parseOneTitle(field(data, 'title'));
		if (!title.ok) return fail(400, { action: 'editTask', taskId, message: title.message });
		// A task that stays on its day, even one already past, may be renamed without moving it.
		const day = field(data, 'day') === task.planned_for ? ({ ok: true, value: task.planned_for } as const) : parseTaskDay(field(data, 'day'), todayIso(), goal.deadline);
		if (!day.ok) return fail(400, { action: 'editTask', taskId, message: day.message });
		if (!(await me.updateTask(task.id, title.value, day.value))) return fail(404, { action: 'editTask', taskId, message: NO_TASK });
		return { action: 'editTask', ok: true };
	},

	deleteTask: async (event: RequestEvent) => {
		const me = await mine(event);
		const taskId = field(await event.request.formData(), 'id');
		if (!(await me.deleteTask(taskId))) return fail(404, { action: 'deleteTask', taskId, message: NO_TASK });
		return { action: 'deleteTask', ok: true };
	}
};
