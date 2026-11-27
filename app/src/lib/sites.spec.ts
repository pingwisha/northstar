import { describe, expect, it } from 'vitest';
import { PAGES, SITES, buildMaterialUrl, pageListForPrompt, siteListForPrompt } from './sites';

describe('the site list', () => {
	it('has unique ids and https addresses only', () => {
		expect(new Set(SITES.map((s) => s.id)).size).toBe(SITES.length);
		for (const s of SITES) {
			expect(s.base.startsWith('https://'), s.id).toBe(true);
			if (s.search) {
				expect(s.search.startsWith('https://'), s.id).toBe(true);
				expect(s.search.includes('{q}'), s.id).toBe(true);
			}
		}
	});

	it('keeps ids unique across pages and sites, and every page is an https address', () => {
		const ids = [...PAGES.map((p) => p.id), ...SITES.map((s) => s.id)];
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of PAGES) expect(p.url.startsWith('https://'), p.id).toBe(true);
	});

	it('has a Решу ОГЭ and a Решу ЕГЭ site for every school subject', () => {
		for (const id of ['oge-rus', 'oge-math', 'oge-inf', 'ege-rus', 'ege-math', 'ege-mathb', 'ege-phys']) expect(SITES.some((s) => s.id === id), id).toBe(true);
	});

	it('shows every page and site to the AI', () => {
		for (const p of PAGES) expect(pageListForPrompt()).toContain(p.id);
		for (const s of SITES) expect(siteListForPrompt()).toContain(s.id);
	});
});

describe('buildMaterialUrl', () => {
	it('puts the encoded phrase into the search of the site', () => {
		expect(buildMaterialUrl('wikipedia-ru', 'Теорема Пифагора')).toBe('https://ru.wikipedia.org/w/index.php?search=' + encodeURIComponent('Теорема Пифагора'));
	});

	it('falls back to the home page when the site has no search or the phrase is empty', () => {
		expect(buildMaterialUrl('fipi', 'демоверсия')).toBe('https://fipi.ru/');
		expect(buildMaterialUrl('youtube', '   ')).toBe('https://www.youtube.com/');
	});

	it('does not let a phrase leave the encoded query', () => {
		const url = buildMaterialUrl('yandex', 'a&b=1#x https://evil.example')!;
		expect(new URL(url).host).toBe('yandex.ru');
		expect(new URL(url).searchParams.get('text')).toBe('a&b=1#x https://evil.example');
	});

	it('returns null for an id that is not in the list, whatever it looks like', () => {
		for (const id of ['evil', 'https://evil.example', '', null, 5]) expect(buildMaterialUrl(id, 'x')).toBeNull();
	});
});
