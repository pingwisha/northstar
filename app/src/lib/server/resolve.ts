// Turns a site search address into the address of the page itself, where the site lets us ask.
// Every answer is checked against the shape of that site's own addresses; anything unexpected,
// slow or failing leaves the search address in place, which always works.
import type { PlanMaterial } from '../plan';
import { SITES, type Site } from '../sites';

const TIMEOUT_MS = 4_000;
// Wikimedia and MDN want an honest client name; YouTube only answers browser-like clients.
const BOT_UA = 'NorthstartBot/1.0 (+https://northstar-5gb.pages.dev)';
const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

type Finder = (phrase: string, send: typeof fetch) => Promise<string | null>;

async function getJson(url: string, send: typeof fetch): Promise<unknown> {
	const res = await send(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': BOT_UA, accept: 'application/json' } });
	if (!res.ok) return null;
	return res.json();
}

// Wikipedia and Wiktionary: the first title that the site's own suggestion search returns.
const mediaWiki = (host: string): Finder => async (phrase, send) => {
	const data = await getJson(`https://${host}/w/api.php?action=opensearch&limit=1&format=json&search=${encodeURIComponent(phrase)}`, send);
	const link = Array.isArray(data) && Array.isArray(data[3]) ? data[3][0] : null;
	return typeof link === 'string' && link.startsWith(`https://${host}/wiki/`) ? link : null;
};

const mdn: Finder = async (phrase, send) => {
	const data = (await getJson(`https://developer.mozilla.org/api/v1/search?locale=en-US&q=${encodeURIComponent(phrase)}`, send)) as { documents?: { mdn_url?: unknown }[] } | null;
	const path = data?.documents?.[0]?.mdn_url;
	return typeof path === 'string' && /^\/en-US\/docs\/[\w./%-]+$/.test(path) ? `https://developer.mozilla.org${path}` : null;
};

const stepik: Finder = async (phrase, send) => {
	const data = (await getJson(`https://stepik.org/api/search-results?type=course&is_popular=true&query=${encodeURIComponent(phrase)}`, send)) as { 'search-results'?: { course?: unknown }[] } | null;
	const id = data?.['search-results']?.[0]?.course;
	return typeof id === 'number' && Number.isInteger(id) && id > 0 ? `https://stepik.org/course/${id}` : null;
};

// YouTube has no open search API; the first video in the results page is used.
const youtube: Finder = async (phrase, send) => {
	const res = await send(`https://www.youtube.com/results?search_query=${encodeURIComponent(phrase)}`, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': BROWSER_UA, 'accept-language': 'ru,en;q=0.8' } });
	if (!res.ok) return null;
	const id = /"videoId":"([A-Za-z0-9_-]{11})"/.exec(await res.text())?.[1];
	return id ? `https://www.youtube.com/watch?v=${id}` : null;
};

// Решу ОГЭ / Решу ЕГЭ: one catalogue page lists every topic with its own page of tasks. The phrase is matched
// to a topic name by word stems; no confident match leaves the site search in place.
const CATALOG_TTL_MS = 6 * 3_600_000;
const catalogs = new Map<string, { at: number; topics: { id: string; stems: string[] }[] }>();
const GENERIC = new Set(['зада', 'реше', 'прим', 'упра', 'вари', 'тест', 'теор']);

export const stems = (text: string): string[] =>
	text.toLowerCase().replace(/ё/g, 'е').split(/[^a-zа-я0-9]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 4));

async function loadCatalog(host: string, send: typeof fetch) {
	const hit = catalogs.get(host);
	if (hit && Date.now() - hit.at < CATALOG_TTL_MS) return hit.topics;
	const res = await send(`${host}/prob_catalog`, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': BOT_UA } });
	if (!res.ok) return [];
	const html = await res.text();
	const topics = [...html.matchAll(/<a class="cat_name" href="\/test\?filter=all&(?:amp;)?category_id=(\d+)">([^<]+)<\/a>/g)].map((m) => ({ id: m[1], stems: stems(m[2]) }));
	if (topics.length) catalogs.set(host, { at: Date.now(), topics });
	return topics;
}

const sdamgia = (host: string): Finder => async (phrase, send) => {
	const want = stems(phrase).filter((w) => !GENERIC.has(w));
	if (!want.length) return null;
	let best: { id: string; hit: number; cover: number } | null = null;
	for (const t of await loadCatalog(host, send)) {
		const hit = want.filter((w) => t.stems.includes(w)).length;
		if (hit * 2 <= want.length) continue;
		const cover = hit / t.stems.length;
		if (!best || hit > best.hit || (hit === best.hit && cover > best.cover)) best = { id: t.id, hit, cover };
	}
	return best ? `${host}/test?filter=all&category_id=${best.id}` : null;
};

const FINDERS: Record<string, Finder> = {
	'wikipedia-ru': mediaWiki('ru.wikipedia.org'),
	'wiktionary-ru': mediaWiki('ru.wiktionary.org'),
	mdn,
	stepik,
	youtube
};

// The site and the phrase behind a search address built by buildMaterialUrl, or null for any other address.
function searchOrigin(url: string): { site: Site; phrase: string } | null {
	for (const site of SITES) {
		if (!site.search) continue;
		const prefix = site.search.slice(0, site.search.indexOf('{q}'));
		if (!url.startsWith(prefix)) continue;
		try {
			return { site, phrase: decodeURIComponent(url.slice(prefix.length)) };
		} catch {
			return null;
		}
	}
	return null;
}

export async function resolveDirect(material: PlanMaterial, send: typeof fetch = fetch): Promise<PlanMaterial> {
	const origin = material.url ? searchOrigin(material.url) : null;
	const examHost = origin ? /^https:\/\/[a-z]+-(?:oge|ege)\.sdamgia\.ru/.exec(origin.site.base)?.[0] : undefined;
	const find = origin ? (examHost ? sdamgia(examHost) : FINDERS[origin.site.id]) : undefined;
	if (!origin || !find) return material;
	try {
		const direct = await find(origin.phrase, send);
		return direct ? { ...material, url: direct } : material;
	} catch {
		return material;
	}
}
