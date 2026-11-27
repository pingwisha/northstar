// Reads the rows the four meters need and hands them to computeStats. The owner and the test
// accounts are left out, so the numbers say how other people use the site.
import { WINDOW_START, computeStats, type Stats } from '../stats';

const PEOPLE = "u.role != 'owner' AND u.email NOT LIKE 'e2e%@example.com'";

export async function readStats(db: D1Database, today: string): Promise<Stats> {
	const since = `${WINDOW_START}T00:00:00.000Z`;
	const [users, goals, tasks] = await Promise.all([
		db.prepare(`SELECT u.id, u.created_at FROM users u WHERE ${PEOPLE}`).all<{ id: string; created_at: string }>(),
		db
			.prepare(`SELECT g.id, g.user_id, g.created_at, g.deadline FROM goals g JOIN users u ON u.id = g.user_id WHERE ${PEOPLE} AND g.created_at >= ?`)
			.bind(since)
			.all<{ id: string; user_id: string; created_at: string; deadline: string }>(),
		db
			.prepare(`SELECT t.goal_id, t.user_id, t.weight, t.completed_at FROM tasks t JOIN users u ON u.id = t.user_id WHERE ${PEOPLE}`)
			.all<{ goal_id: string; user_id: string; weight: number; completed_at: string | null }>()
	]);
	return computeStats(
		users.results.map((r) => ({ id: r.id, createdAt: r.created_at })),
		goals.results.map((r) => ({ id: r.id, userId: r.user_id, createdAt: r.created_at, deadline: r.deadline })),
		tasks.results.map((r) => ({ goalId: r.goal_id, userId: r.user_id, weight: r.weight, completedAt: r.completed_at })),
		today
	);
}
