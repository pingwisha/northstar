// The form actions for tasks that more than one page offers (Сегодня and Календарь), so both
// behave the same. The person comes only from the verified session set by hooks.server.ts.
import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { MAX_OWN_MATERIALS, parseNote, parseOwnMaterial } from '$lib/materials';
import { MAX_TASKS_TOTAL, parseOneTitle, parseTaskDay, parseTaskTitles } from '$lib/tasks';
import { scoped } from './db';
import { fillStageMaterials, type PlanError } from './plan';
import { appEnv } from './env';

async function mine(event: RequestEvent) {
	const env = await appEnv(event.platform);
	if (!env || !event.locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, event.locals.userId);
}

const field = (data: FormData, name: string) => String(data.get(name) ?? '');
const NO_TASK = 'Такой задачи нет.';
const AI_MESSAGES: Record<PlanError, string> = {
	not_available: 'Эта функция пока недоступна.',
	not_configured: 'ИИ ещё не подключён: нет ключа.',
	limit_reached: 'На сегодня твой лимит запросов к ИИ исчерпан. Материалы можно добавить вручную.',
	service_busy: 'Сегодня ИИ слишком загружен у всех. Материалы можно добавить вручную.',
	ai_unavailable: 'ИИ сейчас не отвечает. Материалы можно добавить вручную.',
	bad_answer: 'ИИ не смог подобрать материалы. Их можно добавить вручную.',
	deadline_passed: 'Срок цели уже прошёл.'
};
// Tasks the person added by hand have no stage; these are the ones the AI finds materials for.
export const NEEDS_MATERIALS_LIMIT = 20;
const addDay = (iso: string, n: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

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
		if ((await me.countTasks()) + titles.value.length > MAX_TASKS_TOTAL) return fail(400, { action: 'addTask', message: `Всего можно хранить не больше ${MAX_TASKS_TOTAL} задач. Удали ненужные.`, values });
		const day = parseTaskDay(values.day, todayIso(undefined, event.locals.timezone), goal.deadline);
		if (!day.ok) return fail(400, { action: 'addTask', message: day.message, values });
		if (!(await me.addTasks(goal.id, titles.value, day.value))) return fail(404, { action: 'addTask', message: 'Выбери цель из списка.', values });
		return { action: 'addTask', ok: true };
	},

	// Materials for the tasks the person added by hand to a goal: the AI picks pages from the verified lists.
	fillTasks: async (event: RequestEvent) => {
		const env = await appEnv(event.platform);
		const me = await mine(event);
		const goalId = field(await event.request.formData(), 'goalId');
		const goal = (await me.listGoals()).find((g) => g.id === goalId && g.status === 'active');
		if (!goal) return fail(404, { action: 'fillTasks', message: 'Такой цели нет.' });
		if (!env) return fail(403, { action: 'fillTasks', message: AI_MESSAGES.not_available });
		const have = new Set((await me.listMaterials()).map((m) => m.task_id));
		const waiting = (await me.listGoalTasks())
			.filter((t) => t.goal_id === goal.id && t.stage_id === null && t.completed_at === null && !have.has(t.id))
			.slice(0, NEEDS_MATERIALS_LIMIT);
		if (waiting.length === 0) return { action: 'fillTasks', ok: true };
		const caller = { userId: event.locals.userId!, role: event.locals.role ?? 'member' };
		const filled = await fillStageMaterials(env, caller, goal, { title: 'Дополнительные задачи', tasks: waiting.map((t) => ({ title: t.title, weight: t.weight, materials: [] })) });
		if (!filled.ok) return fail(filled.error === 'not_available' ? 403 : 429, { action: 'fillTasks', message: AI_MESSAGES[filled.error] });
		await me.addPlanMaterials(waiting.map((t, i) => ({ taskId: t.id, materials: filled.stage.tasks[i].materials })));
		return { action: 'fillTasks', ok: true };
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
		const day = field(data, 'day') === task.planned_for ? ({ ok: true, value: task.planned_for } as const) : parseTaskDay(field(data, 'day'), todayIso(undefined, event.locals.timezone), goal.deadline);
		if (!day.ok) return fail(400, { action: 'editTask', taskId, message: day.message });
		if (!(await me.updateTask(task.id, title.value, day.value))) return fail(404, { action: 'editTask', taskId, message: NO_TASK });
		return { action: 'editTask', ok: true };
	},

	// «На завтра»: a task not done yet and due today or earlier moves to tomorrow, if the goal still lasts that long.
	postpone: async (event: RequestEvent) => {
		const me = await mine(event);
		const taskId = field(await event.request.formData(), 'id');
		const task = (await me.listGoalTasks()).find((t) => t.id === taskId);
		const goal = task ? (await me.listGoals()).find((g) => g.id === task.goal_id && g.status === 'active') : undefined;
		if (!task || !goal) return fail(404, { action: 'postpone', taskId, message: NO_TASK });
		const today = todayIso(undefined, event.locals.timezone);
		if (task.completed_at !== null || task.planned_for > today) return fail(400, { action: 'postpone', taskId, message: 'Переносить можно только несделанную задачу на сегодня или раньше.' });
		const tomorrow = addDay(today, 1);
		if (tomorrow > goal.deadline) return fail(400, { action: 'postpone', taskId, message: 'Завтра уже после срока цели. Выбери день вручную или сдвинь срок цели.' });
		if (!(await me.updateTask(task.id, task.title, tomorrow))) return fail(404, { action: 'postpone', taskId, message: NO_TASK });
		return { action: 'postpone', ok: true };
	},
	deleteTask: async (event: RequestEvent) => {
		const me = await mine(event);
		const taskId = field(await event.request.formData(), 'id');
		if (!(await me.deleteTask(taskId))) return fail(404, { action: 'deleteTask', taskId, message: NO_TASK });
		return { action: 'deleteTask', ok: true };
	},

	addMaterial: async (event: RequestEvent) => {
		const me = await mine(event);
		const data = await event.request.formData();
		const taskId = field(data, 'id');
		const link = parseOwnMaterial(field(data, 'title'), field(data, 'url'));
		if (!link.ok) return fail(400, { action: 'addMaterial', taskId, message: link.message });
		if ((await me.countOwnMaterials(taskId)) >= MAX_OWN_MATERIALS) return fail(400, { action: 'addMaterial', taskId, message: `К одной задаче можно добавить до ${MAX_OWN_MATERIALS} своих материалов.` });
		if (!(await me.addOwnMaterial(taskId, link.value.title, link.value.url))) return fail(404, { action: 'addMaterial', taskId, message: NO_TASK });
		return { action: 'addMaterial', ok: true };
	},

	deleteMaterial: async (event: RequestEvent) => {
		const me = await mine(event);
		const id = field(await event.request.formData(), 'materialId');
		if (!(await me.deleteOwnMaterial(id))) return fail(404, { action: 'deleteMaterial', message: 'Удалить можно только свою ссылку.' });
		return { action: 'deleteMaterial', ok: true };
	},

	saveNote: async (event: RequestEvent) => {
		const me = await mine(event);
		const data = await event.request.formData();
		const taskId = field(data, 'id');
		const note = parseNote(field(data, 'note'));
		if (!note.ok) return fail(400, { action: 'saveNote', taskId, message: note.message });
		if (!(await me.setTaskNote(taskId, note.value))) return fail(404, { action: 'saveNote', taskId, message: NO_TASK });
		return { action: 'saveNote', ok: true };
	}
};
