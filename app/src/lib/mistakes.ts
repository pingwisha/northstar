// The mistake notebook: checking what the person types. Pure: no database, no clock.
import type { Parsed } from './goals';

export const MAX_MISTAKE_TOPIC = 80;
export const MAX_MISTAKE_NOTE = 500;
export const MAX_MISTAKES_TOTAL = 500;

export interface Mistake {
	id: string;
	goalId: string;
	topic: string;
	note: string | null;
	createdAt: string;
	fixedAt: string | null;
}

export interface NewMistake {
	topic: string;
	note: string | null;
}

export function parseMistake(raw: { topic?: unknown; note?: unknown }): Parsed<NewMistake> {
	const topic = typeof raw.topic === 'string' ? raw.topic.trim().replace(/\s+/g, ' ') : '';
	if (!topic) return { ok: false, message: 'Напиши тему: где ошиблась.' };
	if (topic.length > MAX_MISTAKE_TOPIC) return { ok: false, message: `Тема длиннее ${MAX_MISTAKE_TOPIC} знаков.` };
	const note = typeof raw.note === 'string' ? raw.note.trim() : '';
	if (note.length > MAX_MISTAKE_NOTE) return { ok: false, message: `Заметка длиннее ${MAX_MISTAKE_NOTE} знаков.` };
	return { ok: true, value: { topic, note: note || null } };
}

// Topics that come up most among the mistakes not fixed yet: where to look first.
export function frequentTopics(mistakes: Mistake[], limit = 3): { topic: string; count: number }[] {
	const counts = new Map<string, { topic: string; count: number }>();
	for (const m of mistakes) {
		if (m.fixedAt) continue;
		const key = m.topic.toLowerCase();
		const entry = counts.get(key) ?? { topic: m.topic, count: 0 };
		entry.count++;
		counts.set(key, entry);
	}
	return [...counts.values()].filter((e) => e.count > 1).sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic)).slice(0, limit);
}

// Spaced review: a mistake returns after these many days, one interval per "remembered" mark.
export const REVIEW_INTERVALS = [1, 3, 7] as const;
export const MAX_REVIEWS_SHOWN = 5;

export interface ReviewState {
	step: number;
	due: string | null;
}

export function addDaysIso(iso: string, n: number): string {
	return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

// The first review of a new (or reopened) mistake: tomorrow.
export function firstReview(today: string): ReviewState {
	return { step: 0, due: addDaysIso(today, REVIEW_INTERVALS[0]) };
}

// After a mark: "remembered" moves to the next interval (the last one ends the cycle), "not remembered" starts over.
export function nextReview(step: number, remembered: boolean, today: string): ReviewState {
	if (!remembered) return firstReview(today);
	const next = step + 1;
	if (next >= REVIEW_INTERVALS.length) return { step: REVIEW_INTERVALS.length, due: null };
	return { step: next, due: addDaysIso(today, REVIEW_INTERVALS[next]) };
}
