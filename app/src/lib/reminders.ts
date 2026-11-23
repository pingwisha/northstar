// Daily reminders. Pure: no database, no network. Everything here uses relative imports only,
// because the same file also runs in the separate reminder Worker.
import { TIMEZONE, todayIso, validTimeZone } from './goals';

export const DEFAULT_REMINDER_HOUR = 9;
export const MAX_SUBSCRIPTIONS = 5;
export const MAX_ENDPOINT = 1000;

// Push services a browser may hand out. The site only ever sends to these hosts, so a made-up
// address cannot turn the server into a tool for knocking on other sites.
const PUSH_HOSTS = ['fcm.googleapis.com', 'android.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];

export function isPushEndpoint(raw: unknown): raw is string {
	if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_ENDPOINT) return false;
	try {
		const url = new URL(raw);
		return url.protocol === 'https:' && !url.username && !url.password && PUSH_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
	} catch {
		return false;
	}
}

export function parseHour(raw: unknown): number | null {
	const n = typeof raw === 'string' && /^\d{1,2}$/.test(raw.trim()) ? Number(raw) : typeof raw === 'number' ? raw : NaN;
	return Number.isInteger(n) && n >= 0 && n <= 23 ? n : null;
}

// The hour of the day in a time zone, 0 to 23.
export function localHour(now: Date, timeZone: string): number {
	const zone = validTimeZone(timeZone) ? timeZone : TIMEZONE;
	return Number(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' }).format(now));
}

export interface Subscription {
	timezone: string;
	hour: number;
	lastSentOn: string | null;
}

// A reminder is due from its hour for the next two hours (so a busy hour can spill over), and only once per local day.
export const DUE_WINDOW_HOURS = 3;
export function isDue(sub: Subscription, now: Date): boolean {
	const late = (localHour(now, sub.timezone) - sub.hour + 24) % 24;
	return late < DUE_WINDOW_HOURS && sub.lastSentOn !== todayIso(now, sub.timezone);
}

// The text of a reminder, from the counts of tasks not done yet. Null when there is nothing to say:
// a person with a clean day is not disturbed.
export function reminderText(todayOpen: number, overdue: number): { title: string; body: string } | null {
	if (todayOpen === 0 && overdue === 0) return null;
	const parts: string[] = [];
	if (todayOpen > 0) parts.push(`на сегодня ${count(todayOpen)}`);
	if (overdue > 0) parts.push(`с прошлых дней ${overdue}`);
	return { title: 'Northstart', body: `Не сделано: ${parts.join(', ')}. Загляни в план.` };
}

function count(n: number): string {
	const m10 = n % 10;
	const m100 = n % 100;
	return `${n} ${m10 === 1 && m100 !== 11 ? 'задача' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'задачи' : 'задач'}`;
}
