// «Серия»: сколько дней подряд человек отметил хотя бы одну задачу. Pure: no database, no clock.
import { TIMEZONE, validTimeZone } from './goals';

const dayOf = (iso: string, timeZone: string): string | null => {
	const at = new Date(iso);
	if (Number.isNaN(at.getTime())) return null;
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
};

const previousDay = (iso: string): string => {
	const d = new Date(`${iso}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().slice(0, 10);
};

// Days in a row, counted back from today. A day with no check yet does not break the streak:
// it counts from yesterday until the person has had the whole of today. One missed day is forgiven
// in any seven days (only the days with a check are counted), so a single miss never wipes the streak.
const FORGIVE_EVERY = 7;

export function streakDays(completedAt: (string | null)[], today: string, timeZone: string = TIMEZONE): number {
	const zone = validTimeZone(timeZone) ? timeZone : TIMEZONE;
	const days = new Set<string>();
	for (const c of completedAt) {
		const d = c ? dayOf(c, zone) : null;
		if (d) days.add(d);
	}
	let day = days.has(today) ? today : previousDay(today);
	let count = 0;
	let sinceForgiven = FORGIVE_EVERY;
	for (;;) {
		if (days.has(day)) {
			count++;
			sinceForgiven++;
		} else if (sinceForgiven >= FORGIVE_EVERY && days.has(previousDay(day))) {
			sinceForgiven = 0;
		} else {
			break;
		}
		day = previousDay(day);
	}
	return count;
}

export function streakLabel(n: number): string {
	const m10 = n % 10;
	const m100 = n % 100;
	const word = m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней';
	return `${n} ${word} подряд`;
}
