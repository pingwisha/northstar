// Data access for D1. User-owned data is reachable only through scoped(), which
// fixes the user id once, from the verified session. findOrCreateUser and the
// invite helpers are the exceptions: they run before a user id exists, or on
// behalf of the owner, whose role the caller has already checked.

import type { ScheduledStage } from '$lib/plan';

export type Role = 'owner' | 'member';

export interface User {
	id: string;
	email: string;
	nick: string | null;
	role: Role;
	created_at: string;
}

export interface Invite {
	email: string;
	invited_by: string | null;
	created_at: string;
}

export type GoalStatus = 'active' | 'done' | 'archived';

export interface GoalRow {
	id: string;
	title: string;
	description: string | null;
	start_date: string;
	deadline: string;
	status: GoalStatus;
	created_at: string;
}

export interface GoalTaskRow {
	id: string;
	goal_id: string;
	title: string;
	planned_for: string;
	weight: number;
	completed_at: string | null;
}

export type SavePlanResult = 'saved' | 'not_found' | 'has_plan';

const normalize = (email: string): string => email.trim().toLowerCase();

export async function findOrCreateUser(db: D1Database, verifiedEmail: string, role: Role = 'member'): Promise<User> {
	const email = normalize(verifiedEmail);
	await db
		.prepare('INSERT INTO users (id, email, role) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET role = excluded.role')
		.bind(crypto.randomUUID(), email, role)
		.run();
	const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
	if (!user) throw new Error('user row missing after insert');
	return user;
}

export async function isInvited(db: D1Database, email: string): Promise<boolean> {
	return (await db.prepare('SELECT 1 AS ok FROM invites WHERE email = ?').bind(normalize(email)).first()) !== null;
}

export async function listInvites(db: D1Database): Promise<Invite[]> {
	return (await db.prepare('SELECT * FROM invites ORDER BY created_at, rowid').all<Invite>()).results;
}

export async function addInvite(db: D1Database, email: string, invitedBy: string): Promise<void> {
	await db
		.prepare('INSERT INTO invites (email, invited_by) VALUES (?, ?) ON CONFLICT (email) DO NOTHING')
		.bind(normalize(email), invitedBy)
		.run();
}

export async function removeInvite(db: D1Database, email: string): Promise<void> {
	await db.prepare('DELETE FROM invites WHERE email = ?').bind(normalize(email)).run();
}

export function scoped(db: D1Database, userId: string) {
	return {
		userId,

		getUser: () => db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<User>(),

		async setNick(nick: string): Promise<void> {
			await db.prepare('UPDATE users SET nick = ? WHERE id = ?').bind(nick, userId).run();
		},

		async listGoals(): Promise<GoalRow[]> {
			return (await db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY deadline, created_at, rowid').bind(userId).all<GoalRow>()).results;
		},

		async listGoalTasks(): Promise<GoalTaskRow[]> {
			return (
				await db
					.prepare('SELECT id, goal_id, title, planned_for, weight, completed_at FROM tasks WHERE user_id = ? ORDER BY planned_for, created_at, rowid')
					.bind(userId)
					.all<GoalTaskRow>()
			).results;
		},

		async countActiveGoals(): Promise<number> {
			return (await db.prepare("SELECT COUNT(*) AS n FROM goals WHERE user_id = ? AND status = 'active'").bind(userId).first<{ n: number }>())!.n;
		},

		async addGoal(goal: { title: string; description: string | null; deadline: string }, today: string): Promise<string> {
			const id = crypto.randomUUID();
			await db
				.prepare('INSERT INTO goals (id, user_id, title, description, start_date, deadline) VALUES (?, ?, ?, ?, ?, ?)')
				.bind(id, userId, goal.title, goal.description, today, goal.deadline)
				.run();
			return id;
		},

		// The user id is part of every write, so one person cannot touch another's goal.
		async setDeadline(goalId: string, deadline: string): Promise<boolean> {
			const r = await db.prepare("UPDATE goals SET deadline = ? WHERE id = ? AND user_id = ? AND status = 'active'").bind(deadline, goalId, userId).run();
			return r.meta.changes > 0;
		},

		// Stores a plan for a goal that has none. Everything is written in batches that
		// either all apply or none, so a failure never leaves half a plan.
		async savePlan(goalId: string, stages: ScheduledStage[]): Promise<SavePlanResult> {
			const goal = await db.prepare("SELECT id FROM goals WHERE id = ? AND user_id = ? AND status = 'active'").bind(goalId, userId).first();
			if (!goal) return 'not_found';
			const existing = await db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE goal_id = ? AND user_id = ?').bind(goalId, userId).first<{ n: number }>();
			if (existing!.n > 0) return 'has_plan';

			const statements: D1PreparedStatement[] = [];
			stages.forEach((stage, position) => {
				const stageId = crypto.randomUUID();
				statements.push(
					db.prepare('INSERT INTO stages (id, user_id, goal_id, position, title, due_date) VALUES (?, ?, ?, ?, ?, ?)').bind(stageId, userId, goalId, position, stage.title, stage.dueDate)
				);
				for (const task of stage.tasks) {
					const taskId = crypto.randomUUID();
					statements.push(
						db
							.prepare('INSERT INTO tasks (id, user_id, goal_id, stage_id, title, planned_for, weight) VALUES (?, ?, ?, ?, ?, ?, ?)')
							.bind(taskId, userId, goalId, stageId, task.title, task.plannedFor, task.weight)
					);
					for (const m of task.materials) {
						statements.push(
							db
								.prepare('INSERT INTO materials (id, user_id, task_id, kind, title, url, source) VALUES (?, ?, ?, ?, ?, ?, ?)')
								.bind(crypto.randomUUID(), userId, taskId, m.kind, m.title, m.url, m.source)
						);
					}
				}
			});
			await db.batch(statements);
			return 'saved';
		},

		// Checks or unchecks one task. Only tasks of the person's active goals can change;
		// the first check time is kept when a done task is checked again.
		async setTaskCompleted(taskId: string, done: boolean, now: Date = new Date()): Promise<boolean> {
			const r = await db
				.prepare(
					"UPDATE tasks SET completed_at = CASE WHEN ?1 THEN COALESCE(completed_at, ?2) ELSE NULL END WHERE id = ?3 AND user_id = ?4 AND goal_id IN (SELECT id FROM goals WHERE user_id = ?4 AND status = 'active')"
				)
				.bind(done ? 1 : 0, now.toISOString(), taskId, userId)
				.run();
			return r.meta.changes > 0;
		},

		// Moves tasks to new days. The user and goal are part of every write, and only open
		// tasks move, so a done task keeps its date.
		async moveTasks(goalId: string, moves: { id: string; to: string }[]): Promise<void> {
			if (moves.length === 0) return;
			await db.batch(
				moves.map((m) =>
					db
						.prepare("UPDATE tasks SET planned_for = ? WHERE id = ? AND goal_id = ? AND user_id = ? AND completed_at IS NULL AND goal_id IN (SELECT id FROM goals WHERE user_id = ? AND status = 'active')")
						.bind(m.to, m.id, goalId, userId, userId)
				)
			);
		},

		async setGoalStatus(goalId: string, status: GoalStatus): Promise<boolean> {
			const r = await db.prepare('UPDATE goals SET status = ? WHERE id = ? AND user_id = ?').bind(status, goalId, userId).run();
			return r.meta.changes > 0;
		}
	};
}
