// The hourly reminder run. Cloudflare Pages cannot run on a schedule, so this tiny Worker does it:
// every hour it looks at the same database and sends the reminders that are due.
import { runReminders } from '../../app/src/lib/server/reminders';

interface Env {
	DB: D1Database;
	VAPID_PUBLIC_KEY: string;
	VAPID_PRIVATE_KEY: string;
}

export default {
	async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(
			runReminders(env).then(
				(summary) => console.log('reminders', JSON.stringify(summary)),
				(err) => console.error('reminders failed', err instanceof Error ? err.message : err)
			)
		);
	},

	// Nobody is meant to call it by address.
	async fetch(): Promise<Response> {
		return new Response('Not found', { status: 404 });
	}
};
