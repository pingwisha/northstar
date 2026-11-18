import { describe, expect, it } from 'vitest';
import { formatDate, MAX_DESCRIPTION, MAX_TITLE, parseDeadline, parseNewGoal, todayIso } from './goals';

const today = '2026-11-18';

describe('todayIso', () => {
	it('uses the site time zone, not UTC', () => {
		// 23:30 UTC on the 17th is already the 18th in Belgrade (UTC+1 in winter).
		expect(todayIso(new Date('2026-11-17T23:30:00Z'))).toBe('2026-11-18');
		expect(todayIso(new Date('2026-11-18T10:00:00Z'))).toBe('2026-11-18');
	});
});

describe('parseDeadline', () => {
	it('accepts today and later dates', () => {
		expect(parseDeadline('2026-11-18', today)).toEqual({ ok: true, value: '2026-11-18' });
		expect(parseDeadline(' 2027-05-18 ', today)).toEqual({ ok: true, value: '2027-05-18' });
	});

	it('refuses the past, junk, impossible dates and dates too far away', () => {
		for (const bad of ['2026-11-17', '', 'завтра', '2026-02-30', '18.11.2027', '2037-11-19', undefined, 5]) {
			expect(parseDeadline(bad, today).ok, String(bad)).toBe(false);
		}
		expect(parseDeadline('2036-11-18', today).ok).toBe(true);
	});
});

describe('parseNewGoal', () => {
	const ok = { title: 'Сдать экзамен', description: '', deadline: '2027-05-18' };

	it('trims and keeps a valid goal, with an empty description as null', () => {
		expect(parseNewGoal({ ...ok, title: '  Сдать   экзамен ' }, today)).toEqual({
			ok: true,
			value: { title: 'Сдать экзамен', description: null, deadline: '2027-05-18' }
		});
	});

	it('needs a title and a valid deadline', () => {
		expect(parseNewGoal({ ...ok, title: '   ' }, today).ok).toBe(false);
		expect(parseNewGoal({ ...ok, deadline: '2020-01-01' }, today).ok).toBe(false);
	});

	it('limits the lengths', () => {
		expect(parseNewGoal({ ...ok, title: 'а'.repeat(MAX_TITLE + 1) }, today).ok).toBe(false);
		expect(parseNewGoal({ ...ok, description: 'а'.repeat(MAX_DESCRIPTION + 1) }, today).ok).toBe(false);
		expect(parseNewGoal({ ...ok, title: 'а'.repeat(MAX_TITLE) }, today).ok).toBe(true);
	});
});

describe('formatDate', () => {
	it('writes day, month, year', () => {
		expect(formatDate('2027-05-18')).toBe('18.05.2027');
	});
});
