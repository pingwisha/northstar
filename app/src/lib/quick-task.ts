// Quick entry: "завтра в 18:00 решить варианты" -> a title and a day. Pure: no database, no clock.
import { isRealDate } from './goals';

const L = String.raw`\p{L}\d`;
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
// Stem of a weekday name (or its short form) and its number, 0 = Sunday.
const WEEKDAYS: [string, number][] = [
	['понедельник|пн', 1],
	['вторник|вт', 2],
	['сред[ауы]|ср', 3],
	['четверг|чт', 4],
	['пятниц[ауы]|пт', 5],
	['суббот[ауы]|сб', 6],
	['воскресень[ея]|вс', 0]
];

const addDays = (iso: string, n: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const weekdayOf = (iso: string): number => new Date(`${iso}T00:00:00Z`).getUTCDay();
const pad = (n: number): string => String(n).padStart(2, '0');

// A date written as day and month: this year, or the next one when it has already passed. Null when it is no real date.
function dayMonth(day: number, month: number, year: number | null, today: string): string | null {
	const make = (y: number) => `${y}-${pad(month)}-${pad(day)}`;
	if (year !== null) return isRealDate(make(year)) ? make(year) : null;
	const thisYear = Number(today.slice(0, 4));
	const iso = make(thisYear);
	if (!isRealDate(iso)) return null;
	return iso < today ? (isRealDate(make(thisYear + 1)) ? make(thisYear + 1) : null) : iso;
}

interface Phrase {
	re: string;
	day: (m: RegExpExecArray, today: string) => string | null;
}

const PHRASES: Phrase[] = [
	{ re: 'послезавтра', day: (_, t) => addDays(t, 2) },
	{ re: 'сегодня', day: (_, t) => t },
	{ re: 'завтра', day: (_, t) => addDays(t, 1) },
	{ re: 'через\\s+неделю', day: (_, t) => addDays(t, 7) },
	{ re: 'через\\s+(\\d{1,3})\\s+(?:дня|дней|день)', day: (m, t) => addDays(t, Number(m[1])) },
	...WEEKDAYS.map(([names, n]): Phrase => ({ re: `(?:${names})`, day: (_, t) => addDays(t, ((n - weekdayOf(t) + 6) % 7) + 1) })),
	{ re: '(\\d{1,2})\\.(\\d{2})(?:\\.(\\d{4}))?', day: (m, t) => dayMonth(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null, t) },
	{ re: `(\\d{1,2})\\s+(${MONTHS.join('|')})`, day: (m, t) => dayMonth(Number(m[1]), MONTHS.indexOf(m[2]) + 1, null, t) }
];

const PREFIX = '(?:(?:в|во|на)\\s+)?';
const TIME = new RegExp(`(?<![${L}:.])(?:в\\s+)?([01]?\\d|2[0-3]):([0-5]\\d)(?![\\d:])`, 'iu');
const TRIM = /^[\s,;:–—-]+|[\s,;:–—-]+$/g;

export interface QuickTask {
	title: string;
	// null when the line has no day: the caller puts the task on today.
	day: string | null;
}

// The day phrase counts only at the start or at the end of the line, so a title like "решить в понедельник
// вариант" is not cut in the middle.
function takeDay(text: string, today: string): { rest: string; day: string } | null {
	for (const p of PHRASES) {
		for (const where of ['start', 'end'] as const) {
			const re =
				where === 'start'
					? new RegExp(`^${PREFIX}${p.re}(?![${L}])`, 'iu')
					: new RegExp(`(?<![${L}])${PREFIX}${p.re}$`, 'iu');
			const m = re.exec(text.toLowerCase());
			if (!m) continue;
			const day = p.day(m, today);
			if (!day) continue;
			return { rest: (where === 'start' ? text.slice(m[0].length) : text.slice(0, m.index)).replace(TRIM, ''), day };
		}
	}
	return null;
}

export function parseQuickTask(raw: string, today: string): QuickTask {
	let text = raw.replace(/\s+/g, ' ').trim();
	let time: string | null = null;
	const t = TIME.exec(text);
	if (t) {
		time = `${pad(Number(t[1]))}:${t[2]}`;
		text = (text.slice(0, t.index) + ' ' + text.slice(t.index + t[0].length)).replace(/\s+/g, ' ').trim();
	}
	const hit = takeDay(text, today);
	if (hit) text = hit.rest;
	text = text.replace(TRIM, '');
	// A line with only a day and a time is no task: the caller refuses the empty title.
	return { title: text ? (time ? `${time} ${text}` : text) : '', day: hit?.day ?? null };
}
