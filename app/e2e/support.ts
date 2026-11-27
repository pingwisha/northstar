import { execSync } from 'node:child_process';
import type { BrowserContext } from '@playwright/test';
import { SignJWT } from 'jose';

// Test-only values. The site under test gets the same secret through the
// bindings in playwright.config.ts, and the same people are seeded into the local D1.
export const E2E = {
	secret: 'e2e-session-secret-e2e-session-secret-0000',
	origin: 'http://localhost:4173',
	owner: { id: 'e2e-owner', email: 'e2e@example.com' },
	// Every spec file owns a person, so tests in different files never see each other's data.
	goals: { id: 'e2e-goals', email: 'e2e-goals@example.com' },
	home: { id: 'e2e-home', email: 'e2e-home@example.com' },
	replan: { id: 'e2e-replan', email: 'e2e-replan@example.com' },
	calendar: { id: 'e2e-calendar', email: 'e2e-calendar@example.com' },
	tasks: { id: 'e2e-tasks', email: 'e2e-tasks@example.com' },
	materials: { id: 'e2e-materials', email: 'e2e-materials@example.com' },
	trials: { id: 'e2e-trials', email: 'e2e-trials@example.com' },
	report: { id: 'e2e-report', email: 'e2e-report@example.com' },
	exam: { id: 'e2e-exam', email: 'e2e-exam@example.com' },
	zone: { id: 'e2e-zone', email: 'e2e-zone@example.com' },
	account: { id: 'e2e-account', email: 'e2e-account@example.com' },
	draft: { id: 'e2e-draft', email: 'e2e-draft@example.com' },
	friendA: { id: 'e2e-friend-a', email: 'e2e-friend-a@example.com' },
	friendB: { id: 'e2e-friend-b', email: 'e2e-friend-b@example.com' }
} as const;

type Person = { id: string; email: string };

// Signs the browser in as a seeded person, without going through Google.
export async function signInAs(context: BrowserContext, person: Person): Promise<void> {
	const token = await new SignJWT({ email: person.email })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(person.id)
		.setIssuedAt()
		.setExpirationTime('1h')
		.sign(new TextEncoder().encode(E2E.secret));
	await context.addCookies([{ name: 'session', value: token, url: E2E.origin }]);
}

// Puts rows into the local test database. Tests run side by side and the database file can be busy for a moment, so it retries.
export function seedDb(sql: string): void {
	for (let attempt = 1; ; attempt++) {
		try {
			execSync(`npx wrangler d1 execute northstar --local --command "${sql}"`, { stdio: 'pipe' });
			return;
		} catch (err) {
			if (attempt >= 5) throw new Error(`seedDb failed: ${String((err as { stderr?: Buffer }).stderr ?? err).slice(0, 600)}`);
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400 * attempt);
		}
	}
}
