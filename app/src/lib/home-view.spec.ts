import { describe, expect, it } from 'vitest';
import type { GoalData } from './goal-view';
import { buildHome, type HomeTaskData } from './home-view';

const today = '2026-11-18';
const goal = (id: string, deadline = '2026-12-18', status: GoalData['status'] = 'active'): GoalData => ({ id, title: `Цель ${id}`, description: null, deadline, status });
const task = (id: string, goal_id: string, planned_for: string, done = false): HomeTaskData => ({
	id,
	goal_id,
	title: `Задача ${id}`,
	planned_for,
	weight: 1,
	completed_at: done ? '2026-11-17T10:00:00Z' : null
});

describe('buildHome', () => {
	it('is empty and 0% without goals', () => {
		expect(buildHome([], [], today)).toMatchObject({ overall: 0, week: null, today: [], overdue: [], nearest: null, activeGoals: 0 });
	});

	it('lists today\'s tasks, done or not, and past tasks that are still open', () => {
		const home = buildHome([goal('a')], [task('1', 'a', today), task('2', 'a', today, true), task('3', 'a', '2026-11-16'), task('4', 'a', '2026-11-15', true), task('5', 'a', '2026-11-20')], today);
		expect(home.today.map((t) => [t.id, t.done])).toEqual([['1', false], ['2', true]]);
		expect(home.overdue.map((t) => t.id)).toEqual(['3']);
	});

	it('takes the nearest deadline among active goals only', () => {
		const home = buildHome([goal('a', '2026-12-01'), goal('b', '2026-11-20'), goal('c', '2026-11-19', 'done')], [], today);
		expect(home.nearest).toEqual({ goalTitle: 'Цель b', deadline: '2026-11-20', daysLabel: 'осталось 2 дня' });
	});

	it('ignores tasks of finished goals', () => {
		const home = buildHome([goal('a'), goal('b', '2026-12-18', 'done')], [task('1', 'b', today), task('2', 'b', '2026-11-01')], today);
		expect(home.today).toEqual([]);
		expect(home.overdue).toEqual([]);
		expect(home.week).toBeNull();
	});

	it('averages the goals and reports the pace across all of them', () => {
		const home = buildHome([goal('a'), goal('b')], [task('1', 'a', today, true), task('2', 'b', '2026-11-10')], today);
		expect(home.overall).toBe(50);
		expect(home.week).toMatchObject({ state: 'behind', count: 1 });
	});

	it('says behind when more tasks are overdue than done early', () => {
		const home = buildHome([goal('a')], [task('1', 'a', '2026-11-10'), task('2', 'a', '2026-11-11')], today);
		expect(home.week).toMatchObject({ state: 'behind', count: 2 });
	});
});
