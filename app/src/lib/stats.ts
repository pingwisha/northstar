// The four numbers of the outcome brief plan-from-goal-and-deadline (docs/meters/).
// Pure: rows in, counts out. Only counts leave this file, never names, emails, ids or goal text.
import { groupPercent } from './progress';

// Readings start here; earlier people and goals belong to the time before the brief.
export const WINDOW_START = '2026-11-23';

const DAY = 86_400_000;

export interface StatUser {
	id: string;
	createdAt: string;
}
export interface StatGoal {
	id: string;
	userId: string;
	createdAt: string;
	deadline: string;
}
export interface StatTask {
	goalId: string;
	userId: string;
	weight: number;
	completedAt: string | null;
}

export interface Ratio {
	count: number;
	of: number;
}
export interface Stats {
	since: string;
	// Goals created in the window that have at least one task, out of all goals created in it.
	planAccept: Ratio;
	// People who signed up in the window and checked a task in their first 3 days, out of those people.
	firstThreeDays: Ratio;
	// Of the people who signed up in the window at least 7 days ago, those who checked a task between day 7 and day 10.
	daySevenReturn: Ratio;
	// Average honest percent of goals past the middle of their term (that have a plan), and how many such goals.
	midpoint: { percent: number | null; goals: number };
}

const ms = (iso: string): number => Date.parse(iso);
const dayMs = (date: string): number => Date.parse(`${date.slice(0, 10)}T00:00:00Z`);

export function computeStats(users: StatUser[], goals: StatGoal[], tasks: StatTask[], today: string): Stats {
	const inWindow = (iso: string) => iso.slice(0, 10) >= WINDOW_START;
	const newUsers = users.filter((u) => inWindow(u.createdAt));
	const newGoals = goals.filter((g) => inWindow(g.createdAt));
	const withTasks = new Set(tasks.map((t) => t.goalId));

	const doneBy = new Map<string, number[]>();
	for (const t of tasks) {
		if (t.completedAt === null) continue;
		doneBy.set(t.userId, [...(doneBy.get(t.userId) ?? []), ms(t.completedAt)]);
	}
	const checkedBetween = (u: StatUser, fromDay: number, toDay: number) => {
		const start = ms(u.createdAt);
		return (doneBy.get(u.id) ?? []).some((t) => t >= start + fromDay * DAY && t < start + toDay * DAY);
	};

	const old = newUsers.filter((u) => dayMs(today) - dayMs(u.createdAt) >= 7 * DAY);

	const past = newGoals.filter((g) => withTasks.has(g.id) && dayMs(today) >= (dayMs(g.createdAt) + dayMs(g.deadline)) / 2 && dayMs(g.deadline) > dayMs(g.createdAt));
	const percents = past.map((g) => groupPercent(tasks.filter((t) => t.goalId === g.id).map((t) => ({ plannedFor: '', weight: t.weight, completedAt: t.completedAt }))));

	return {
		since: WINDOW_START,
		planAccept: { count: newGoals.filter((g) => withTasks.has(g.id)).length, of: newGoals.length },
		firstThreeDays: { count: newUsers.filter((u) => checkedBetween(u, 0, 3)).length, of: newUsers.length },
		daySevenReturn: { count: old.filter((u) => checkedBetween(u, 7, 10)).length, of: old.length },
		midpoint: { percent: percents.length > 0 ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null, goals: past.length }
	};
}
