import { describe, expect, it } from 'vitest';
import { dayTitle, monthGrid, monthTitle, parseMonth, shiftMonth, summarizeDays } from './calendar';

describe('months', () => {
	it('reads a month from the address and falls back to the current one', () => {
		expect(parseMonth('2026-12', '2026-11-18')).toBe('2026-12');
		for (const bad of ['2026-13', '2026-1', 'abc', undefined, null, '2026-12-01']) expect(parseMonth(bad, '2026-11-18')).toBe('2026-11');
	});

	it('moves across the year boundary', () => {
		expect(shiftMonth('2026-12', 1)).toBe('2027-01');
		expect(shiftMonth('2027-01', -1)).toBe('2026-12');
		expect(shiftMonth('2026-11', 0)).toBe('2026-11');
	});

	it('titles in Russian', () => {
		expect(monthTitle('2026-11')).toBe('Ноябрь 2026');
		expect(dayTitle('2026-11-08')).toBe('8 ноября');
	});
});

describe('monthGrid', () => {
	it('starts on Monday and has whole weeks', () => {
		const weeks = monthGrid('2026-11');
		// 1 November 2026 is a Sunday, so the first row begins with Monday 26 October.
		expect(weeks[0][0]).toEqual({ date: '2026-10-26', inMonth: false });
		expect(weeks[0][6]).toEqual({ date: '2026-11-01', inMonth: true });
		expect(weeks.every((w) => w.length === 7)).toBe(true);
		expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(30);
	});

	it('handles a month that starts on Monday and one of 28 days', () => {
		expect(monthGrid('2026-06')[0][0]).toEqual({ date: '2026-06-01', inMonth: true });
		const feb = monthGrid('2027-02');
		expect(feb).toHaveLength(4);
		expect(feb.flat().every((c) => c.inMonth)).toBe(true);
	});
});

describe('summarizeDays', () => {
	it('counts tasks, done ones, overdue ones and deadlines per day', () => {
		const days = summarizeDays(
			[
				{ planned_for: '2026-11-10', completed_at: null },
				{ planned_for: '2026-11-10', completed_at: '2026-11-10T08:00:00Z' },
				{ planned_for: '2026-11-20', completed_at: null }
			],
			[{ date: '2026-11-20', title: 'ОГЭ' }],
			'2026-11-18'
		);
		expect(days.get('2026-11-10')).toEqual({ total: 2, done: 1, overdue: 1, deadlines: [] });
		expect(days.get('2026-11-20')).toEqual({ total: 1, done: 0, overdue: 0, deadlines: ['ОГЭ'] });
		expect(days.get('2026-11-21')).toBeUndefined();
	});
});
