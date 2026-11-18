import { describe, expect, it } from 'vitest';
import { clampPercent } from './progress';

describe('clampPercent', () => {
	it('keeps a percent between 0 and 100', () => {
		expect(clampPercent(-5)).toBe(0);
		expect(clampPercent(42.4)).toBe(42);
		expect(clampPercent(140)).toBe(100);
	});
});
