// Data access for D1. User-owned data is reachable only through scoped(), which
// fixes the user id once, from the verified session. findOrCreateUser and the
// invite helpers are the exceptions: they run before a user id exists, or on
// behalf of the owner, whose role the caller has already checked.

import type { PlanMaterial, PlanStage, ScheduledStage } from '$lib/plan';
import type { NewTrial, Trial } from '$lib/trials';
import type { Mistake, NewMistake } from '$lib/mistakes';

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
	study_days: number;
	color: string;
	icon: string;
	created_at: string;
}

export interface GoalTaskRow {
	id: string;
	goal_id: string;
	title: string;
	planned_for: string;
	weight: number;
	completed_at: string | null;
	note: string | null;
	// The stage the task belongs to; null for tasks the person added by hand.
	stage_id: string | null;
}

export interface StageRow {
	id: string;
	goal_id: string;
	title: string;
	due_date: string | null;
}

export interface ChatMessageRow {
	id: string;
	role: 'user' | 'assistant';
	content: string;
}

export interface MaterialRow {
	id: string;
	own: number;
	task_id: string;
	kind: 'article' | 'video' | 'trainer' | 'checklist' | 'other';
	title: string;
	url: string | null;
	source: string | null;
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

export async function userExists(db: D1Database, email: string): Promise<boolean> {
	return (await db.prepare('SELECT 1 AS ok FROM users WHERE email = ?').bind(normalize(email)).first()) !== null;
}

// New accounts made since the start of a UTC day (YYYY-MM-DD), for the daily sign-up cap.
export async function countUsersSince(db: D1Database, day: string): Promise<number> {
	return (await db.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?').bind(day).first<{ n: number }>())!.n;
}

// Site-wide totals for the owner's page. Counts only: no names, no goals, no text of anyone.
export async function isInvited(db: D1Database, email: string): Promise<boolean> {
	return (await db.prepare('SELECT 1 AS ok FROM invites WHERE email = ?').bind(normalize(email)).first()) !== null;
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

		// Everything the person has stored, for the download on the account page. The AI usage counter is not content.
		async exportAll() {
			const all = async (sql: string) => (await db.prepare(sql).bind(userId).all()).results;
			const user = await this.getUser();
			return {
				exportedAt: new Date().toISOString(),
				email: user?.email ?? null,
				goals: await all('SELECT id, title, description, start_date, deadline, status, study_days, color, icon, created_at FROM goals WHERE user_id = ? ORDER BY created_at, rowid'),
				stages: await all('SELECT id, goal_id, position, title, due_date FROM stages WHERE user_id = ? ORDER BY goal_id, position'),
				tasks: await all('SELECT id, goal_id, title, planned_for, weight, completed_at, note, created_at FROM tasks WHERE user_id = ? ORDER BY planned_for, rowid'),
				materials: await all('SELECT id, task_id, kind, title, url, source, own FROM materials WHERE user_id = ? ORDER BY rowid'),
				trials: await all('SELECT id, goal_id, taken_on, title, score, max_score, weak_topics FROM trials WHERE user_id = ? ORDER BY taken_on, rowid'),
				pushSubscriptions: await all('SELECT endpoint, timezone, hour, created_at FROM push_subscriptions WHERE user_id = ?'),
				planDrafts: await all('SELECT goal_id, plan, missing, created_at FROM plan_drafts WHERE user_id = ?'),
				mistakes: await all('SELECT id, goal_id, topic, note, created_at, fixed_at FROM mistakes WHERE user_id = ? ORDER BY created_at, rowid'),
				chatMessages: await all('SELECT chat_id, role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at, rowid')
			};
		},

		// Removes the person and, through the foreign keys, everything they stored.
		async deleteAccount(): Promise<boolean> {
			const r = await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
			return (r.meta.changes ?? 0) > 0;
		},

		async countTasks(): Promise<number> {
			return (await db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id = ?').bind(userId).first<{ n: number }>())!.n;
		},

		async countTrials(): Promise<number> {
			return (await db.prepare('SELECT COUNT(*) AS n FROM trials WHERE user_id = ?').bind(userId).first<{ n: number }>())!.n;
		},

		async setNick(nick: string): Promise<void> {
			await db.prepare('UPDATE users SET nick = ? WHERE id = ?').bind(nick, userId).run();
		},

		async listGoals(): Promise<GoalRow[]> {
			return (await db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY deadline, created_at, rowid').bind(userId).all<GoalRow>()).results;
		},

		// The stages of every goal in plan order.
		async listStages(): Promise<StageRow[]> {
			return (await db.prepare('SELECT id, goal_id, title, due_date FROM stages WHERE user_id = ? ORDER BY goal_id, position').bind(userId).all<StageRow>()).results;
		},

		async listGoalTasks(): Promise<GoalTaskRow[]> {
			return (
				await db
					.prepare('SELECT id, goal_id, stage_id, title, planned_for, weight, completed_at, note FROM tasks WHERE user_id = ? ORDER BY planned_for, created_at, rowid')
					.bind(userId)
					.all<GoalTaskRow>()
			).results;
		},

		async listMaterials(): Promise<MaterialRow[]> {
			return (await db.prepare('SELECT id, own, task_id, kind, title, url, source FROM materials WHERE user_id = ? ORDER BY rowid').bind(userId).all<MaterialRow>()).results;
		},

		// Own links and notes: the task must be the person's and its goal still active.
		async taskIsOpen(taskId: string): Promise<boolean> {
			const row = await db
				.prepare("SELECT 1 AS ok FROM tasks t JOIN goals g ON g.id = t.goal_id WHERE t.id = ? AND t.user_id = ? AND g.user_id = ? AND g.status = 'active'")
				.bind(taskId, userId, userId)
				.first();
			return row !== null;
		},

		async countOwnMaterials(taskId: string): Promise<number> {
			return (await db.prepare('SELECT COUNT(*) AS n FROM materials WHERE user_id = ? AND task_id = ? AND own = 1').bind(userId, taskId).first<{ n: number }>())!.n;
		},

		async addOwnMaterial(taskId: string, title: string, url: string | null): Promise<boolean> {
			if (!(await this.taskIsOpen(taskId))) return false;
			await db
				.prepare("INSERT INTO materials (id, user_id, task_id, kind, title, url, source, own) VALUES (?, ?, ?, 'other', ?, ?, NULL, 1)")
				.bind(crypto.randomUUID(), userId, taskId, title, url)
				.run();
			return true;
		},

		// Only materials the person added can be removed; the planned ones stay.
		async deleteOwnMaterial(materialId: string): Promise<boolean> {
			const r = await db.prepare('DELETE FROM materials WHERE id = ? AND user_id = ? AND own = 1').bind(materialId, userId).run();
			return (r.meta.changes ?? 0) > 0;
		},

		async setTaskNote(taskId: string, note: string | null): Promise<boolean> {
			if (!(await this.taskIsOpen(taskId))) return false;
			await db.prepare('UPDATE tasks SET note = ? WHERE id = ? AND user_id = ?').bind(note, taskId, userId).run();
			return true;
		},

		async listTrials(): Promise<Trial[]> {
			const rows = (
				await db
					.prepare('SELECT id, goal_id, taken_on, title, score, max_score, weak_topics FROM trials WHERE user_id = ? ORDER BY taken_on, rowid')
					.bind(userId)
					.all<{ id: string; goal_id: string; taken_on: string; title: string; score: number; max_score: number; weak_topics: string | null }>()
			).results;
			return rows.map((r) => ({ id: r.id, goalId: r.goal_id, takenOn: r.taken_on, title: r.title, score: r.score, maxScore: r.max_score, weakTopics: r.weak_topics }));
		},

		// A result goes only to one of the person's active goals.
		async addTrial(goalId: string, t: NewTrial): Promise<boolean> {
			const goal = await db.prepare("SELECT id FROM goals WHERE id = ? AND user_id = ? AND status = 'active'").bind(goalId, userId).first();
			if (!goal) return false;
			await db
				.prepare('INSERT INTO trials (id, user_id, goal_id, taken_on, title, score, max_score, weak_topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
				.bind(crypto.randomUUID(), userId, goalId, t.takenOn, t.title, t.score, t.maxScore, t.weakTopics)
				.run();
			return true;
		},

		async deleteTrial(trialId: string): Promise<boolean> {
			const r = await db.prepare('DELETE FROM trials WHERE id = ? AND user_id = ?').bind(trialId, userId).run();
			return (r.meta.changes ?? 0) > 0;
		},

		async countMistakes(): Promise<number> {
			return (await db.prepare('SELECT COUNT(*) AS n FROM mistakes WHERE user_id = ?').bind(userId).first<{ n: number }>())!.n;
		},

		async listMistakes(): Promise<Mistake[]> {
			const rows = (
				await db
					.prepare('SELECT id, goal_id, topic, note, created_at, fixed_at FROM mistakes WHERE user_id = ? ORDER BY created_at DESC, rowid DESC')
					.bind(userId)
					.all<{ id: string; goal_id: string; topic: string; note: string | null; created_at: string; fixed_at: string | null }>()
			).results;
			return rows.map((r) => ({ id: r.id, goalId: r.goal_id, topic: r.topic, note: r.note, createdAt: r.created_at, fixedAt: r.fixed_at }));
		},

		// A mistake goes only to one of the person's active goals.
		async addMistake(goalId: string, m: NewMistake): Promise<boolean> {
			const goal = await db.prepare("SELECT id FROM goals WHERE id = ? AND user_id = ? AND status = 'active'").bind(goalId, userId).first();
			if (!goal) return false;
			await db.prepare('INSERT INTO mistakes (id, user_id, goal_id, topic, note) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), userId, goalId, m.topic, m.note).run();
			return true;
		},

		async setMistakeFixed(id: string, fixed: boolean): Promise<boolean> {
			const r = await db
				.prepare("UPDATE mistakes SET fixed_at = CASE WHEN ?1 THEN COALESCE(fixed_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ELSE NULL END WHERE id = ?2 AND user_id = ?3")
				.bind(fixed ? 1 : 0, id, userId)
				.run();
			return (r.meta.changes ?? 0) > 0;
		},

		async deleteMistake(id: string): Promise<boolean> {
			const r = await db.prepare('DELETE FROM mistakes WHERE id = ? AND user_id = ?').bind(id, userId).run();
			return (r.meta.changes ?? 0) > 0;
		},

		async countActiveGoals(): Promise<number> {
			return (await db.prepare("SELECT COUNT(*) AS n FROM goals WHERE user_id = ? AND status = 'active'").bind(userId).first<{ n: number }>())!.n;
		},

		async addGoal(goal: { title: string; description: string | null; deadline: string; studyDays?: number; color?: string; icon?: string }, today: string): Promise<string> {
			const id = crypto.randomUUID();
			await db
				.prepare('INSERT INTO goals (id, user_id, title, description, start_date, deadline, study_days, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
				.bind(id, userId, goal.title, goal.description, today, goal.deadline, goal.studyDays ?? 127, goal.color ?? 'blue', goal.icon ?? 'target')
				.run();
			return id;
		},

		// The user id is part of every write, so one person cannot touch another's goal.
		async setLook(goalId: string, color: string, icon: string): Promise<boolean> {
			const r = await db.prepare("UPDATE goals SET color = ?, icon = ? WHERE id = ? AND user_id = ? AND status != 'done'").bind(color, icon, goalId, userId).run();
			return r.meta.changes > 0;
		},

		async setStudyDays(goalId: string, studyDays: number): Promise<boolean> {
			const r = await db.prepare("UPDATE goals SET study_days = ? WHERE id = ? AND user_id = ? AND status = 'active'").bind(studyDays, goalId, userId).run();
			return r.meta.changes > 0;
		},

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
			statements.push(db.prepare('DELETE FROM plan_drafts WHERE goal_id = ? AND user_id = ?').bind(goalId, userId));
			await db.batch(statements);
			return 'saved';
		},

		// The plan the AI proposed and the person has not accepted yet (one per goal, a new one replaces it).
		async saveDraft(goalId: string, stages: PlanStage[], missing: number): Promise<boolean> {
			const goal = await db.prepare("SELECT id FROM goals WHERE id = ? AND user_id = ? AND status = 'active'").bind(goalId, userId).first();
			if (!goal) return false;
			await db
				.prepare("INSERT INTO plan_drafts (goal_id, user_id, plan, missing) VALUES (?, ?, ?, ?) ON CONFLICT (goal_id) DO UPDATE SET plan = excluded.plan, missing = excluded.missing, created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")
				.bind(goalId, userId, JSON.stringify(stages), missing)
				.run();
			return true;
		},

		async listDrafts(): Promise<{ goalId: string; stages: PlanStage[]; missing: number }[]> {
			const rows = (await db.prepare('SELECT goal_id, plan, missing FROM plan_drafts WHERE user_id = ?').bind(userId).all<{ goal_id: string; plan: string; missing: number }>()).results;
			return rows.flatMap((r) => {
				try {
					const stages = JSON.parse(r.plan) as PlanStage[];
					return Array.isArray(stages) && stages.length > 0 ? [{ goalId: r.goal_id, stages, missing: r.missing }] : [];
				} catch {
					return [];
				}
			});
		},

		// Materials found after the plan was accepted. A task that already has any keeps what it has.
		async addPlanMaterials(items: { taskId: string; materials: PlanMaterial[] }[]): Promise<void> {
			const have = new Set((await db.prepare('SELECT DISTINCT task_id FROM materials WHERE user_id = ?').bind(userId).all<{ task_id: string }>()).results.map((r) => r.task_id));
			const statements: D1PreparedStatement[] = [];
			for (const item of items) {
				if (have.has(item.taskId)) continue;
				for (const m of item.materials) {
					statements.push(
						db
							.prepare('INSERT INTO materials (id, user_id, task_id, kind, title, url, source) SELECT ?, ?, t.id, ?, ?, ?, ? FROM tasks t WHERE t.id = ? AND t.user_id = ?')
							.bind(crypto.randomUUID(), userId, m.kind, m.title, m.url, m.source, item.taskId, userId)
					);
				}
			}
			if (statements.length > 0) await db.batch(statements);
		},

		async discardDraft(goalId: string): Promise<void> {
			await db.prepare('DELETE FROM plan_drafts WHERE goal_id = ? AND user_id = ?').bind(goalId, userId).run();
		},

		// Adds tasks written by hand to one of the person's active goals. They belong to no stage.
		async addTasks(goalId: string, titles: string[], plannedFor: string): Promise<boolean> {
			const goal = await db.prepare("SELECT id FROM goals WHERE id = ? AND user_id = ? AND status = 'active'").bind(goalId, userId).first();
			if (!goal) return false;
			await db.batch(
				titles.map((title) =>
					db.prepare('INSERT INTO tasks (id, user_id, goal_id, title, planned_for) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), userId, goalId, title, plannedFor)
				)
			);
			return true;
		},

		// Renames a task and sets its day. Only tasks of the person's active goals change.
		async updateTask(taskId: string, title: string, plannedFor: string): Promise<boolean> {
			const r = await db
				.prepare("UPDATE tasks SET title = ?1, planned_for = ?2 WHERE id = ?3 AND user_id = ?4 AND goal_id IN (SELECT id FROM goals WHERE user_id = ?4 AND status = 'active')")
				.bind(title, plannedFor, taskId, userId)
				.run();
			return r.meta.changes > 0;
		},

		async deleteTask(taskId: string): Promise<boolean> {
			const r = await db
				.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ? AND goal_id IN (SELECT id FROM goals WHERE user_id = ? AND status = 'active')")
				.bind(taskId, userId, userId)
				.run();
			return r.meta.changes > 0;
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

		// The newest conversation, or null when there is none yet.
		async currentChat(): Promise<string | null> {
			const row = await db.prepare('SELECT id FROM chats WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').bind(userId).first<{ id: string }>();
			return row?.id ?? null;
		},

		async createChat(): Promise<string> {
			const id = crypto.randomUUID();
			await db.prepare('INSERT INTO chats (id, user_id) VALUES (?, ?)').bind(id, userId).run();
			return id;
		},

		// The last messages of one of the person's conversations, oldest first.
		async chatMessages(chatId: string, limit = 40): Promise<ChatMessageRow[]> {
			const rows = (
				await db
					.prepare('SELECT id, role, content FROM chat_messages WHERE chat_id = ? AND user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
					.bind(chatId, userId, limit)
					.all<ChatMessageRow>()
			).results;
			return rows.reverse();
		},

		// A question and its answer are stored together, so a failed answer leaves no orphan question.
		async addExchange(chatId: string, question: string, answer: string): Promise<boolean> {
			const chat = await db.prepare('SELECT id FROM chats WHERE id = ? AND user_id = ?').bind(chatId, userId).first();
			if (!chat) return false;
			await db.batch([
				db.prepare("INSERT INTO chat_messages (id, user_id, chat_id, role, content, created_at) VALUES (?, ?, ?, 'user', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))").bind(crypto.randomUUID(), userId, chatId, question),
				db.prepare("INSERT INTO chat_messages (id, user_id, chat_id, role, content, created_at) VALUES (?, ?, ?, 'assistant', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))").bind(crypto.randomUUID(), userId, chatId, answer)
			]);
			return true;
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
