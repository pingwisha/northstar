import { describe, expect, it } from 'vitest';
import { frequentTopics, parseMistake, type Mistake } from './mistakes';

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
