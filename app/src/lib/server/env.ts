import type { AuthEnv } from './auth/signin';

// The Cloudflare adapter exposes bindings and secrets through the
// `cloudflare:workers` module, not through event.platform. Tests have no such
// module, so they pass the environment in event.platform.env and it wins here.
export async function appEnv(platform: App.Platform | undefined): Promise<AuthEnv | undefined> {
	if (platform?.env) return platform.env as unknown as AuthEnv;
	try {
		const { env } = await import('cloudflare:workers');
		return env as unknown as AuthEnv;
	} catch {
		return undefined;
	}
}
