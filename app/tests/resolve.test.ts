import { describe, expect, it, vi } from 'vitest';
import { makeConcrete, resolveDirect } from '../src/lib/server/resolve';
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

describe('resolveDirect: Решу ОГЭ topic pages', () => {
	const catalog = `<a class="cat_name" href="/test?filter=all&category_id=6">Действия с обыкновенными дробями</a>
<a class="cat_name" href="/test?filter=all&category_id=7">Линейные уравнения</a>
<a class="cat_name" href="/test?filter=all&category_id=8">Системы линейных уравнений</a>`;
	const find = async (phrase: string) => resolveDirect(material('oge-math', phrase), reply(catalog) as unknown as typeof fetch);

	it('turns a search into the topic page, preferring the closest name', async () => {
		expect((await find('линейные уравнения')).url).toBe('https://math-oge.sdamgia.ru/test?filter=all&category_id=7');
		expect((await find('обыкновенные дроби')).url).toBe('https://math-oge.sdamgia.ru/test?filter=all&category_id=6');
	});

	it('keeps the search when nothing matches', async () => {
		const r = await find('варианты');
		expect(r.url).toContain('/search?search=');
	});
});

describe('makeConcrete', () => {
	const send = vi.fn(async (url: unknown) => {
		const u = String(url);
		if (u.includes('wikipedia.org')) return new Response(JSON.stringify(['x', ['Резюме'], [''], ['https://ru.wikipedia.org/wiki/%D0%A0']]));
		if (u.includes('youtube.com')) return new Response('"videoId":"1OJiyT4xz5g"');
		return new Response('', { status: 500 });
	}) as unknown as typeof fetch;

	it('replaces a bare search by an article and a video for the same phrase', async () => {
		const t = await makeConcrete({ title: 'Составить резюме', materials: [{ kind: 'other', title: 'Яндекс', url: buildMaterialUrl('yandex', 'как составить резюме'), source: 'Яндекс' }] }, send);
		expect(t.materials.map((m) => m.url)).toEqual(['https://ru.wikipedia.org/wiki/%D0%A0', 'https://www.youtube.com/watch?v=1OJiyT4xz5g']);
	});

	it('keeps the search when nothing concrete can be found', async () => {
		const down = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch;
		const m = { kind: 'other' as const, title: 'Яндекс', url: buildMaterialUrl('yandex', 'резюме'), source: 'Яндекс' };
		expect((await makeConcrete({ title: 'Резюме', materials: [m] }, down)).materials).toEqual([m]);
	});
});
