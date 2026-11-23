// Progress of each stage of a plan. A stage is counted like a goal: the weight of its checked
// tasks over the weight of all its tasks. Pure: no database, no clock.
import { groupPercent } from './progress';

export interface StageInput {
	id: string;
	goal_id: string;
	title: string;
	due_date: string | null;
}

export interface StageTask {
	stage_id: string | null;
	weight: number;
	planned_for: string;
	completed_at: string | null;
}

export interface StageView {
	id: string;
	title: string;
	dueDate: string | null;
	total: number;
	done: number;
	percent: number;
}

// Stages of one goal in the order given. A stage with no tasks (all of them deleted) is left out,
// and tasks added by hand belong to no stage, so they are in the goal's percent but in no stage's.
export function buildStages(stages: StageInput[], tasks: StageTask[]): StageView[] {
	return stages.flatMap((s) => {
		const own = tasks.filter((t) => t.stage_id === s.id);
		if (own.length === 0) return [];
		return [
			{
				id: s.id,
				title: s.title,
				dueDate: s.due_date,
				total: own.length,
				done: own.filter((t) => t.completed_at !== null).length,
				percent: groupPercent(own.map((t) => ({ plannedFor: t.planned_for, weight: t.weight, completedAt: t.completed_at })))
			}
		];
	});
}
