import { describe, expect, it, vi } from 'vitest';
import { resolveDirect } from '../src/lib/server/resolve';
import { buildMaterialUrl } from '../src/lib/sites';
import type { PlanMaterial } from '../src/lib/plan';

const material = (site: string, phrase: string): PlanMaterial => ({ kind: 'article', title: 'Т', url: buildMaterialUrl(site, phrase), source: site });
const reply = (body: unknown) => vi.fn(async (..._args: unknown[]) => new Response(typeof body === 'string' ? body : JSON.stringify(body)));

describe('resolveDirect', () => {
	it('turns a Wikipedia search into the article', async () => {
		const send = reply(['x', ['Теорема Пифагора'], [''], ['https://ru.wikipedia.org/wiki/%D0%A2']]);
		const r = await resolveDirect(material('wikipedia-ru', 'Теорема Пифагора'), send as unknown as typeof fetch);
		expect(r.url).toBe('https://ru.wikipedia.org/wiki/%D0%A2');
		expect(String(send.mock.calls[0][0])).toContain(encodeURIComponent('Теорема Пифагора'));
	});

	it('takes the first MDN page, the first Stepik course and the first YouTube video', async () => {
		expect((await resolveDirect(material('mdn', 'flexbox'), reply({ documents: [{ mdn_url: '/en-US/docs/Web/CSS/flex' }] }) as unknown as typeof fetch)).url).toBe('https://developer.mozilla.org/en-US/docs/Web/CSS/flex');
		expect((await resolveDirect(material('stepik', 'python'), reply({ 'search-results': [{ course: 58852 }] }) as unknown as typeof fetch)).url).toBe('https://stepik.org/course/58852');
		expect((await resolveDirect(material('youtube', 'дроби урок'), reply('..."videoId":"1OJiyT4xz5g"...') as unknown as typeof fetch)).url).toBe('https://www.youtube.com/watch?v=1OJiyT4xz5g');
	});

	it('keeps the search address when the site answers badly, slowly or with a foreign address', async () => {
		const search = material('wikipedia-ru', 'дроби');
		const bad = [
			vi.fn(async () => new Response('no', { status: 500 })),
			vi.fn(async () => { throw new Error('timeout'); }),
			reply(['x', ['y'], [''], ['https://evil.example/wiki/x']]),
			reply('не json')
		];
		for (const send of bad) expect(await resolveDirect(search, send as unknown as typeof fetch)).toEqual(search);
		const yt = material('youtube', 'дроби');
		expect(await resolveDirect(yt, reply('no ids here') as unknown as typeof fetch)).toEqual(yt);
		const mdn = material('mdn', 'x');
		expect(await resolveDirect(mdn, reply({ documents: [{ mdn_url: 'https://evil.example/' }] }) as unknown as typeof fetch)).toEqual(mdn);
	});

	it('leaves sites without a lookup and addresses that are not ours alone', async () => {
		const send = vi.fn();
		const khan = material('khan', 'дроби');
		expect(await resolveDirect(khan, send as unknown as typeof fetch)).toEqual(khan);
		const other = { ...khan, url: 'https://example.com/a' };
		expect(await resolveDirect(other, send as unknown as typeof fetch)).toEqual(other);
		expect(send).not.toHaveBeenCalled();
	});
});
