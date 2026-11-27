import { describe, expect, it } from 'vitest';
import { parseTopics, parseTrial, summarizeTrials, tasksForTopic, clock, parseMinutes, parseStoredTimer, secondsLeft, type Trial } from './trials';

const today = '2026-11-20';
const ok = { title: 'Пробник 1', day: '2026-11-10', score: '21', maxScore: '30', topics: '' };

describe('parseTrial', () => {
	it('accepts a result, with a comma as the decimal sign', () => {
		expect(parseTrial({ ...ok, score: '7,5', maxScore: '10' }, today)).toEqual({ ok: true, value: { takenOn: '2026-11-10', title: 'Пробник 1', score: 7.5, maxScore: 10, weakTopics: null } });
	});
	it('rejects a day in the future, bad numbers and a score above the maximum', () => {
		expect(parseTrial({ ...ok, day: '2026-11-21' }, today).ok).toBe(false);
		expect(parseTrial({ ...ok, score: 'много' }, today).ok).toBe(false);
		expect(parseTrial({ ...ok, score: '-1' }, today).ok).toBe(false);
		expect(parseTrial({ ...ok, score: '31' }, today).ok).toBe(false);
		expect(parseTrial({ ...ok, maxScore: '0' }, today).ok).toBe(false);
		expect(parseTrial({ ...ok, title: '  ' }, today).ok).toBe(false);
		expect(parseTrial({ ...ok, day: '' }, today).ok).toBe(false);
	});
});

describe('parseTopics', () => {
	it('splits, trims and drops repeats', () => {
		expect(parseTopics('Дроби,  дроби ; Графики\nГеометрия')).toEqual({ ok: true, value: 'Дроби, Графики, Геометрия' });
		expect(parseTopics('  ')).toEqual({ ok: true, value: null });
	});
	it('limits the count', () => {
		expect(parseTopics(Array.from({ length: 11 }, (_, i) => `т${i}`).join(',')).ok).toBe(false);
	});
});

const t = (id: string, takenOn: string, score: number, weakTopics: string | null): Trial => ({ id, goalId: 'g', takenOn, title: id, score, maxScore: 30, weakTopics });

describe('summarizeTrials', () => {
	it('is empty with no results', () => {
		expect(summarizeTrials([])).toMatchObject({ points: [], last: null, best: null, change: null, weak: [] });
	});
	it('orders by day, floors percents and shows growth', () => {
		const s = summarizeTrials([t('b', '2026-11-10', 20, null), t('a', '2026-11-01', 15, null)]);
		expect(s.points.map((p) => p.percent)).toEqual([50, 66]);
		expect(s).toMatchObject({ last: 66, best: 66, change: 16 });
	});
	it('keeps the order of entry for results on the same day', () => {
		const s = summarizeTrials([t('z', '2026-11-01', 15, null), t('a', '2026-11-01', 21, null)]);
		expect(s.points.map((p) => p.percent)).toEqual([50, 70]);
		expect(s.change).toBe(20);
	});
	it('counts weak topics, most frequent first', () => {
		const s = summarizeTrials([t('a', '2026-11-01', 15, 'Дроби, Графики'), t('b', '2026-11-05', 18, 'дроби'), t('c', '2026-11-09', 20, 'Геометрия, Дроби')]);
		expect(s.weak).toEqual([{ topic: 'Дроби', count: 3 }, { topic: 'Геометрия', count: 1 }, { topic: 'Графики', count: 1 }]);
	});
});

describe('tasksForTopic', () => {
	const t = (title: string, completedAt: string | null = null) => ({ title, completedAt });
	it('matches by word stems, ignoring case and endings', () => {
		const tasks = [t('Сложение дробей'), t('Степени'), t('ДРОБИ: вычитание')];
		expect(tasksForTopic('Дроби', tasks).map((x) => x.title)).toEqual(['Сложение дробей', 'ДРОБИ: вычитание']);
	});
	it('needs every word of the topic', () => {
		const tasks = [t('Обыкновенные дроби'), t('Десятичные дроби')];
		expect(tasksForTopic('обыкновенные дроби', tasks)).toHaveLength(1);
	});
	it('skips finished tasks and keeps at most three', () => {
		const tasks = [t('Дроби 1', '2026-11-01'), t('Дроби 2'), t('Дроби 3'), t('Дроби 4'), t('Дроби 5')];
		expect(tasksForTopic('дроби', tasks).map((x) => x.title)).toEqual(['Дроби 2', 'Дроби 3', 'Дроби 4']);
	});
	it('finds nothing for an empty topic', () => {
		expect(tasksForTopic('  ', [t('Дроби')])).toEqual([]);
	});
});

describe('timer helpers', () => {
	it('takes whole minutes from 1 to 300', () => {
		expect(parseMinutes('90')).toEqual({ ok: true, value: 90 });
		for (const bad of ['', '0', '301', '1,5', 'abc', '-5', undefined]) expect(parseMinutes(bad).ok).toBe(false);
	});
	it('counts seconds left, never below zero, rounding up', () => {
		expect(secondsLeft(10_000, 4_500)).toBe(6);
		expect(secondsLeft(10_000, 20_000)).toBe(0);
	});
	it('writes the clock', () => {
		expect(clock(5400)).toBe('1:30:00');
		expect(clock(65)).toBe('01:05');
		expect(clock(-3)).toBe('00:00');
	});
	it('ignores broken storage', () => {
		expect(parseStoredTimer('{"title":"В","endAt":5}')).toEqual({ title: 'В', endAt: 5 });
		for (const bad of ['', 'nope', '{"endAt":"x"}', '{"title":1,"endAt":2}', null]) expect(parseStoredTimer(bad)).toBeNull();
	});
});
