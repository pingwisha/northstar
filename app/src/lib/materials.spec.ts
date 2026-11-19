import { describe, expect, it } from 'vitest';
import { parseMaterialLink, parseNote } from './materials';

describe('parseMaterialLink', () => {
	it('keeps an https link and the given title', () => {
		expect(parseMaterialLink(' Курс  по Python ', 'https://example.com/a?b=1')).toEqual({ ok: true, value: { title: 'Курс по Python', url: 'https://example.com/a?b=1' } });
	});
	it('uses the site name when the title is empty', () => {
		expect(parseMaterialLink('', 'https://www.example.com/x')).toMatchObject({ ok: true, value: { title: 'example.com' } });
	});
	it.each(['', 'не ссылка', 'http://example.com', 'javascript:alert(1)', 'ftp://example.com', 'https://user:pw@example.com', 'data:text/html,hi'])('rejects %j', (url) => {
		expect(parseMaterialLink('x', url).ok).toBe(false);
	});
	it('rejects too long links and titles', () => {
		expect(parseMaterialLink('x', `https://example.com/${'a'.repeat(500)}`).ok).toBe(false);
		expect(parseMaterialLink('я'.repeat(121), 'https://example.com').ok).toBe(false);
	});
});

describe('parseNote', () => {
	it('trims, clears when empty and limits length', () => {
		expect(parseNote('  привет\n ')).toEqual({ ok: true, value: 'привет' });
		expect(parseNote('   ')).toEqual({ ok: true, value: null });
		expect(parseNote('а'.repeat(1001)).ok).toBe(false);
	});
});
