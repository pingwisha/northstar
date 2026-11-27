import { describe, expect, it } from 'vitest';
import { parseQuickTask } from './quick-task';

// 2026-11-27 is a Friday.
const today = '2026-11-27';
const q = (s: string) => parseQuickTask(s, today);

describe('parseQuickTask', () => {
	it('takes a day word and a time from the start', () => {
		expect(q('завтра в 18:00 решить варианты')).toEqual({ title: '18:00 решить варианты', day: '2026-11-28' });
		expect(q('Послезавтра 9:30 выучить слова')).toEqual({ title: '09:30 выучить слова', day: '2026-11-29' });
		expect(q('сегодня прочитать главу')).toEqual({ title: 'прочитать главу', day: today });
	});
	it('takes "через N дней" and "через неделю"', () => {
		expect(q('через 3 дня повторить дроби')).toEqual({ title: 'повторить дроби', day: '2026-11-30' });
		expect(q('через неделю сдать пробник')).toEqual({ title: 'сдать пробник', day: '2026-12-04' });
	});
	it('takes the nearest weekday after today, at the start or the end', () => {
		expect(q('в понедельник решить вариант')).toEqual({ title: 'решить вариант', day: '2026-11-30' });
		expect(q('сдать сочинение в пятницу')).toEqual({ title: 'сдать сочинение', day: '2026-12-04' });
		expect(q('пн: повторить')).toEqual({ title: 'повторить', day: '2026-11-30' });
	});
	it('takes a date, rolling a passed one to next year', () => {
		expect(q('сдать сочинение 29.11')).toEqual({ title: 'сдать сочинение', day: '2026-11-29' });
		expect(q('1 декабря контрольная')).toEqual({ title: 'контрольная', day: '2026-12-01' });
		expect(q('01.11 повторить')).toEqual({ title: 'повторить', day: '2027-11-01' });
		expect(q('15.01.2027 экзамен')).toEqual({ title: 'экзамен', day: '2027-01-15' });
	});
	it('leaves a line without a day as the title, with no day', () => {
		expect(q('решить варианты')).toEqual({ title: 'решить варианты', day: null });
		expect(q('решить в понедельник вариант')).toEqual({ title: 'решить в понедельник вариант', day: null });
	});
	it('does not take a word that only starts like a day word', () => {
		expect(q('завтрак приготовить')).toEqual({ title: 'завтрак приготовить', day: null });
		expect(q('31.02 повторить').day).toBeNull();
	});
	it('returns an empty title when only a day (and time) is written', () => {
		expect(q('завтра')).toEqual({ title: '', day: '2026-11-28' });
		expect(q('завтра в 18:00')).toEqual({ title: '', day: '2026-11-28' });
	});
});
