import { describe, expect, it } from 'vitest';
import { pickLang } from './lang';

const at = (q = '') => new URL(`https://x.test/welcome${q}`);

describe('pickLang', () => {
	it('follows the browser language', () => {
		expect(pickLang(at(), 'ru-RU,ru;q=0.9')).toBe('ru');
		expect(pickLang(at(), 'en-US,en;q=0.9')).toBe('en');
		expect(pickLang(at(), null)).toBe('en');
		expect(pickLang(at(), 'de')).toBe('en');
	});
	it('lets the visitor override it, and ignores anything else', () => {
		expect(pickLang(at('?lang=en'), 'ru')).toBe('en');
		expect(pickLang(at('?lang=ru'), 'en')).toBe('ru');
		expect(pickLang(at('?lang=<script>'), 'ru')).toBe('ru');
	});
});
