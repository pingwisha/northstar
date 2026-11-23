// Subscriptions and the hourly run that sends reminders. Used by the site and by the reminder
// Worker, so it imports with relative paths only.
import { todayIso } from '../goals';
import { isDue, isPushEndpoint, MAX_SUBSCRIPTIONS, reminderText, type Subscription } from '../reminders';
import { sendPush, type PushEnv, type PushResult } from './push';

export interface SubscriptionRow {
	id: string;
	user_id: string;
	endpoint: string;
	timezone: string;
	hour: number;
	last_sent_on: string | null;
}

export type SubscribeResult = 'saved' | 'too_many' | 'bad_endpoint';

// Saves or updates this browser's subscription. The same endpoint belongs to one person at a time:
// if another person signs in on the same browser, the subscription moves to them.
export async function saveSubscription(db: D1Database, userId: string, endpoint: string, timezone: string, hour: number): Promise<SubscribeResult> {
	if (!isPushEndpoint(endpoint)) return 'bad_endpoint';
	const known = await db.prepare('SELECT user_id FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).first<{ user_id: string }>();
	if (!known) {
		const mine = await db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?').bind(userId).first<{ n: number }>();
		if ((mine?.n ?? 0) >= MAX_SUBSCRIPTIONS) return 'too_many';
	}
	await db
		.prepare('INSERT INTO push_subscriptions (id, user_id, endpoint, timezone, hour) VALUES (?, ?, ?, ?, ?) ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, timezone = excluded.timezone, hour = excluded.hour')
		.bind(crypto.randomUUID(), userId, endpoint, timezone, hour)
		.run();
	return 'saved';
}

export async function removeSubscription(db: D1Database, userId: string, endpoint: string): Promise<boolean> {
	const r = await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(endpoint, userId).run();
	return (r.meta.changes ?? 0) > 0;
}

export async function listSubscriptions(db: D1Database, userId: string): Promise<SubscriptionRow[]> {
	return (await db.prepare('SELECT id, user_id, endpoint, timezone, hour, last_sent_on FROM push_subscriptions WHERE user_id = ? ORDER BY created_at').bind(userId).all<SubscriptionRow>()).results;
}

// Tasks not done yet in the person's active goals: planned for today, and planned before today.
export async function openTaskCounts(db: D1Database, userId: string, today: string): Promise<{ todayOpen: number; overdue: number }> {
	const row = await db
		.prepare(
			`SELECT COALESCE(SUM(CASE WHEN t.planned_for = ?2 THEN 1 ELSE 0 END), 0) AS todayOpen,
			        COALESCE(SUM(CASE WHEN t.planned_for < ?2 THEN 1 ELSE 0 END), 0) AS overdue
			   FROM tasks t JOIN goals g ON g.id = t.goal_id
			  WHERE t.user_id = ?1 AND g.status = 'active' AND t.completed_at IS NULL`
		)
		.bind(userId, today)
		.first<{ todayOpen: number; overdue: number }>();
	return { todayOpen: row?.todayOpen ?? 0, overdue: row?.overdue ?? 0 };
}

export interface RunSummary {
	checked: number;
	sent: number;
	removed: number;
	failed: number;
}

// One hourly pass: every subscription whose local hour has come, once per local day, for a person
// who still has something to do. A subscription the push service says is gone is deleted.
// The free Workers plan allows 50 calls (database and push) per run; stay below it and leave the rest for the next hour.
export const CALL_BUDGET = 45;

export async function runReminders(env: PushEnv & { DB: D1Database }, now: Date = new Date(), send: typeof fetch = fetch): Promise<RunSummary> {
	const rows = (await env.DB.prepare('SELECT id, user_id, endpoint, timezone, hour, last_sent_on FROM push_subscriptions').all<SubscriptionRow>()).results;
	const summary: RunSummary = { checked: 0, sent: 0, removed: 0, failed: 0 };
	let calls = 0;
	for (const row of rows) {
		if (calls + 3 > CALL_BUDGET) break;
		const sub: Subscription = { timezone: row.timezone, hour: row.hour, lastSentOn: row.last_sent_on };
		if (!isDue(sub, now)) continue;
		summary.checked++;
		const today = todayIso(now, row.timezone);
		calls++;
		const counts = await openTaskCounts(env.DB, row.user_id, today);
		if (!reminderText(counts.todayOpen, counts.overdue)) continue;
		calls += 2;
		const result: PushResult = await sendPush(env, row.endpoint, send, now);
		if (result === 'sent') {
			summary.sent++;
			await env.DB.prepare('UPDATE push_subscriptions SET last_sent_on = ? WHERE id = ?').bind(today, row.id).run();
		} else if (result === 'gone' || result === 'bad_endpoint') {
			summary.removed++;
			await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(row.id).run();
		} else {
			summary.failed++;
		}
	}
	return summary;
}
