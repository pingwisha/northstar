// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			// Set by hooks.server.ts from the verified session, never from the request.
			userId?: string;
			email?: string;
			role?: 'owner' | 'member';
		}
		interface Platform {
			// Only tests and local tools fill this. The site reads bindings through appEnv() in
			// src/lib/server/env.ts. DB comes from wrangler.jsonc; the rest are secrets.
			env?: Env & {
				GOOGLE_CLIENT_ID: string;
				GOOGLE_CLIENT_SECRET: string;
				SESSION_SECRET: string;
				ALLOWED_EMAILS: string;
			};
		}
	}
}

export {};
