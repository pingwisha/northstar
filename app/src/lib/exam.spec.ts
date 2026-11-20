import { describe, expect, it } from 'vitest';
import type { GoalData, TaskData } from './goal-view';
import { buildExam, reviewPlan } from './exam';
import type { Trial } from './trials';

const today = '2026-11-20';
const goal = (deadline: string, id = 'g'): GoalData => ({ id, title: 'ОГЭ', description: null, deadline, status: 'active' });
const task = (planned_for: string, done = false, title = 't'): TaskData => ({ goal_id: 'g', title, planned_for, weight: 1, completed_at: done ? `${planned_for}T08:00:00Z` : null });
const trial = (id: string, weakTopics: string): Trial => ({ id, goalId: 'g', takenOn: '2026-11-10', title: id, score: 10, maxScore: 30, weakTopics });

describe('buildExam', () => {
	it('is exam mode only within sixty days of the deadline', () => {
		expect(buildExam([goal('2026-12-20')], [], [], today)[0].exam).toBe(true);
		expect(buildExam([goal('2027-03-01')], [], [], today)[0].exam).toBe(false);
		expect(buildExam([goal('2026-11-20')], [], [], today)[0]).toMatchObject({ exam: true, daysLeft: 0 });
	});

	it('counts the last weeks back from the deadline', () => {
		const e = buildExam([goal('2026-12-04')], [task('2026-12-04'), task('2026-12-02', true), task('2026-11-27'), task('2026-11-21')], [], today)[0];
		expect(e.weeks[0]).toMatchObject({ from: '2026-11-28', to: '2026-12-04', planned: 2, done: 1 });
		expect(e.weeks[1]).toMatchObject({ from: '2026-11-21', to: '2026-11-27', planned: 2, done: 0 });
		// The week that ends today is still shown; the one before it, already over, is not.
		expect(e.weeks.map((w) => w.to)).toEqual(['2026-12-04', '2026-11-27', '2026-11-20']);
	});

	it('says how many open tasks fall on a day, rounded up, and counts the overdue', () => {
		const e = buildExam([goal('2026-11-30')], [task('2026-11-18'), task('2026-11-25'), task('2026-11-26'), task('2026-11-27', true)], [], today)[0];
		expect(e).toMatchObject({ open: 3, overdue: 1, daysLeft: 10, perDay: 1 });
	});

	it('offers weak topics for review, except those already planned', () => {
		const e = buildExam([goal('2026-12-20')], [task('2026-11-25', false, 'Повторить: дроби')], [trial('a', 'Дроби, Графики'), trial('b', 'Графики')], today)[0];
		expect(e.toReview).toEqual(['Графики']);
		expect(e.reviewing).toEqual(['дроби']);
	});

	it('leaves finished goals out', () => {
		expect(buildExam([{ ...goal('2026-12-20'), status: 'done' }], [], [], today)).toEqual([]);
	});
});

describe('reviewPlan', () => {
	it('spreads review tasks before the deadline', () => {
		const plan = reviewPlan(['Дроби', 'Графики'], today, '2026-12-20');
		expect(plan.map((p) => p.title)).toEqual(['Повторить: Дроби', 'Повторить: Графики']);
		expect(plan[0].day >= today && plan[1].day < '2026-12-20' && plan[0].day <= plan[1].day).toBe(true);
	});
});
