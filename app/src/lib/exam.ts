// Exam mode: what is left before a deadline, week by week, and which weak topics still need a review.
// Pure: no database, no clock.
import type { GoalData, TaskData } from './goal-view';
import { daysLabel, daysUntil } from './progress';
import { spreadDates } from './plan';
import { summarizeTrials, type Trial } from './trials';

// A goal is in exam mode when its deadline is this near.
export const EXAM_DAYS = 60;
export const MAX_REVIEWS = 5;
export const REVIEW_PREFIX = 'Повторить: ';
const WEEKS_SHOWN = 4;

const addDays = (iso: string, n: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export interface ExamWeek {
	label: string;
	from: string;
	to: string;
	planned: number;
	done: number;
}

export interface ExamGoal {
	id: string;
	title: string;
	deadline: string;
	daysLeft: number;
	daysLabel: string;
	exam: boolean;
	open: number;
	overdue: number;
	// Open tasks that fall on each remaining day on average, rounded up; null when no days are left.
	perDay: number | null;
	// The last weeks before the deadline, nearest to the deadline first.
	weeks: ExamWeek[];
	// Weak topics that have no open review task yet.
	toReview: string[];
	// Review tasks already planned and not done.
	reviewing: string[];
}

const weekLabel = (k: number): string => (k === 0 ? 'Последняя неделя перед сроком' : `За ${k + 1} нед. до срока`);

export function buildExam(goals: GoalData[], tasks: TaskData[], trials: Trial[], today: string): ExamGoal[] {
	return goals
		.filter((g) => g.status === 'active')
		.sort((a, b) => a.deadline.localeCompare(b.deadline))
		.map((g): ExamGoal => {
			const own = tasks.filter((t) => t.goal_id === g.id);
			const open = own.filter((t) => t.completed_at === null);
			const daysLeft = daysUntil(today, g.deadline);
			const weeks: ExamWeek[] = [];
			for (let k = 0; k < WEEKS_SHOWN; k++) {
				const to = addDays(g.deadline, -7 * k);
				const from = addDays(to, -6);
				if (to < today) break;
				const inWeek = own.filter((t) => t.planned_for >= from && t.planned_for <= to);
				weeks.push({ label: weekLabel(k), from, to, planned: inWeek.length, done: inWeek.filter((t) => t.completed_at !== null).length });
			}
			const reviewing = open.filter((t) => t.title.startsWith(REVIEW_PREFIX)).map((t) => t.title.slice(REVIEW_PREFIX.length).trim());
			const reviewingKeys = new Set(reviewing.map((t) => t.toLowerCase()));
			const weak = summarizeTrials(trials.filter((t) => t.goalId === g.id)).weak;
			return {
				id: g.id,
				title: g.title,
				deadline: g.deadline,
				daysLeft,
				daysLabel: daysLabel(daysLeft),
				exam: daysLeft >= 0 && daysLeft <= EXAM_DAYS,
				open: open.length,
				overdue: open.filter((t) => t.planned_for < today).length,
				perDay: daysLeft >= 0 ? Math.ceil(open.length / Math.max(1, daysLeft)) : null,
				weeks,
				toReview: weak.map((w) => w.topic).filter((t) => !reviewingKeys.has(t.toLowerCase())).slice(0, MAX_REVIEWS),
				reviewing
			};
		});
}

// One review task per topic, spread from today to the deadline (the last day stays free).
export function reviewPlan(topics: string[], today: string, deadline: string): { title: string; day: string }[] {
	const days = spreadDates(topics.map(() => 1), today, deadline);
	return topics.map((topic, i) => ({ title: `${REVIEW_PREFIX}${topic}`, day: days[i] }));
}
