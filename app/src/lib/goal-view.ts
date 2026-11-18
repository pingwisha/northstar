// What a goal card shows, built from the stored rows. Pure: no database, no clock.
import { daysLabel, daysUntil, groupPercent, overallPercent, pace, type Pace, type TaskInput } from './progress';

export interface GoalData {
	id: string;
	title: string;
	description: string | null;
	deadline: string;
	status: 'active' | 'done' | 'archived';
}

export interface TaskData {
	goal_id: string;
	title: string;
	planned_for: string;
	weight: number;
	completed_at: string | null;
}

export interface GoalCard {
	id: string;
	title: string;
	description: string | null;
	deadline: string;
	status: GoalData['status'];
	percent: number;
	pace: Pace;
	daysLeft: number;
	daysLabel: string;
	// The first task not done yet, or null when there is no plan or it is finished.
	nextStep: { title: string; plannedFor: string } | null;
	taskCount: number;
}

const toInput = (t: TaskData): TaskInput => ({ plannedFor: t.planned_for, weight: t.weight, completedAt: t.completed_at });

export function buildCards(goals: GoalData[], tasks: TaskData[], today: string): { cards: GoalCard[]; overall: number } {
	const byGoal = new Map<string, TaskData[]>();
	for (const t of tasks) byGoal.set(t.goal_id, [...(byGoal.get(t.goal_id) ?? []), t]);

	const cards = goals.map((g): GoalCard => {
		const own = byGoal.get(g.id) ?? [];
		const inputs = own.map(toInput);
		const next = own.find((t) => t.completed_at === null) ?? null;
		const daysLeft = daysUntil(today, g.deadline);
		return {
			id: g.id,
			title: g.title,
			description: g.description,
			deadline: g.deadline,
			status: g.status,
			percent: groupPercent(inputs),
			pace: pace(inputs, today),
			daysLeft,
			daysLabel: daysLabel(daysLeft),
			nextStep: next ? { title: next.title, plannedFor: next.planned_for } : null,
			taskCount: own.length
		};
	});

	const overall = overallPercent(goals.map((g) => ({ status: g.status, tasks: (byGoal.get(g.id) ?? []).map(toInput) })));
	return { cards, overall };
}
