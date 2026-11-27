import { defineConfig } from '@playwright/test';
import { E2E } from './e2e/support';

// Test-only values for the secrets the site reads at runtime. The owner is in the
// ALLOWED_EMAILS secret; the other seeded people are let in through the invites table.
const bindings = [
	`SESSION_SECRET=${E2E.secret}`,
	`ALLOWED_EMAILS=${E2E.owner.email}`,
	'GOOGLE_CLIENT_ID=e2e-client-id',
	'GOOGLE_CLIENT_SECRET=e2e-client-secret'
]
	.map((b) => `--binding ${b}`)
	.join(' ');

// A fresh local D1 with the real migrations and the seeded people for every run.
const seed = [
	`INSERT INTO users (id, email, role) VALUES ('${E2E.owner.id}', '${E2E.owner.email}', 'owner'), ('${E2E.goals.id}', '${E2E.goals.email}', 'member'), ('${E2E.home.id}', '${E2E.home.email}', 'member'), ('${E2E.replan.id}', '${E2E.replan.email}', 'member'), ('${E2E.calendar.id}', '${E2E.calendar.email}', 'member'), ('${E2E.tasks.id}', '${E2E.tasks.email}', 'member'), ('${E2E.materials.id}', '${E2E.materials.email}', 'member'), ('${E2E.trials.id}', '${E2E.trials.email}', 'member'), ('${E2E.report.id}', '${E2E.report.email}', 'member'), ('${E2E.exam.id}', '${E2E.exam.email}', 'member'), ('${E2E.zone.id}', '${E2E.zone.email}', 'member'), ('${E2E.account.id}', '${E2E.account.email}', 'member'), ('${E2E.draft.id}', '${E2E.draft.email}', 'member'), ('${E2E.friendA.id}', '${E2E.friendA.email}', 'member'), ('${E2E.friendB.id}', '${E2E.friendB.email}', 'member')`,
	`INSERT INTO invites (email) VALUES ('${E2E.goals.email}'), ('${E2E.home.email}'), ('${E2E.replan.email}'), ('${E2E.calendar.email}'), ('${E2E.tasks.email}'), ('${E2E.materials.email}'), ('${E2E.trials.email}'), ('${E2E.report.email}'), ('${E2E.exam.email}'), ('${E2E.zone.email}'), ('${E2E.account.email}'), ('${E2E.draft.email}'), ('${E2E.friendA.email}'), ('${E2E.friendB.email}')`
].join('; ');
const prepareDb = ['rm -rf .wrangler/state', 'npx wrangler d1 migrations apply northstar --local', `npx wrangler d1 execute northstar --local --command "${seed}"`].join(' && ');

export default defineConfig({
	// One file of the local test database is shared, so tests run one at a time (parallel writes gave SQLITE_BUSY).
	workers: 1,
	webServer: {
		command: `npm run build && ${prepareDb} && npm run preview -- ${bindings}`,
		port: 4173,
		timeout: 600_000
	},
	// Generous limits: a busy machine makes pages slow, not wrong.
	timeout: 60_000,
	expect: { timeout: 15_000 },
	use: { baseURL: E2E.origin },
	testMatch: '**/*.e2e.{ts,js}'
});
