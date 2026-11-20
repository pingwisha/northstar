import { describe, expect, it } from 'vitest';
import type { GoalData, TaskData } from './goal-view';
import type { Trial } from './trials';
import { buildWeekly, numbersAreKnown, weeklyContext } from './weekly';

const goal: GoalData = { id: 'g', title: 'Сдать ОГЭ', description: null, deadline: '2026-12-31', status: 'active' };
const task = (planned_for: string, completed_at: string | null): TaskData => ({ goal_id: 'g', title: 't', planned_for, weight: 1, completed_at });
const today = '2026-11-20';

describe('buildWeekly', () => {
	it('counts only the seven days ending today', () => {
		const w = buildWeekly(
			[goal],
			[
				task('2026-11-14', '2026-11-14T10:00:00Z'), // first day of the window, done
				task('2026-11-13', '2026-11-13T10:00:00Z'), // before the window
				task('2026-11-18', null), // overdue
				task('2026-11-20', '2026-11-20T08:00:00Z'),
				task('2026-11-25', '2026-11-19T08:00:00Z') // done early: counts as done this week
			],
			[],
			today
		);
		expect(w.from).toBe('2026-11-14');
		expect(w).toMatchObject({ doneInWeek: 3, planned: 3, plannedDone: 2, overdue: 1 });
	});

	it('ignores finished goals and keeps the goal percent honest', () => {
		const done = { ...goal, id: 'x', status: 'done' as const };
		const w = buildWeekly([goal, done], [task('2026-11-20', '2026-11-20T08:00:00Z'), task('2026-11-21', null)], [], today);
		expect(w.goals).toHaveLength(1);
		expect(w.goals[0].percent).toBe(50);
	});

	it('takes trials of the week and the weak topics from the stored results', () => {
		const t = (id: string, takenOn: string, score: number, weakTopics: string | null): Trial => ({ id, goalId: 'g', takenOn, title: id, score, maxScore: 30, weakTopics });
		const w = buildWeekly([goal], [], [t('old', '2026-10-01', 15, 'Дроби'), t('new', '2026-11-19', 21, 'Дроби, Графики')], today);
		expect(w.trials).toEqual([{ title: 'new', takenOn: '2026-11-19', percent: 70 }]);
		expect(w.weak[0]).toEqual({ topic: 'Дроби', count: 2 });
	});
});

describe('time zones', () => {
	it('counts a tick by the day it was in the persons own zone', () => {
		// 23:30 UTC on the 13th is already the 14th in Moscow, the first day of the window, and still the 13th in New York.
		const tasks = [task('2026-11-14', '2026-11-13T23:30:00Z')];
		expect(buildWeekly([goal], tasks, [], today, 'Europe/Moscow').doneInWeek).toBe(1);
		expect(buildWeekly([goal], tasks, [], today, 'America/New_York').doneInWeek).toBe(0);
	});
});

describe('numbersAreKnown', () => {
	const w = buildWeekly([goal], [task('2026-11-20', '2026-11-20T08:00:00Z')], [], today);
	const context = weeklyContext(w);
	it('accepts a comment that uses only numbers of the report', () => {
		expect(numbersAreKnown('Сделано 1 задача, прогресс 100 процентов, срок 31.12.', context)).toBe(true);
	});
	it('rejects an invented number', () => {
		expect(numbersAreKnown('Сделано 7 задач.', context)).toBe(false);
	});
	it('says so when there are no goals', () => {
		expect(weeklyContext(buildWeekly([], [], [], today))).toContain('Активных целей нет');
	});
});
