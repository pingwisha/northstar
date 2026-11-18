import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Miniflare } from 'miniflare';

const MIGRATIONS = join(import.meta.dirname, '../../migrations');

// A fresh in-memory D1 with every migration applied.
export async function makeDb(): Promise<{ mf: Miniflare; db: D1Database }> {
	const mf = new Miniflare({ modules: true, script: 'export default {}', d1Databases: { DB: 'test-db' } });
	const db = (await mf.getD1Database('DB')) as unknown as D1Database;
	for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
		// Statements are flattened to one line each before running.
		const statements = readFileSync(join(MIGRATIONS, file), 'utf8')
			.replace(/--.*$/gm, '')
			.split(';')
			.map((s) => s.replace(/\s+/g, ' ').trim())
			.filter(Boolean);
		for (const s of statements) await db.prepare(s).run();
	}
	return { mf, db };
}
