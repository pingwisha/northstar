// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			// DB comes from wrangler.jsonc; the rest are secrets set outside git.
			env?: Env;
		}
	}
}

export {};
