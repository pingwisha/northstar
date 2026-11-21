// Rules for goals that need no database: today's date and what a goal may contain.

// "Today" must not flip at UTC midnight. Each person's own time zone comes from their browser;
// until it is known, and for an unknown name, this one is used.
export const TIMEZONE = 'Europe/Belgrade';

// A zone name the runtime knows, such as America/New_York; anything else is not accepted.
export function validTimeZone(name: unknown): name is string {
	if (typeof name !== 'string' || name.length === 0 || name.length > 64) return false;
	try {
		new Intl.DateTimeFormat('en-CA', { timeZone: name });
		return true;
	} catch {
		return false;
	}
}

export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 500;
export const MAX_ACTIVE_GOALS = 20;
const MAX_YEARS_AHEAD = 10;

// Today as YYYY-MM-DD in the given time zone.
export function todayIso(now: Date = new Date(), timeZone: string = TIMEZONE): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: validTimeZone(timeZone) ? timeZone : TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isRealDate(raw: string): boolean {
	const m = DATE.exec(raw);
	if (!m) return false;
	const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
	return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function parseDeadline(raw: unknown, today: string): Parsed<string> {
	const value = typeof raw === 'string' ? raw.trim() : '';
	if (!isRealDate(value)) return { ok: false, message: 'Укажи срок датой.' };
	if (value < today) return { ok: false, message: 'Срок не может быть в прошлом.' };
	const limit = `${+today.slice(0, 4) + MAX_YEARS_AHEAD}${today.slice(4)}`;
	if (value > limit) return { ok: false, message: `Срок дальше ${MAX_YEARS_AHEAD} лет не поставить.` };
	return { ok: true, value };
}

// Study weekdays as bits: Monday = 1 ... Sunday = 64.
export const ALL_DAYS = 127;
export const WEEKDAYS = [
	{ bit: 1, short: 'Пн', name: 'Понедельник' },
	{ bit: 2, short: 'Вт', name: 'Вторник' },
	{ bit: 4, short: 'Ср', name: 'Среда' },
	{ bit: 8, short: 'Чт', name: 'Четверг' },
	{ bit: 16, short: 'Пт', name: 'Пятница' },
	{ bit: 32, short: 'Сб', name: 'Суббота' },
	{ bit: 64, short: 'Вс', name: 'Воскресенье' }
] as const;
export const isValidStudyDays = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= ALL_DAYS;

// The weekday boxes of a form (each sends its bit) -> one number. No box ticked is a mistake.
export function parseStudyDays(values: unknown[]): Parsed<number> {
	let bits = 0;
	for (const v of values) {
		const n = Number(v);
		if (WEEKDAYS.some((d) => d.bit === n)) bits |= n;
	}
	return bits === 0 ? { ok: false, message: 'Выбери хотя бы один учебный день.' } : { ok: true, value: bits };
}

export interface NewGoal {
	title: string;
	description: string | null;
	deadline: string;
	studyDays?: number;
}

export function parseNewGoal(raw: { title?: unknown; description?: unknown; deadline?: unknown }, today: string): Parsed<NewGoal> {
	const title = typeof raw.title === 'string' ? raw.title.trim().replace(/\s+/g, ' ') : '';
	if (!title) return { ok: false, message: 'Назови цель.' };
	if (title.length > MAX_TITLE) return { ok: false, message: `Название длиннее ${MAX_TITLE} знаков.` };
	const description = typeof raw.description === 'string' ? raw.description.trim() : '';
	if (description.length > MAX_DESCRIPTION) return { ok: false, message: `Описание длиннее ${MAX_DESCRIPTION} знаков.` };
	const deadline = parseDeadline(raw.deadline, today);
	if (!deadline.ok) return deadline;
	return { ok: true, value: { title, description: description || null, deadline: deadline.value } };
}

// 2027-05-18 -> 18.05.2027
export const formatDate = (iso: string): string => iso.split('-').reverse().join('.');
