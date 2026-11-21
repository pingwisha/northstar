import { describe, expect, it } from 'vitest';
import { isMilestone, milestoneKey, milestoneMessage } from './milestones';

describe('milestones', () => {
	it('knows the marks', () => {
		for (const n of [100, 50, 30, 14, 7, 3, 1, 0]) expect(isMilestone(n)).toBe(true);
		for (const n of [99, 31, 8, 2, -1, 101]) expect(isMilestone(n)).toBe(false);
	});
	it('words the message for the day', () => {
		expect(milestoneMessage(0, 'ОГЭ')).toContain('Сегодня срок');
		expect(milestoneMessage(1, 'ОГЭ')).toContain('1 день');
		expect(milestoneMessage(7, 'ОГЭ')).toContain('осталось 7');
		expect(milestoneMessage(100, 'ОГЭ')).toContain('ровно 100');
	});
	it('remembers per goal, deadline and mark, so a moved deadline can congratulate again', () => {
		expect(milestoneKey('g', '2027-01-01', 7)).not.toBe(milestoneKey('g', '2027-02-01', 7));
	});
});
