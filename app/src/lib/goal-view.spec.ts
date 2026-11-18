import { describe, expect, it } from 'vitest';
import { buildCards, type GoalData, type TaskData } from './goal-view';

const today = '2026-11-18';
const goal = (id: string, status: GoalData['status'] = 'active', deadline = '2026-12-18'): GoalData => ({ id, title: `Цель ${id}`, description: null, deadline, status });
const task = (goal_id: string, planned_for: string, done = false, title = `Задача ${planned_for}`): TaskData => ({
	goal_id,
	title,
	planned_for,
	weight: 1,
	completed_at: done ? '2026-11-17T10:00:00Z' : null
});

describe('buildCards', () => {
	it('shows a goal without a plan as 0% with no next step', () => {
		const { cards, overall } = buildCards([goal('a')], [], today);
		expect(cards[0]).toMatchObject({ percent: 0, nextStep: null, taskCount: 0, daysLeft: 30, daysLabel: 'осталось 30 дней' });
		expect(overall).toBe(0);
	});

	it('takes the first undone task as the next step and counts only the goal\'s own tasks', () => {
		const tasks = [task('a', '2026-11-17', true), task('a', '2026-11-19', false, 'Тема 2'), task('a', '2026-11-20'), task('b', '2026-11-18', true)];
		const { cards } = buildCards([goal('a'), goal('b')], tasks, today);
		expect(cards[0]).toMatchObject({ percent: 33, taskCount: 3, nextStep: { title: 'Тема 2', plannedFor: '2026-11-19' } });
		expect(cards[1]).toMatchObject({ percent: 100, nextStep: null });
	});

	it('carries the pace of each goal separately', () => {
		const { cards } = buildCards([goal('a'), goal('b')], [task('a', '2026-11-10'), task('b', '2026-11-25')], today);
		expect(cards[0].pace.label).toBe('отстаёшь на 1 задачу');
		expect(cards[1].pace.label).toBe('успеваешь');
	});

	it('averages only active goals into the overall percent', () => {
		const tasks = [task('a', '2026-11-17', true), task('b', '2026-11-17'), task('c', '2026-11-17', true)];
		const { overall } = buildCards([goal('a'), goal('b'), goal('c', 'done')], tasks, today);
		expect(overall).toBe(50);
	});
});
