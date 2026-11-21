// How many tasks were checked on each of the last seven days. Pure: no database, no clock.
import { TIMEZONE, validTimeZone } from './goals';

export interface DayActivity {
	date: string;
	weekday: string;
	count: number;
	today: boolean;
}

const WEEKDAY = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const dayOf = (iso: string, timeZone: string): string | null => {
	const at = new Date(iso);
	if (Number.isNaN(at.getTime())) return null;
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
};

const shift = (iso: string, n: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function weekActivity(completedAt: (string | null)[], today: string, timeZone: string = TIMEZONE): DayActivity[] {
	const zone = validTimeZone(timeZone) ? timeZone : TIMEZONE;
	const counts = new Map<string, number>();
	for (const c of completedAt) {
		const d = c ? dayOf(c, zone) : null;
		if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
	}
	return Array.from({ length: 7 }, (_, i) => {
		const date = shift(today, i - 6);
		return { date, weekday: WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()], count: counts.get(date) ?? 0, today: i === 6 };
	});
}

export const weekTotal = (days: DayActivity[]): number => days.reduce((sum, d) => sum + d.count, 0);
