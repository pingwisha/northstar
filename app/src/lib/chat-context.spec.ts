import { describe, expect, it } from 'vitest';
import { buildChatContext } from './chat-context';

const goal = { id: 'a', title: 'Сдать ОГЭ', description: null, deadline: '2026-12-18', status: 'active' as const };
const task = (i: number, planned_for: string, done = false) => ({ id: `t${i}`, goal_id: 'a', title: `Задача ${i}`, planned_for, weight: 1, completed_at: done ? '2026-11-01T00:00:00Z' : null });

describe('buildChatContext', () => {
	it('tells the AI there are no goals', () => {
		expect(buildChatContext([], [], '2026-11-18')).toContain('нет активных целей');
	});

	it('lists the goal, its progress and only the next open tasks', () => {
		const tasks = [task(1, '2026-11-10', true), ...Array.from({ length: 12 }, (_, i) => task(i + 2, '2026-11-20'))];
		const text = buildChatContext([goal], tasks, '2026-11-18');
		expect(text).toContain('Цель: Сдать ОГЭ. Срок 18.12.2026');
		expect(text).toContain('Задача 2, на 20.11.2026');
		expect(text).not.toContain('Задача 1,');
		expect(text).not.toContain('Задача 11,');
		expect(text).toContain('И ещё 4 задач');
		expect(text).toContain('не придумывай другие');
	});

	it('says plainly when a goal has no plan', () => {
		expect(buildChatContext([goal], [], '2026-11-18')).toContain('Плана пока нет, задач нет.');
	});

	it('leaves out finished goals', () => {
		expect(buildChatContext([{ ...goal, status: 'done' }], [], '2026-11-18')).toContain('нет активных целей');
	});
});
