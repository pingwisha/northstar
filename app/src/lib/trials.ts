// Practice test results: checking what the person types and the numbers shown on the page.
// Pure: no database, no clock.
import { formatDate, isRealDate, type Parsed } from './goals';

export const MAX_TRIAL_TITLE = 120;
export const MAX_TOPICS = 10;
export const MAX_TOPIC = 60;
export const MAX_SCORE = 100000;
export const MAX_TRIALS_TOTAL = 500;

export interface Trial {
	id: string;
	goalId: string;
	takenOn: string;
	title: string;
	score: number;
	maxScore: number;
	weakTopics: string | null;
}

export interface NewTrial {
	takenOn: string;
	title: string;
	score: number;
	maxScore: number;
	weakTopics: string | null;
}

// "7,5" and "7.5" both mean seven and a half.
function number(raw: unknown): number | null {
	const text = (typeof raw === 'string' ? raw : '').trim().replace(',', '.');
	if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
	return Number(text);
}

// Topics are split by commas, semicolons or lines; repeats (any letter case) count once.
export function parseTopics(raw: unknown): Parsed<string | null> {
	const seen = new Set<string>();
	const topics: string[] = [];
	for (const part of (typeof raw === 'string' ? raw : '').split(/[,;\n]/)) {
		const topic = part.replace(/\s+/g, ' ').trim();
		if (!topic || seen.has(topic.toLowerCase())) continue;
		if (topic.length > MAX_TOPIC) return { ok: false, message: `Тема «${topic.slice(0, 20)}…» длиннее ${MAX_TOPIC} знаков.` };
		seen.add(topic.toLowerCase());
		topics.push(topic);
	}
	if (topics.length > MAX_TOPICS) return { ok: false, message: `Слабых тем может быть не больше ${MAX_TOPICS}.` };
	return { ok: true, value: topics.length ? topics.join(', ') : null };
}

export function parseTrial(raw: { title?: unknown; day?: unknown; score?: unknown; maxScore?: unknown; topics?: unknown }, today: string): Parsed<NewTrial> {
	const title = (typeof raw.title === 'string' ? raw.title : '').replace(/\s+/g, ' ').trim();
	if (!title) return { ok: false, message: 'Напиши название пробника.' };
	if (title.length > MAX_TRIAL_TITLE) return { ok: false, message: `Название длиннее ${MAX_TRIAL_TITLE} знаков.` };
	// A trial is already taken, so its day may be in the past but not in the future.
	const day = typeof raw.day === 'string' ? raw.day.trim() : '';
	if (!isRealDate(day) || day < '2000-01-01') return { ok: false, message: 'Выбери день, когда писала пробник.' };
	if (day > today) return { ok: false, message: 'Пробник не может быть в будущем.' };
	const score = number(raw.score);
	const maxScore = number(raw.maxScore);
	if (score === null || maxScore === null) return { ok: false, message: 'Баллы пиши числом, например 27 или 7,5.' };
	if (maxScore <= 0) return { ok: false, message: 'Максимум баллов должен быть больше нуля.' };
	if (maxScore > MAX_SCORE) return { ok: false, message: `Максимум баллов не больше ${MAX_SCORE}.` };
	if (score > maxScore) return { ok: false, message: 'Баллов не может быть больше максимума.' };
	const topics = parseTopics(raw.topics);
	if (!topics.ok) return topics;
	return { ok: true, value: { takenOn: day, title, score, maxScore, weakTopics: topics.value } };
}

export const percentOf = (t: { score: number; maxScore: number }): number => Math.floor((t.score / t.maxScore) * 100);

export interface TrialSummary {
	// Oldest first, for the chart.
	points: { id: string; takenOn: string; title: string; percent: number; label: string }[];
	last: number | null;
	best: number | null;
	// Last result minus the one before it; null with fewer than two results.
	change: number | null;
	// Topics named in the person's own results, most often first (then alphabetically).
	weak: { topic: string; count: number }[];
}

const num = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

export function summarizeTrials(trials: Trial[]): TrialSummary {
	const sorted = [...trials].sort((a, b) => a.takenOn.localeCompare(b.takenOn));
	const points = sorted.map((t) => ({ id: t.id, takenOn: t.takenOn, title: t.title, percent: percentOf(t), label: `${num(t.score)} из ${num(t.maxScore)}, ${formatDate(t.takenOn)}` }));
	const counts = new Map<string, { topic: string; count: number }>();
	for (const t of sorted) {
		for (const topic of (t.weakTopics ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
			const key = topic.toLowerCase();
			const row = counts.get(key);
			if (row) row.count++;
			else counts.set(key, { topic, count: 1 });
		}
	}
	const last = points.at(-1)?.percent ?? null;
	return {
		points,
		last,
		best: points.length ? Math.max(...points.map((p) => p.percent)) : null,
		change: points.length >= 2 ? points[points.length - 1].percent - points[points.length - 2].percent : null,
		weak: [...counts.values()].sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, 'ru'))
	};
}

export const scoreText = (t: { score: number; maxScore: number }): string => `${num(t.score)} из ${num(t.maxScore)}`;

export const MAX_TASKS_PER_TOPIC = 3;

// The word stem used to match a topic against task titles: endings (-и, -ей, -ами) are cut off.
const stem = (word: string): string => (word.length < 4 ? word : word.slice(0, Math.max(4, word.length - 2)));

// Not finished tasks of one goal whose title has every word of the topic, in the order given (by day).
export function tasksForTopic<T extends { title: string; completedAt: string | null }>(topic: string, tasks: readonly T[], limit = MAX_TASKS_PER_TOPIC): T[] {
	const stems = topic.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(stem);
	if (!stems.length) return [];
	return tasks.filter((t) => !t.completedAt && stems.every((s) => t.title.toLowerCase().includes(s))).slice(0, limit);
}

export const MAX_TIMER_MINUTES = 300;

// The length of a timed trial: a whole number of minutes, 1..300.
export function parseMinutes(raw: unknown): Parsed<number> {
	const text = (typeof raw === 'string' ? raw : '').trim();
	if (!/^\d{1,4}$/.test(text) || Number(text) < 1 || Number(text) > MAX_TIMER_MINUTES) return { ok: false, message: `Время пиши целым числом минут от 1 до ${MAX_TIMER_MINUTES}.` };
	return { ok: true, value: Number(text) };
}

export const secondsLeft = (endAt: number, now: number): number => Math.max(0, Math.ceil((endAt - now) / 1000));

// 5400 -> "1:30:00", 65 -> "01:05".
export function clock(seconds: number): string {
	const s = Math.max(0, Math.floor(seconds));
	const two = (n: number) => String(n).padStart(2, '0');
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${two(m)}:${two(s % 60)}`;
}

// What the browser keeps about a running timer. Anything else in storage is ignored.
export function parseStoredTimer(raw: unknown): { title: string; endAt: number } | null {
	try {
		const v = JSON.parse(typeof raw === 'string' ? raw : '') as { title?: unknown; endAt?: unknown };
		if (typeof v.title === 'string' && typeof v.endAt === 'number' && Number.isFinite(v.endAt)) return { title: v.title.slice(0, MAX_TRIAL_TITLE), endAt: v.endAt };
	} catch {
		/* not JSON: no timer */
	}
	return null;
}
