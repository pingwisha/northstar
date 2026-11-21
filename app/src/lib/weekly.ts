// The weekly report. Every number comes from the stored rows; the AI only comments on them.
// Pure: no database, no clock.
import type { GoalData, TaskData } from './goal-view';
import { formatDate, todayIso } from './goals';
import { daysLabel, daysUntil, groupPercent, pace } from './progress';
import { percentOf, summarizeTrials, type Trial } from './trials';

type TaskRow = TaskData & { id?: string };

const addDays = (iso: string, n: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export interface WeeklyGoal {
	title: string;
	percent: number;
	paceLabel: string;
	daysLabel: string;
	deadline: string;
	// Tasks planned on the seven days of the report, and how many of those are done.
	planned: number;
	plannedDone: number;
	// All tasks ticked off during the seven days, wherever they were planned.
	doneInWeek: number;
	overdue: number;
}

export interface Weekly {
	from: string;
	to: string;
	doneInWeek: number;
	planned: number;
	plannedDone: number;
	overdue: number;
	goals: WeeklyGoal[];
	trials: { title: string; takenOn: string; percent: number }[];
	weak: { topic: string; count: number }[];
}

// A task is ticked off at a moment (UTC); the day it counts for is that moment in the person's zone.
export function buildWeekly(goals: GoalData[], tasks: TaskRow[], trials: Trial[], today: string, timeZone?: string): Weekly {
	const dayOf = (moment: string): string => todayIso(new Date(moment), timeZone);
	const from = addDays(today, -6);
	const active = goals.filter((g) => g.status === 'active');
	const rows = active.map((g): WeeklyGoal => {
		const own = tasks.filter((t) => t.goal_id === g.id);
		const inputs = own.map((t) => ({ plannedFor: t.planned_for, weight: t.weight, completedAt: t.completed_at }));
		const week = own.filter((t) => t.planned_for >= from && t.planned_for <= today);
		return {
			title: g.title,
			percent: groupPercent(inputs),
			paceLabel: pace(inputs, today).label,
			daysLabel: daysLabel(daysUntil(today, g.deadline)),
			deadline: g.deadline,
			planned: week.length,
			plannedDone: week.filter((t) => t.completed_at !== null).length,
			doneInWeek: own.filter((t) => t.completed_at !== null && dayOf(t.completed_at) >= from && dayOf(t.completed_at) <= today).length,
			overdue: own.filter((t) => t.completed_at === null && t.planned_for < today).length
		};
	});
	const activeIds = new Set(active.map((g) => g.id));
	const mine = trials.filter((t) => activeIds.has(t.goalId));
	return {
		from,
		to: today,
		doneInWeek: rows.reduce((s, g) => s + g.doneInWeek, 0),
		planned: rows.reduce((s, g) => s + g.planned, 0),
		plannedDone: rows.reduce((s, g) => s + g.plannedDone, 0),
		overdue: rows.reduce((s, g) => s + g.overdue, 0),
		goals: rows,
		trials: mine.filter((t) => t.takenOn >= from && t.takenOn <= today).map((t) => ({ title: t.title, takenOn: t.takenOn, percent: percentOf(t) })),
		weak: summarizeTrials(mine).weak.slice(0, 3)
	};
}

// The facts handed to the AI. Only these numbers may appear in its comment.
export function weeklyContext(w: Weekly): string {
	const lines = [`Отчёт за неделю с ${formatDate(w.from)} по ${formatDate(w.to)}.`];
	if (w.goals.length === 0) return `${lines[0]}\nАктивных целей нет.`;
	lines.push(`Отмечено сделанными задач: ${w.doneInWeek}. Было запланировано на эту неделю: ${w.planned}, из них сделано ${w.plannedDone}. Всего просрочено: ${w.overdue}.`);
	for (const g of w.goals) {
		lines.push(`Цель: ${g.title}. Прогресс ${g.percent} процентов, ${g.paceLabel}. Срок ${formatDate(g.deadline)}, ${g.daysLabel}. За неделю сделано ${g.doneInWeek}, просрочено ${g.overdue}.`);
	}
	for (const t of w.trials) lines.push(`Пробник ${t.title}, ${formatDate(t.takenOn)}: ${t.percent} процентов.`);
	if (w.weak.length) lines.push(`Слабые темы: ${w.weak.map((x) => `${x.topic} (отмечена ${x.count})`).join(', ')}.`);
	lines.push(
		'',
		'Напиши короткий итог недели: четыре или пять предложений. Что получилось, где отставание, что подтянуть на следующей неделе.',
		'Используй только числа из этого отчёта, цифрами, и ничего не пересчитывай и не округляй. Не придумывай задачи, темы и факты, которых нет выше.'
	);
	return lines.join('\n');
}

// A number the AI wrote that is not in the facts it was given means it made one up.
export function numbersAreKnown(answer: string, context: string): boolean {
	const known = new Set(context.match(/\d+/g) ?? []);
	return (answer.match(/\d+/g) ?? []).every((n) => known.has(n));
}

// The report as plain text, to paste into a message. Built from the same numbers as the page.
export function reportText(w: Weekly): string {
	const lines = [`Недельный отчёт, ${formatDate(w.from)} – ${formatDate(w.to)}`, ''];
	if (w.goals.length === 0) return `${lines[0]}\n\nАктивных целей нет.`;
	lines.push(`Сделано за неделю: ${w.doneInWeek}`, `Задач недели сделано: ${w.plannedDone} из ${w.planned}`, `Просрочено: ${w.overdue}`, '');
	for (const g of w.goals) {
		lines.push(`${g.title}: прогресс ${g.percent}%, ${g.paceLabel}. Срок ${formatDate(g.deadline)}, ${g.daysLabel}.`);
		lines.push(`  За неделю сделано: ${g.doneInWeek}. Просрочено: ${g.overdue}.`);
	}
	if (w.trials.length) {
		lines.push('', 'Пробники:');
		for (const t of w.trials) lines.push(`  ${formatDate(t.takenOn)}: ${t.title}, ${t.percent}%`);
	}
	if (w.weak.length) lines.push('', `Чаще всего слабые темы: ${w.weak.map((x) => x.topic).join(', ')}.`);
	return lines.join('\n');
}
