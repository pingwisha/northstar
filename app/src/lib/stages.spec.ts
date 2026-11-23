import { describe, expect, it } from 'vitest';
import { buildStages } from './stages';

const stage = (id: string) => ({ id, goal_id: 'g', title: `Этап ${id}`, due_date: '2026-12-01' });
const task = (stage_id: string | null, weight: number, done: boolean) => ({ stage_id, weight, planned_for: '2026-11-20', completed_at: done ? '2026-11-20T10:00:00Z' : null });

describe('buildStages', () => {
	it('counts the weight of checked tasks over the weight of all tasks of the stage', () => {
		const [a, b] = buildStages([stage('a'), stage('b')], [task('a', 1, true), task('a', 3, false), task('b', 2, true)]);
		expect(a).toMatchObject({ total: 2, done: 1, percent: 25 });
		expect(b).toMatchObject({ total: 1, done: 1, percent: 100 });
	});

	it('keeps the order of the stages given', () => {
		expect(buildStages([stage('b'), stage('a')], [task('a', 1, false), task('b', 1, false)]).map((s) => s.id)).toEqual(['b', 'a']);
	});

	it('leaves out a stage that has no tasks, and ignores tasks without a stage', () => {
		const result = buildStages([stage('a'), stage('empty')], [task('a', 1, true), task(null, 1, false)]);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ id: 'a', total: 1, percent: 100 });
	});

	it('gives 100 only when everything in the stage is done', () => {
		expect(buildStages([stage('a')], [task('a', 1, true), task('a', 1, true), task('a', 1, false)])[0].percent).toBe(66);
	});
});
