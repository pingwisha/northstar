import { describe, expect, it } from 'vitest';
import { sortCards } from './goal-view';

const c = (title: string, deadline: string, startDate: string, createdAt: string, percent: number) => ({ title, deadline, startDate, createdAt, percent, daysLeft: 0 });
const cards = [c('Бета', '2026-12-01', '2026-11-02', '2026-11-02T10', 50), c('альфа', '2027-01-01', '2026-11-01', '2026-11-03T10', 10), c('Гамма', '2026-11-30', '2026-11-03', '2026-11-01T10', 90)];
const names = (k: Parameters<typeof sortCards>[1]) => sortCards(cards, k).map((x) => x.title);

describe('sortCards', () => {
	it('sorts every way', () => {
		expect(names('newest')).toEqual(['альфа', 'Бета', 'Гамма']);
		expect(names('oldest')).toEqual(['Гамма', 'Бета', 'альфа']);
		expect(names('title')).toEqual(['альфа', 'Бета', 'Гамма']);
		expect(names('deadline')).toEqual(['Гамма', 'Бета', 'альфа']);
		expect(names('start')).toEqual(['альфа', 'Бета', 'Гамма']);
		expect(names('progress')).toEqual(['Гамма', 'Бета', 'альфа']);
		expect(names('behind')).toEqual(['альфа', 'Бета', 'Гамма']);
	});
	it('does not change the input', () => {
		names('title');
		expect(cards[0].title).toBe('Бета');
	});
});
