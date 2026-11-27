// Turning a goal into stages and dated tasks. The AI proposes the content and the order;
// the dates come from code, so every task is guaranteed to fall before the deadline.
import { daysUntil } from './progress';
import { ALL_DAYS, MAX_TITLE, isValidStudyDays } from './goals';
import { buildMaterialUrl, findPage, findSite, pageListForPrompt, siteListForPrompt } from './sites';
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
		'Формат: {"materials":[[{"kind":"trainer","title":"...","page":"id страницы"},{"kind":"article","title":"...","site":"id сайта","query":"..."}], []]}',
		'Внешний список идёт в том же порядке, что задачи, по одному вложенному списку на каждую задачу. К задаче один или два материала, пустой список только если совсем ничего не подходит. kind один из: article, video, trainer, checklist, other.',
		'Адреса не пиши. Сначала ищи подходящую готовую страницу в списке страниц и ставь её id в page. Если страницы нет, выбери site из списка сайтов и в query напиши короткую фразу для поиска на этом сайте.',
		'Для предметов ОГЭ и ЕГЭ бери сайт «Решу ОГЭ» или «Решу ЕГЭ» именно этого предмета, а в query пиши тему задания (например «ударения» или «квадратные уравнения»), не название задачи целиком. Для Википедии и Викисловаря query это точное название статьи или слово, для MDN название темы по-английски, для YouTube тема и слово «урок».',
		'Страницы (id: название, что на ней):',
		pageListForPrompt(),
		'Сайты (id: название, для чего подходит):',
		siteListForPrompt(),
		'Названия материалов пиши простым русским текстом без звёздочек, решёток, скобок и косых черт. Не придумывай факты.'
	].join('\n');
	const user = [`Цель: ${goal.title}`, `Этап: ${stage.title}`, 'Задачи по порядку:', ...stage.tasks.map((t, i) => `${i + 1}. ${t.title}`)].join('\n');
	return [
		{ role: 'system' as const, content: system },
		{ role: 'user' as const, content: user }
	];
}

// A web search is always a working address, so a task the AI found no real page for still gets somewhere to start.
export function searchMaterial(goalTitle: string, taskTitle: string, hint: string | null): PlanMaterial {
	const query = `${hint ?? taskTitle} ${goalTitle}`.replace(/\s+/g, ' ').trim().slice(0, 150);
	return { kind: 'other', title: `Найти в поиске: ${taskTitle}`.slice(0, MAX_TITLE + 40), url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, source: null };
}

// Every task keeps what the AI found; one with no working page also gets the search link.
export function withSearchLinks(goalTitle: string, stages: PlanStage[]): PlanStage[] {
	return stages.map((s) => ({
		...s,
		tasks: s.tasks.map((t) => (t.materials.some((m) => m.url) ? t : { ...t, materials: [...t.materials, searchMaterial(goalTitle, t.title, t.materials.find((m) => m.source)?.source ?? null)] }))
	}));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): string => (typeof v === 'string' ? plainText(v).slice(0, max).trim() : '');

function parseMaterial(raw: unknown): PlanMaterial | null {
	if (!isObject(raw)) return null;
	const title = text(raw.title, MAX_TITLE + 40);
	if (!title) return null;
	const kind = MATERIAL_KINDS.find((k) => k === raw.kind) ?? 'other';
	// An address the AI wrote itself is ignored: only a page or a site from the lists can give one.
	const page = findPage(raw.page);
	if (page) return { kind, title, url: page.url, source: page.name };
	const url = buildMaterialUrl(raw.site, raw.query);
	const site = findSite(raw.site);
	if (!url || !site) return null;
	return { kind, title, url, source: site.name };
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
			// The plan answer carries no materials: they are asked for in a separate step.
			tasks.push({ title: taskTitle, weight, materials: [] });
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

// Dates for a row of tasks, one per weight, spread from today to the deadline. A heavier
// task takes more room before the next one. With a week or more to go, the last day is
// left free as a buffer.
export function spreadDates(weights: number[], today: string, deadline: string, studyDays: number = ALL_DAYS): string[] {
	const days = daysUntil(today, deadline);
	const span = Math.max(1, days >= 7 ? days : days + 1);
	const totalWeight = weights.reduce((sum, w) => sum + w, 0);
	let before = 0;
	return weights.map((w) => {
		const offset = Math.min(span - 1, Math.floor((before / totalWeight) * span));
		before += w;
		return snapToStudyDay(addDays(today, offset), today, deadline, studyDays);
	});
}

// Bit of the weekday of an ISO date: Monday = 1 ... Sunday = 64.
const dayBit = (iso: string): number => 1 << ((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7);

// A day the person does not study on moves to the next study day; past the deadline it moves
// back to the last one. With no study day between today and the deadline the date stays.
export function snapToStudyDay(date: string, today: string, deadline: string, studyDays: number): string {
	if (!isValidStudyDays(studyDays) || studyDays === ALL_DAYS) return date;
	for (let d = date; d <= deadline; d = addDays(d, 1)) if (studyDays & dayBit(d)) return d;
	for (let d = date; d >= today; d = addDays(d, -1)) if (studyDays & dayBit(d)) return d;
	return date;
}

export function schedulePlan(stages: PlanStage[], today: string, deadline: string, studyDays: number = ALL_DAYS): ScheduledStage[] {
	const dates = spreadDates(stages.flatMap((s) => s.tasks.map((t) => t.weight)), today, deadline, studyDays);
	let i = 0;
	return stages.map((stage) => {
		const tasks = stage.tasks.map((task): ScheduledTask => ({ ...task, plannedFor: dates[i++] }));
		return { title: stage.title, dueDate: tasks[tasks.length - 1].plannedFor, tasks };
	});
}

export interface ReplanTask {
	id: string;
	plannedFor: string;
	weight: number;
	done: boolean;
}

export interface Replan {
	moves: { id: string; to: string }[];
	// A plain-language account of what changed, built from the numbers, not by the AI.
	summary: string;
	changed: boolean;
}

const countWord = (n: number, one: string, few: string, many: string): string => {
	const m10 = n % 10;
	const m100 = n % 100;
	return `${n} ${m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many}`;
};

// Re-spreads the tasks not done yet over the days left, in their current order. Done tasks
// stay as they are and the deadline never moves, so nothing can land after it. The caller
// guarantees the deadline has not passed.
export function replan(tasks: ReplanTask[], today: string, deadline: string, studyDays: number = ALL_DAYS): Replan {
	const open = tasks.filter((t) => !t.done);
	if (open.length === 0) return { moves: [], summary: 'Все задачи уже сделаны, пересчитывать нечего.', changed: false };

	const overdue = open.filter((t) => t.plannedFor < today).length;
	const dates = spreadDates(open.map((t) => t.weight), today, deadline, studyDays);
	const moves = open.flatMap((t, i) => (dates[i] !== t.plannedFor ? [{ id: t.id, to: dates[i] }] : []));
	if (moves.length === 0) return { moves, summary: 'План уже ровный: сдвигать нечего. Просто делай задачи по порядку.', changed: false };

	const days = Math.max(1, daysUntil(today, deadline) >= 7 ? daysUntil(today, deadline) : daysUntil(today, deadline) + 1);
	const perDay = Math.round((open.length / days) * 10) / 10;
	const parts = [
		`Сдвинуто ${countWord(moves.length, 'задача', 'задачи', 'задач')} из ${open.length} несделанных.`,
		overdue > 0 ? `Просроченных было ${overdue}, теперь все они разложены на оставшиеся дни.` : null,
		`Последняя задача теперь на ${dates[dates.length - 1].split('-').reverse().join('.')}, срок цели не изменился.`,
		`В среднем ${String(perDay).replace('.', ',')} задачи в день.`,
		perDay > 3 ? 'Это много. Если не получается, лучше честно подвинуть срок цели.' : null
	];
	return { moves, summary: parts.filter(Boolean).join(' '), changed: true };
}
