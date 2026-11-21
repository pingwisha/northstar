import { describe, expect, it } from 'vitest';
import { GOAL_COLORS, GOAL_ICON_KEYS, colorOf, iconOf, nextColor, parseLook } from './goal-look';

describe('goal look', () => {
	it('accepts only listed keys', () => {
		expect(parseLook({ color: 'rose', icon: 'books' }, 'blue')).toEqual({ color: 'rose', icon: 'books' });
		expect(parseLook({ color: 'red; background:url(x)', icon: '<img>' }, 'green')).toEqual({ color: 'green', icon: 'target' });
		expect(parseLook({ color: 'constructor', icon: 'toString' }, 'blue')).toEqual({ color: 'blue', icon: 'target' });
	});
	it('falls back for a broken stored value', () => {
		expect(colorOf('nonsense')).toBe('blue');
		expect(iconOf('nonsense')).toBe('🎯');
		expect(iconOf('books')).toBe('📚');
	});
	it('hands out colours in turn', () => {
		expect(nextColor(0)).toBe(GOAL_COLORS[0]);
		expect(nextColor(GOAL_COLORS.length)).toBe(GOAL_COLORS[0]);
		expect(GOAL_ICON_KEYS.length).toBeGreaterThan(8);
	});
});
