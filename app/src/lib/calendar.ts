// Month calendar helpers. Pure: dates are YYYY-MM-DD, months are YYYY-MM, weeks start on Monday.

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_OF = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY = 86_400_000;

// A month from the address, or the month of today when it is missing or not a real month.
export function parseMonth(raw: unknown, today: string): string {
	return typeof raw === 'string' && MONTH.test(raw) ? raw : today.slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
	const [y, m] = month.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 1 + by, 1));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const monthTitle = (month: string): string => `${MONTHS[+month.slice(5) - 1]} ${month.slice(0, 4)}`;

// "18 ноября" for a date.
export const dayTitle = (iso: string): string => `${+iso.slice(8)} ${MONTHS_OF[+iso.slice(5, 7) - 1]}`;

export interface Cell {
	date: string;
	inMonth: boolean;
}

// Whole weeks covering the month, Monday first.
export function monthGrid(month: string): Cell[][] {
	const [y, m] = month.split('-').map(Number);
	const first = Date.UTC(y, m - 1, 1);
	const offset = (new Date(first).getUTCDay() + 6) % 7;
	const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
	const total = Math.ceil((offset + days) / 7) * 7;
	const weeks: Cell[][] = [];
	for (let i = 0; i < total; i++) {
		const date = new Date(first + (i - offset) * DAY).toISOString().slice(0, 10);
		if (i % 7 === 0) weeks.push([]);
		weeks[weeks.length - 1].push({ date, inMonth: date.startsWith(month) });
	}
	return weeks;
}

export interface DayInfo {
	total: number;
	done: number;
	// Tasks not done on a day before today.
	overdue: number;
	// Goals whose deadline is this day.
	deadlines: string[];
}

export function summarizeDays(
	tasks: { planned_for: string; completed_at: string | null }[],
	deadlines: { date: string; title: string }[],
	today: string
): Map<string, DayInfo> {
	const days = new Map<string, DayInfo>();
	const at = (date: string): DayInfo => days.get(date) ?? (days.set(date, { total: 0, done: 0, overdue: 0, deadlines: [] }), days.get(date)!);
	for (const t of tasks) {
		const d = at(t.planned_for);
		d.total++;
		if (t.completed_at !== null) d.done++;
		else if (t.planned_for < today) d.overdue++;
	}
	for (const g of deadlines) at(g.date).deadlines.push(g.title);
	return days;
}
