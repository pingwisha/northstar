import { describe, expect, it } from 'vitest';
import { daysLabel, daysUntil, groupPercent, overallPercent, pace, share, taskPercent, toPercent, type TaskInput } from './progress';

const task = (plannedFor: string, done = false, weight = 1): TaskInput => ({
	plannedFor,
	weight,
	completedAt: done ? '2026-11-18T10:00:00Z' : null
});

describe('task and group progress', () => {
	it('counts an unchecked task as zero and a checked one as 100', () => {
		expect(taskPercent(task('2026-11-18'))).toBe(0);
		expect(taskPercent(task('2026-11-18', true))).toBe(100);
	});

	it('is zero for a goal with no tasks', () => {
		expect(groupPercent([])).toBe(0);
	});

	it('weights tasks: a heavy task moves the percent more', () => {
		const tasks = [task('2026-11-18', true, 3), task('2026-11-19', false, 1)];
		expect(share(tasks)).toBe(0.75);
		expect(groupPercent(tasks)).toBe(75);
	});

	it('rounds down so 100 means everything is done', () => {
		const almost = [...Array(199).fill(0).map(() => task('2026-11-18', true)), task('2026-11-19')];
		expect(groupPercent(almost)).toBe(99);
		expect(groupPercent([task('2026-11-18', true)])).toBe(100);
	});

	it('does not lose a point to floating point', () => {
		expect(toPercent(0.29)).toBe(29);
		expect(toPercent(0.58)).toBe(58);
		expect(toPercent(2)).toBe(100);
		expect(toPercent(-1)).toBe(0);
	});
});

describe('overall progress', () => {
	it('averages the active goals only', () => {
		const goals = [
			{ status: 'active' as const, tasks: [task('2026-11-18', true)] },
			{ status: 'active' as const, tasks: [task('2026-11-18')] },
			{ status: 'done' as const, tasks: [task('2026-11-18', true)] },
			{ status: 'archived' as const, tasks: [task('2026-11-18', true)] }
		];
		expect(overallPercent(goals)).toBe(50);
	});

	it('is zero with no active goals', () => {
		expect(overallPercent([])).toBe(0);
		expect(overallPercent([{ status: 'done', tasks: [task('2026-11-18', true)] }])).toBe(0);
	});

	it('counts a goal with no tasks as zero, not as missing', () => {
		const goals = [
			{ status: 'active' as const, tasks: [task('2026-11-18', true)] },
			{ status: 'active' as const, tasks: [] }
		];
		expect(overallPercent(goals)).toBe(50);
	});
});

describe('pace', () => {
	const today = '2026-11-18';

	it('is on track when nothing is overdue', () => {
		expect(pace([task('2026-11-17', true), task(today), task('2026-11-19')], today)).toMatchObject({ state: 'on_track', count: 0, label: 'успеваешь' });
	});

	it('is behind by the overdue tasks, with the right word form', () => {
		expect(pace([task('2026-11-16')], today).label).toBe('отстаёшь на 1 задачу');
		expect(pace([task('2026-11-16'), task('2026-11-17')], today).label).toBe('отстаёшь на 2 задачи');
		const five = Array.from({ length: 5 }, () => task('2026-11-10'));
		expect(pace(five, today)).toMatchObject({ state: 'behind', count: 5, label: 'отстаёшь на 5 задач' });
	});

	it('is ahead by tasks finished before their day', () => {
		expect(pace([task('2026-11-20', true), task('2026-11-21', true)], today)).toMatchObject({ state: 'ahead', count: 2, label: 'опережаешь на 2 задачи' });
	});

	it('lets early work pay off the backlog first', () => {
		expect(pace([task('2026-11-16'), task('2026-11-20', true)], today).state).toBe('on_track');
		expect(pace([task('2026-11-16'), task('2026-11-17'), task('2026-11-20', true)], today)).toMatchObject({ state: 'behind', count: 1 });
	});

	it('ignores today\'s tasks, done or not', () => {
		expect(pace([task(today), task(today, true)], today).state).toBe('on_track');
	});
});

describe('days to a deadline', () => {
	it('counts whole days', () => {
		expect(daysUntil('2026-11-18', '2026-11-25')).toBe(7);
		expect(daysUntil('2026-11-18', '2026-11-18')).toBe(0);
		expect(daysUntil('2026-11-18', '2026-11-15')).toBe(-3);
		expect(daysUntil('2026-12-31', '2027-01-01')).toBe(1);
	});

	it('words it in Russian', () => {
		expect(daysLabel(1)).toBe('осталось 1 день');
		expect(daysLabel(3)).toBe('осталось 3 дня');
		expect(daysLabel(11)).toBe('осталось 11 дней');
		expect(daysLabel(21)).toBe('осталось 21 день');
		expect(daysLabel(0)).toBe('срок сегодня');
		expect(daysLabel(-2)).toBe('срок прошёл 2 дня назад');
	});
});
