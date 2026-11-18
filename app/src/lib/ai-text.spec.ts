import { describe, expect, it } from 'vitest';
import { AI_RULES, plainText, systemMessage } from './ai-text';

describe('plainText', () => {
	it('removes stars, hashes, backticks, brackets and slashes', () => {
		const out = plainText('## Урок\n**Важно** (пример) [ссылка] {x} и/или `код` a\\b');
		expect(out).not.toMatch(/[*#`()[\]{}/\\]/);
		expect(out).toContain('Важно');
		expect(out).toContain('и или');
	});

	it('keeps paragraphs and does not leave stray spaces before punctuation', () => {
		expect(plainText('Привет (друг) !\n\n\n\nДа .')).toBe('Привет друг!\n\nДа.');
	});

	it('leaves clean text unchanged', () => {
		expect(plainText('Сегодня одна задача.\nДелай её.')).toBe('Сегодня одна задача.\nДелай её.');
	});
});

describe('the AI rules', () => {
	it('say the things the product promises', () => {
		for (const phrase of ['звёздочки', 'не знаю', 'требовательный', 'личные данные', 'Не придумывай задачи']) {
			expect(AI_RULES.toLowerCase()).toContain(phrase.toLowerCase());
		}
	});

	it('follow their own formatting rule', () => {
		expect(AI_RULES.replace(/звёздочки, решётки, обратные кавычки, скобки любого вида и косые черты/, '')).not.toMatch(/[*#`()[\]{}/\\]/);
	});

	it('start the system message, with the context after them', () => {
		expect(systemMessage().content).toBe(AI_RULES);
		const withContext = systemMessage('Цель: экзамен.').content;
		expect(withContext.startsWith(AI_RULES)).toBe(true);
		expect(withContext.endsWith('Цель: экзамен.')).toBe(true);
	});
});
