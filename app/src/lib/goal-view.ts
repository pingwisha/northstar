// What a goal card shows, built from the stored rows. Pure: no database, no clock.
import { colorOf, iconOf, isGoalIcon } from './goal-look';
import { daysLabel, daysUntil, groupPercent, overallPercent, pace, type Pace, type TaskInput } from './progress';

export interface GoalData {
	id: string;
	title: string;
	description: string | null;
	deadline: string;
	start_date?: string;
	created_at?: string;
	status: 'active' | 'done' | 'archived';
	study_days?: number;
	color?: string;
	icon?: string;
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
	startDate: string;
	createdAt: string;
	status: GoalData['status'];
	studyDays: number;
	color: string;
	icon: string;
	iconKey: string;
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
			startDate: g.start_date ?? '',
			createdAt: g.created_at ?? '',
			status: g.status,
			studyDays: g.study_days ?? 127,
			color: colorOf(g.color),
			icon: iconOf(g.icon),
			iconKey: isGoalIcon(g.icon) ? g.icon : 'target',
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

export const SORT_KEYS = ['newest', 'oldest', 'title', 'deadline', 'start', 'progress', 'behind'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const SORT_LABELS: Record<SortKey, string> = {
	newest: 'Сначала новые',
	oldest: 'Сначала старые',
	title: 'По алфавиту',
	deadline: 'По дате окончания',
	start: 'По дате начала',
	progress: 'По прогрессу (больше сначала)',
	behind: 'Сначала отстающие'
};
export const isSortKey = (v: unknown): v is SortKey => typeof v === 'string' && (SORT_KEYS as readonly string[]).includes(v);

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// A sorted copy; ties keep the order the cards came in.
export function sortCards<T extends Pick<GoalCard, 'title' | 'deadline' | 'startDate' | 'createdAt' | 'percent' | 'daysLeft'>>(cards: readonly T[], key: SortKey): T[] {
	const by: Record<SortKey, (a: T, b: T) => number> = {
		newest: (a, b) => cmp(b.createdAt, a.createdAt),
		oldest: (a, b) => cmp(a.createdAt, b.createdAt),
		title: (a, b) => a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' }),
		deadline: (a, b) => cmp(a.deadline, b.deadline),
		start: (a, b) => cmp(a.startDate, b.startDate),
		progress: (a, b) => b.percent - a.percent,
		behind: (a, b) => a.percent - b.percent
	};
	return cards.map((c, i) => ({ c, i })).sort((x, y) => by[key](x.c, y.c) || x.i - y.i).map((x) => x.c);
}
