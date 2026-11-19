// What the home page «Сегодня» shows, built from the stored rows. Pure: no database, no clock.
import { daysLabel, daysUntil, overallPercent, pace, type Pace, type TaskInput } from './progress';
import type { GoalData } from './goal-view';

export interface HomeTaskData {
	id: string;
	goal_id: string;
	title: string;
	planned_for: string;
	weight: number;
	completed_at: string | null;
}

export interface MaterialData {
	task_id: string;
	kind: 'article' | 'video' | 'trainer' | 'checklist' | 'other';
	title: string;
	url: string | null;
	source: string | null;
}

export interface HomeTask {
	id: string;
	title: string;
	goalTitle: string;
	plannedFor: string;
	done: boolean;
	materials: { kind: MaterialData['kind']; title: string; url: string | null; hint: string | null }[];
}

export interface Home {
	overall: number;
	// Pace over every task of every active goal; null when there are no tasks to judge by.
	week: Pace | null;
	today: HomeTask[];
	overdue: HomeTask[];
	nearest: { goalTitle: string; deadline: string; daysLabel: string } | null;
	activeGoals: number;
	// The goals a task can be added to.
	goals: { id: string; title: string; deadline: string }[];
}

const toInput = (t: HomeTaskData): TaskInput => ({ plannedFor: t.planned_for, weight: t.weight, completedAt: t.completed_at });

export function buildHome(goals: GoalData[], tasks: HomeTaskData[], today: string, materials: MaterialData[] = []): Home {
	const active = goals.filter((g) => g.status === 'active');
	const titles = new Map(active.map((g) => [g.id, g.title]));
	const mine = tasks.filter((t) => titles.has(t.goal_id));
	const view = (t: HomeTaskData): HomeTask => ({ id: t.id, title: t.title, goalTitle: titles.get(t.goal_id)!, plannedFor: t.planned_for, done: t.completed_at !== null,
		materials: materials.filter((m) => m.task_id === t.id).map((m) => ({ kind: m.kind, title: m.title, url: m.url, hint: m.source }))
	});

	const nearest = [...active].sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
	return {
		overall: overallPercent(active.map((g) => ({ status: g.status, tasks: mine.filter((t) => t.goal_id === g.id).map(toInput) }))),
		week: mine.length ? pace(mine.map(toInput), today) : null,
		today: mine.filter((t) => t.planned_for === today).map(view),
		overdue: mine.filter((t) => t.planned_for < today && t.completed_at === null).map(view),
		nearest: nearest ? { goalTitle: nearest.title, deadline: nearest.deadline, daysLabel: daysLabel(daysUntil(today, nearest.deadline)) } : null,
		activeGoals: active.length,
		goals: active.map((g) => ({ id: g.id, title: g.title, deadline: g.deadline }))
	};
}
