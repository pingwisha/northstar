// Turning a goal into stages and dated tasks. The AI proposes the content and the order;
// the dates come from code, so every task is guaranteed to fall before the deadline.
import { daysUntil } from './progress';
import { MAX_TITLE } from './goals';
import { plainText } from './ai-text';

export const MAX_STAGES = 8;
export const MAX_TASKS = 60;
const MAX_MATERIALS = 3;
const MATERIAL_KINDS = ['article', 'video', 'trainer', 'checklist', 'other'] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export interface PlanMaterial {
	kind: MaterialKind;
	title: string;
	url: string | null;
	source: string | null;
}

export interface PlanTask {
	title: string;
	weight: number;
	materials: PlanMaterial[];
}

export interface PlanStage {
	title: string;
	tasks: PlanTask[];
}

export type PlanParse = { ok: true; stages: PlanStage[] } | { ok: false; error: string };

// How many tasks to ask for: about one per day, but never more than the plan can hold.
export function targetTaskCount(daysAvailable: number): number {
	return Math.max(3, Math.min(MAX_TASKS, daysAvailable));
}

export function buildPlanMessages(goal: { title: string; description: string | null; deadline: string }, today: string, taskCount: number) {
	const days = daysUntil(today, goal.deadline);
	const system = [
		'Ты составляешь план достижения цели. Отвечай только одним JSON объектом, без пояснений до и после него.',
		'Формат: {"stages":[{"title":"...","tasks":[{"title":"...","weight":1}]}]}',
		`Этапов от 2 до ${MAX_STAGES}, они идут по порядку от простого к сложному. Всего задач ровно около ${taskCount}.`,
		'Каждая задача это одно конкретное действие, которое можно сделать за день: что прочитать, решить, выучить или сделать. Не пиши общих слов вроде «заниматься».',
		'weight это число от 1 до 3: насколько задача трудоёмкая. Большинство задач имеет вес 1.',
		'Названия пиши простым русским текстом без звёздочек, решёток, скобок и косых черт.',
		'Материалов пока не подбирай, это будет отдельным шагом.',
		'Не придумывай факты. Если не знаешь программу экзамена или предмета, строй план осторожно по общим принципам.'
	].join('\n');
	const user = [
		`Цель: ${goal.title}`,
		goal.description ? `Подробности: ${goal.description}` : null,
		`Сегодня ${today}, срок ${goal.deadline}, дней до срока: ${days}.`,
		`Построй план примерно из ${taskCount} задач.`
	]
		.filter(Boolean)
		.join('\n');
	return [
		{ role: 'system' as const, content: system },
		{ role: 'user' as const, content: user }
	];
}

// The second pass: materials for one stage, asked separately so a long plan does not
// make the AI skip them. The answer is one list of materials per task, in task order.
export function buildMaterialsMessages(goal: { title: string }, stage: PlanStage) {
	const system = [
		'Ты подбираешь учебные материалы к задачам плана. Отвечай только одним JSON объектом, без пояснений.',
		'Формат: {"materials":[[{"kind":"article","title":"...","url":"https://...","source":"..."}], []]}',
		'Внешний список идёт в том же порядке, что задачи, по одному вложенному списку на каждую задачу. К задаче от нуля до двух материалов. kind один из: article, video, trainer, checklist, other.',
		'Ссылки: ставь url только если уверен, что это настоящая страница, например главная страница известного сайта или официальный документ. Если не уверен, ставь url null, а в source напиши, что искать: название сайта, книги или поисковый запрос. Никогда не выдумывай адреса.',
		'Названия пиши простым русским текстом без звёздочек, решёток, скобок и косых черт. Не придумывай факты.'
	].join('\n');
	const user = [`Цель: ${goal.title}`, `Этап: ${stage.title}`, 'Задачи по порядку:', ...stage.tasks.map((t, i) => `${i + 1}. ${t.title}`)].join('\n');
	return [
		{ role: 'system' as const, content: system },
		{ role: 'user' as const, content: user }
	];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): string => (typeof v === 'string' ? plainText(v).slice(0, max).trim() : '');

function parseMaterial(raw: unknown): PlanMaterial | null {
	if (!isObject(raw)) return null;
	const title = text(raw.title, MAX_TITLE + 40);
	if (!title) return null;
	const kind = MATERIAL_KINDS.find((k) => k === raw.kind) ?? 'other';
	let url: string | null = null;
	if (typeof raw.url === 'string') {
		try {
			const parsed = new URL(raw.url.trim());
			if (parsed.protocol === 'https:') url = parsed.toString();
		} catch {
			/* not a link: keep the material without one */
		}
	}
	const source = text(raw.source, 200) || null;
	// A material with neither a link nor a hint where to look is of no use.
	if (!url && !source) return null;
	return { kind, title, url, source };
}

// Reads the materials answer: one list per task. Anything unusable becomes an empty list.
export function parseMaterials(raw: string, taskCount: number): PlanMaterial[][] {
	const none = Array.from({ length: taskCount }, (): PlanMaterial[] => []);
	try {
		const data: unknown = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
		if (!isObject(data) || !Array.isArray(data.materials)) return none;
		const lists: unknown[] = data.materials;
		return none.map((_, i) => {
			const list = lists[i];
			return (Array.isArray(list) ? list : []).slice(0, MAX_MATERIALS).map(parseMaterial).filter((m): m is PlanMaterial => m !== null);
		});
	} catch {
		return none;
	}
}

// Reads the AI's answer. Strict about the structure, forgiving about the extras:
// a bad material is dropped, a bad stage or task makes the whole answer invalid.
export function parsePlan(raw: string): PlanParse {
	const body = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
	let data: unknown;
	try {
		data = JSON.parse(body);
	} catch {
		return { ok: false, error: 'not_json' };
	}
	if (!isObject(data) || !Array.isArray(data.stages) || data.stages.length < 1 || data.stages.length > MAX_STAGES) return { ok: false, error: 'bad_stages' };

	const stages: PlanStage[] = [];
	let total = 0;
	for (const s of data.stages) {
		if (!isObject(s) || !Array.isArray(s.tasks) || s.tasks.length < 1) return { ok: false, error: 'bad_stage' };
		const title = text(s.title, MAX_TITLE);
		if (!title) return { ok: false, error: 'bad_stage' };
		const tasks: PlanTask[] = [];
		for (const t of s.tasks) {
			if (!isObject(t)) return { ok: false, error: 'bad_task' };
			const taskTitle = text(t.title, 160);
			if (!taskTitle) return { ok: false, error: 'bad_task' };
			const weight = Number.isInteger(t.weight) && (t.weight as number) >= 1 && (t.weight as number) <= 3 ? (t.weight as number) : 1;
			const materials = (Array.isArray(t.materials) ? t.materials : [])
				.slice(0, MAX_MATERIALS)
				.map(parseMaterial)
				.filter((m): m is PlanMaterial => m !== null);
			tasks.push({ title: taskTitle, weight, materials });
		}
		total += tasks.length;
		stages.push({ title, tasks });
	}
	if (total > MAX_TASKS) return { ok: false, error: 'too_many_tasks' };
	return { ok: true, stages };
}

export interface ScheduledTask extends PlanTask {
	plannedFor: string;
}

export interface ScheduledStage {
	title: string;
	dueDate: string;
	tasks: ScheduledTask[];
}

const addDays = (iso: string, n: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// Spreads the tasks over the days from today to the deadline. A heavier task takes more
// room before the next one. With a week or more to go, the last day is left free as a buffer.
export function schedulePlan(stages: PlanStage[], today: string, deadline: string): ScheduledStage[] {
	const span = Math.max(1, daysUntil(today, deadline) >= 7 ? daysUntil(today, deadline) : daysUntil(today, deadline) + 1);
	const all = stages.flatMap((s) => s.tasks);
	const totalWeight = all.reduce((sum, t) => sum + t.weight, 0);
	let before = 0;
	return stages.map((stage) => {
		const tasks = stage.tasks.map((task): ScheduledTask => {
			const offset = Math.min(span - 1, Math.floor((before / totalWeight) * span));
			before += task.weight;
			return { ...task, plannedFor: addDays(today, offset) };
		});
		return { title: stage.title, dueDate: tasks[tasks.length - 1].plannedFor, tasks };
	});
}
