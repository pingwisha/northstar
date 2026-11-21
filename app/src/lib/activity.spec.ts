import { describe, expect, it } from 'vitest';
import { weekActivity, weekTotal } from './activity';

describe('weekActivity', () => {
	it('gives seven days ending today, oldest first', () => {
		const days = weekActivity([], '2026-11-20', 'UTC');
		expect(days).toHaveLength(7);
		expect(days[0].date).toBe('2026-11-14');
		expect(days[6]).toMatchObject({ date: '2026-11-20', weekday: 'Пт', today: true });
		expect(days.filter((d) => d.today)).toHaveLength(1);
	});
	it('counts checks per day in the persons own zone and ignores old or broken ones', () => {
		const days = weekActivity(['2026-11-20T08:00:00Z', '2026-11-20T09:00:00Z', '2026-11-19T23:30:00Z', '2026-10-01T00:00:00Z', 'nonsense', null], '2026-11-20', 'Europe/Moscow');
		expect(days[6].count).toBe(3);
		expect(days[5].count).toBe(0);
		expect(weekTotal(days)).toBe(3);
	});
});
