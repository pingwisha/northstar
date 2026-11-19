import { describe, expect, it } from 'vitest';
import { nextTheme } from './theme';

describe('nextTheme', () => {
	it('cycles auto, light, dark and back', () => {
		expect(nextTheme('auto')).toBe('light');
		expect(nextTheme('light')).toBe('dark');
		expect(nextTheme('dark')).toBe('auto');
	});
});
