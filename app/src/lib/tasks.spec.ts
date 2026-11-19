import { describe, expect, it } from 'vitest';
import { MAX_NEW_TASKS, parseOneTitle, parseTaskDay, parseTaskTitles } from './tasks';

describe('parseTaskTitles', () => {
	it('takes one task per line and drops bullets, numbers and empty lines', () => {
		expect(parseTaskTitles('- Первая\n2. Вторая\n\n  • Третья  \r\n4) Четвёртая')).toEqual({ ok: true, value: ['Первая', 'Вторая', 'Третья', 'Четвёртая'] });
	});

	it('refuses nothing, too many lines and too long lines', () => {
		expect(parseTaskTitles('  \n ')).toMatchObject({ ok: false });
		expect(parseTaskTitles(undefined)).toMatchObject({ ok: false });
		expect(parseTaskTitles(Array.from({ length: MAX_NEW_TASKS + 1 }, (_, i) => `з${i}`).join('\n'))).toMatchObject({ ok: false });
		expect(parseTaskTitles('а'.repeat(161))).toMatchObject({ ok: false });
		expect(parseTaskTitles('а'.repeat(160))).toMatchObject({ ok: true });
	});

	it('keeps a number inside the text', () => {
		expect(parseTaskTitles('Решить 10 задач')).toEqual({ ok: true, value: ['Решить 10 задач'] });
	});
});

describe('parseOneTitle', () => {
	it('trims and refuses empty or long titles', () => {
		expect(parseOneTitle('  Задача ')).toEqual({ ok: true, value: 'Задача' });
		expect(parseOneTitle('   ')).toMatchObject({ ok: false });
		expect(parseOneTitle('а'.repeat(161))).toMatchObject({ ok: false });
	});
});

describe('parseTaskDay', () => {
	const today = '2026-11-18';
	it('accepts today and a day up to the deadline', () => {
		expect(parseTaskDay('2026-11-18', today, '2026-12-01')).toEqual({ ok: true, value: '2026-11-18' });
		expect(parseTaskDay('2026-12-01', today, '2026-12-01')).toEqual({ ok: true, value: '2026-12-01' });
	});

	it('refuses the past, a day after the deadline and a non-date', () => {
		expect(parseTaskDay('2026-11-17', today, '2026-12-01')).toMatchObject({ ok: false, message: expect.stringContaining('прошёл') });
		expect(parseTaskDay('2026-12-02', today, '2026-12-01')).toMatchObject({ ok: false, message: expect.stringContaining('01.12.2026') });
		expect(parseTaskDay('вчера', today, '2026-12-01')).toMatchObject({ ok: false });
	});
});
