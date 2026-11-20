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
	report: { id: 'e2e-report', email: 'e2e-report@example.com' }
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
