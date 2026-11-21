import { describe, expect, it } from 'vitest';
import { ACCENTS, SIZES, isAccent, isTextSize } from './appearance';

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
