// Opens the home page and an example search of every site in app/src/lib/sites.ts.
// Run before publishing: `node scripts/check-sites.mjs` from app/. Exits 1 when one does not open.
import { PAGES, SITES, buildMaterialUrl } from '../src/lib/sites.ts';

// Sites that refuse robots answer with these even when the page exists.
const NOT_PROOF_OF_BROKEN = new Set([401, 403, 405, 429, 999]);

async function opens(url) {
	try {
		const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; NorthstarLinkCheck)' } });
		void res.body?.cancel();
		return res.status < 400 || NOT_PROOF_OF_BROKEN.has(res.status) ? null : `status ${res.status}`;
	} catch (e) {
		return e instanceof Error ? e.message : String(e);
	}
}

let failed = 0;
for (const page of PAGES) {
	const problem = await opens(page.url);
	console.log(`${problem ? 'FAIL' : 'ok  '} ${page.id} ${page.url}${problem ? ` (${problem})` : ''}`);
	if (problem) failed++;
}
for (const site of SITES) {
	const urls = new Set([site.base, buildMaterialUrl(site.id, 'проверка')]);
	for (const url of urls) {
		const problem = await opens(url);
		console.log(`${problem ? 'FAIL' : 'ok  '} ${site.id} ${url}${problem ? ` (${problem})` : ''}`);
		if (problem) failed++;
	}
}
if (failed > 0) {
	console.error(`${failed} address(es) did not open: fix or remove them in app/src/lib/sites.ts`);
	process.exit(1);
}
