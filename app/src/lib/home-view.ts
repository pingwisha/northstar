// What the home page «Сегодня» shows, built from the stored rows. Pure: no database, no clock.
import { daysLabel, daysUntil, groupPercent, overallPercent, pace, type Pace, type TaskInput } from './progress';
import type { GoalData } from './goal-view';
import { streakDays } from './streak';
import { weekActivity, type DayActivity } from './activity';
import { colorOf, iconOf } from './goal-look';

export interface HomeTaskData {
	id: string;
	goal_id: string;
	title: string;
	planned_for: string;
	weight: number;
	completed_at: string | null;
	note?: string | null;
}

export interface MaterialData {
	id?: string;
	own?: number;
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
	goalColor: string;
	goalIcon: string;
	plannedFor: string;
	done: boolean;
	note: string | null;
	materials: { id: string; own: boolean; kind: MaterialData['kind']; title: string; url: string | null; hint: string | null }[];
}

export interface Home {
	overall: number;
	// Pace over every task of every active goal; null when there are no tasks to judge by.
	week: Pace | null;
	today: HomeTask[];
	overdue: HomeTask[];
	nearest: { goalTitle: string; deadline: string; daysLabel: string } | null;
	activeGoals: number;
	// Days in a row with at least one task checked.
	streak: number;
	// The goals a task can be added to.
	goals: { id: string; title: string; deadline: string; color: string; icon: string; percent: number; daysLabel: string }[];
	// Checks per day over the last seven days.
	week7: DayActivity[];
}

const toInput = (t: HomeTaskData): TaskInput => ({ plannedFor: t.planned_for, weight: t.weight, completedAt: t.completed_at });

export function buildHome(goals: GoalData[], tasks: HomeTaskData[], today: string, materials: MaterialData[] = [], timeZone?: string): Home {
	const active = goals.filter((g) => g.status === 'active');
	const titles = new Map(active.map((g) => [g.id, g.title]));
	const looks = new Map(active.map((g) => [g.id, { color: colorOf(g.color), icon: iconOf(g.icon) }]));
	const mine = tasks.filter((t) => titles.has(t.goal_id));
	const view = (t: HomeTaskData): HomeTask => ({ id: t.id, title: t.title, goalTitle: titles.get(t.goal_id)!, goalColor: looks.get(t.goal_id)!.color, goalIcon: looks.get(t.goal_id)!.icon, plannedFor: t.planned_for, done: t.completed_at !== null,
		note: t.note ?? null,
		materials: materials.filter((m) => m.task_id === t.id).map((m) => ({ id: m.id ?? '', own: m.own === 1, kind: m.kind, title: m.title, url: m.url, hint: m.source }))
	});

	const nearest = [...active].sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
	return {
		overall: overallPercent(active.map((g) => ({ status: g.status, tasks: mine.filter((t) => t.goal_id === g.id).map(toInput) }))),
		week: mine.length ? pace(mine.map(toInput), today) : null,
		today: mine.filter((t) => t.planned_for === today).map(view),
		overdue: mine.filter((t) => t.planned_for < today && t.completed_at === null).map(view),
		nearest: nearest ? { goalTitle: nearest.title, deadline: nearest.deadline, daysLabel: daysLabel(daysUntil(today, nearest.deadline)) } : null,
		activeGoals: active.length,
		streak: streakDays(tasks.map((t) => t.completed_at), today, timeZone),
		goals: active.map((g) => ({ id: g.id, title: g.title, deadline: g.deadline, color: colorOf(g.color), icon: iconOf(g.icon), percent: groupPercent(mine.filter((t) => t.goal_id === g.id).map(toInput)), daysLabel: daysLabel(daysUntil(today, g.deadline)) })),
		week7: weekActivity(tasks.map((t) => t.completed_at), today, timeZone)
	};
}
