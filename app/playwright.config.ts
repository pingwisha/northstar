import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview -- --binding SESSION_SECRET=e2e-session-secret-of-at-least-32-chars --binding GOOGLE_CLIENT_ID=e2e-client-id --binding GOOGLE_CLIENT_SECRET=e2e-secret --binding ALLOWED_EMAILS=e2e@example.com',
		port: 4173,
		timeout: 600_000
	},
	timeout: 60_000,
	expect: { timeout: 15_000 },
	use: { baseURL: 'http://localhost:4173' },
	testMatch: '**/*.e2e.{ts,js}'
});
