// Progress rules (docs/stage-1.md). Pure functions, no database and no clock:
// callers pass today's date as YYYY-MM-DD.
//
// - A task is 0 until it is checked, then 100.
// - A stage or a goal is the checked weight divided by the total weight.
// - Overall progress is the average over active goals.
// - Anything unchecked counts as zero, and a goal with no tasks is 0.
// - A percent is rounded down, so 100 appears only when everything is done.

export interface TaskInput {
	plannedFor: string;
	weight: number;
	completedAt: string | null;
}

export interface GoalInput {
	status: 'active' | 'done' | 'archived';
	tasks: TaskInput[];
}

const isDone = (t: TaskInput): boolean => t.completedAt !== null;

// A share between 0 and 1: checked weight over total weight.
export function share(tasks: TaskInput[]): number {
	const total = tasks.reduce((sum, t) => sum + t.weight, 0);
	if (total <= 0) return 0;
	return tasks.filter(isDone).reduce((sum, t) => sum + t.weight, 0) / total;
}

// Floor with a tolerance for floating point, so 0.29 * 100 is not read as 28.
export function toPercent(fraction: number): number {
	return Math.min(100, Math.max(0, Math.floor(fraction * 100 + 1e-9)));
}

export const taskPercent = (task: TaskInput): number => (isDone(task) ? 100 : 0);

// A stage and a goal use the same rule; both take the tasks they contain.
export const groupPercent = (tasks: TaskInput[]): number => toPercent(share(tasks));

export function overallPercent(goals: GoalInput[]): number {
	const active = goals.filter((g) => g.status === 'active');
	if (active.length === 0) return 0;
	return toPercent(active.reduce((sum, g) => sum + share(g.tasks), 0) / active.length);
}

export type PaceState = 'on_track' | 'behind' | 'ahead';

export interface Pace {
	state: PaceState;
	// How many tasks behind or ahead; 0 when on track.
	count: number;
	label: string;
}

const plural = (n: number, one: string, few: string, many: string): string => {
	const m10 = n % 10;
	const m100 = n % 100;
	if (m10 === 1 && m100 !== 11) return one;
	if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
	return many;
};

const tasksWord = (n: number): string => `${n} ${plural(n, 'задачу', 'задачи', 'задач')}`;

// Behind: tasks planned before today that are not done. Ahead: tasks planned
// after today that are already done. Today's own tasks count neither way, so the
// verdict does not flip as the day goes by. Surplus pays off the backlog first.
export function pace(tasks: TaskInput[], today: string): Pace {
	const overdue = tasks.filter((t) => t.plannedFor < today && !isDone(t)).length;
	const early = tasks.filter((t) => t.plannedFor > today && isDone(t)).length;
	const net = early - overdue;
	if (net < 0) return { state: 'behind', count: -net, label: `отстаёшь на ${tasksWord(-net)}` };
	if (net > 0) return { state: 'ahead', count: net, label: `опережаешь на ${tasksWord(net)}` };
	return { state: 'on_track', count: 0, label: 'успеваешь' };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from today to a date (negative when the date has passed).
export function daysUntil(today: string, date: string): number {
	return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

export function daysLabel(days: number): string {
	if (days === 0) return 'срок сегодня';
	if (days < 0) return `срок прошёл ${-days} ${plural(-days, 'день', 'дня', 'дней')} назад`;
	return `осталось ${days} ${plural(days, 'день', 'дня', 'дней')}`;
}
