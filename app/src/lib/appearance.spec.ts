import { describe, expect, it } from 'vitest';
import { ACCENTS, FONTS, SIZES, isAccent, isFont, isTextSize, parseHue } from './appearance';

describe('appearance', () => {
	it('knows only the listed values', () => {
		for (const a of ACCENTS) expect(isAccent(a.key)).toBe(true);
		for (const s of SIZES) expect(isTextSize(s.key)).toBe(true);
		for (const bad of ['red', '', null, undefined, '__proto__', 'blue; x']) {
			expect(isAccent(bad)).toBe(false);
			expect(isTextSize(bad)).toBe(false);
		}
	});
});

describe('fonts and custom hue', () => {
	it('knows only the listed fonts', () => {
		for (const f of FONTS) expect(isFont(f.key)).toBe(true);
		for (const bad of ['arial', '', null, '__proto__', 'serif; x']) expect(isFont(bad)).toBe(false);
	});
	it('takes a hue from 0 to 359 and nothing else', () => {
		expect(parseHue('0')).toBe(0);
		expect(parseHue('140')).toBe(140);
		expect(parseHue(359)).toBe(359);
		for (const bad of ['360', '999', 'abc', '', '-1', '1.5', null, undefined]) expect(parseHue(bad)).toBeNull();
	});
});
