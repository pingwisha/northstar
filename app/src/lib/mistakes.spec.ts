import { describe, expect, it } from 'vitest';
import { firstReview, frequentTopics, nextReview, parseMistake, type Mistake } from './mistakes';

const m = (topic: string, fixedAt: string | null = null): Mistake => ({ id: topic + Math.random(), goalId: 'g', topic, note: null, createdAt: '2026-11-20', fixedAt });

describe('parseMistake', () => {
	it('needs a topic and trims it', () => {
		expect(parseMistake({ topic: '  Дроби   и  проценты ', note: ' забыла  ' })).toEqual({ ok: true, value: { topic: 'Дроби и проценты', note: 'забыла' } });
		expect(parseMistake({ topic: '   ' }).ok).toBe(false);
		expect(parseMistake({}).ok).toBe(false);
	});
	it('limits the length', () => {
		expect(parseMistake({ topic: 'а'.repeat(81) }).ok).toBe(false);
		expect(parseMistake({ topic: 'тема', note: 'б'.repeat(501) }).ok).toBe(false);
		expect(parseMistake({ topic: 'а'.repeat(80), note: 'б'.repeat(500) }).ok).toBe(true);
	});
});

describe('frequentTopics', () => {
	it('lists repeated open topics, ignoring letter case and fixed ones', () => {
		expect(frequentTopics([m('Дроби'), m('дроби'), m('Графики'), m('Дроби', '2026-11-20'), m('Графики'), m('Графики')])).toEqual([
			{ topic: 'Графики', count: 3 },
			{ topic: 'Дроби', count: 2 }
		]);
	});
	it('is empty when nothing repeats', () => expect(frequentTopics([m('А'), m('Б')])).toEqual([]));
});

describe('spaced review', () => {
	it('starts tomorrow', () => {
		expect(firstReview('2026-11-27')).toEqual({ step: 0, due: '2026-11-28' });
		expect(firstReview('2026-12-31')).toEqual({ step: 0, due: '2027-01-01' });
	});
	it('moves 1 -> 3 -> 7 days on "remembered" and then ends', () => {
		const a = nextReview(0, true, '2026-11-28');
		expect(a).toEqual({ step: 1, due: '2026-12-01' });
		const b = nextReview(a.step, true, '2026-12-01');
		expect(b).toEqual({ step: 2, due: '2026-12-08' });
		expect(nextReview(b.step, true, '2026-12-08')).toEqual({ step: 3, due: null });
	});
	it('starts over on "not remembered", from any step', () => {
		expect(nextReview(2, false, '2026-12-08')).toEqual({ step: 0, due: '2026-12-09' });
	});
});
