// Rules for tasks the person writes by hand. Pure: no database, no clock.
import { parseDeadline, formatDate, type Parsed } from './goals';

export const MAX_TASK_TITLE = 160;
export const MAX_NEW_TASKS = 30;

// One task per line. A bullet or a number at the start of a line is dropped.
export function parseTaskTitles(raw: unknown): Parsed<string[]> {
	const lines = (typeof raw === 'string' ? raw : '')
		.split(/\r?\n/)
		.map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '').trim())
		.filter(Boolean);
	if (lines.length === 0) return { ok: false, message: 'Напиши название задачи.' };
	if (lines.length > MAX_NEW_TASKS) return { ok: false, message: `За один раз можно добавить не больше ${MAX_NEW_TASKS} задач.` };
	if (lines.some((l) => l.length > MAX_TASK_TITLE)) return { ok: false, message: `Название задачи длиннее ${MAX_TASK_TITLE} знаков. Сократи его.` };
	return { ok: true, value: lines };
}

export function parseOneTitle(raw: unknown): Parsed<string> {
	const title = typeof raw === 'string' ? raw.trim() : '';
	if (!title) return { ok: false, message: 'Название не может быть пустым.' };
	if (title.length > MAX_TASK_TITLE) return { ok: false, message: `Название задачи длиннее ${MAX_TASK_TITLE} знаков. Сократи его.` };
	return { ok: true, value: title };
}

// A day for a task: a real date, not in the past, and not after the goal's deadline.
export function parseTaskDay(raw: unknown, today: string, deadline: string): Parsed<string> {
	const day = parseDeadline(raw, today);
	if (!day.ok) return { ok: false, message: day.message === 'Срок не может быть в прошлом.' ? 'Задачу нельзя поставить на день, который уже прошёл.' : day.message };
	if (day.value > deadline) return { ok: false, message: `Задача не может быть позже срока цели, ${formatDate(deadline)}.` };
	return day;
}
