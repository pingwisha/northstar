import { describe, expect, it } from 'vitest';
import { streakDays, streakLabel } from './streak';

describe('streakDays', () => {
	it('is 0 with nothing checked', () => expect(streakDays([null], '2026-11-20')).toBe(0));
	it('counts days in a row ending today', () =>
		expect(streakDays(['2026-11-20T08:00:00Z', '2026-11-19T10:00:00Z', '2026-11-19T12:00:00Z', '2026-11-18T10:00:00Z'], '2026-11-20', 'UTC')).toBe(3));
	it('keeps the streak alive when today has no check yet', () =>
		expect(streakDays(['2026-11-19T10:00:00Z', '2026-11-18T10:00:00Z'], '2026-11-20', 'UTC')).toBe(2));
	it('breaks after a missed day', () => expect(streakDays(['2026-11-18T10:00:00Z'], '2026-11-20', 'UTC')).toBe(0));
	it('uses the persons own time zone', () =>
		// 23:30 UTC on the 19th is already the 20th in Moscow.
		expect(streakDays(['2026-11-19T23:30:00Z'], '2026-11-20', 'Europe/Moscow')).toBe(1));
	it('ignores broken dates', () => expect(streakDays(['nonsense'], '2026-11-20')).toBe(0));
});

describe('streakLabel', () => {
	it('declines the word', () => {
		expect(streakLabel(1)).toBe('1 день подряд');
		expect(streakLabel(3)).toBe('3 дня подряд');
		expect(streakLabel(5)).toBe('5 дней подряд');
		expect(streakLabel(11)).toBe('11 дней подряд');
		expect(streakLabel(21)).toBe('21 день подряд');
	});
});
