import { describe, expect, it } from 'vitest';
import { AI_RULES, linksIn, plainText, splitLinks, systemMessage } from './ai-text';

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

describe('links in chat text', () => {
	it('keeps a web address whole while cleaning the text around it', () => {
		expect(plainText('Смотри **здесь** (тут): https://oge.sdamgia.ru/test?id=1&x=2, потом дальше.')).toBe('Смотри здесь тут: https://oge.sdamgia.ru/test?id=1&x=2, потом дальше.');
	});

	it('does not take the full stop of a sentence into the address', () => {
		expect(linksIn('Открой https://example.com/a.')).toEqual(['https://example.com/a']);
		expect(plainText('Открой https://example.com/a.')).toBe('Открой https://example.com/a.');
	});

	it('splits a text into pieces and links', () => {
		expect(splitLinks('до https://a.ru/x после')).toEqual([{ text: 'до ' }, { text: 'https://a.ru/x', href: 'https://a.ru/x' }, { text: ' после' }]);
		expect(splitLinks('без ссылок')).toEqual([{ text: 'без ссылок' }]);
	});
});

describe('the AI rules', () => {
	it('say the things the product promises', () => {
		for (const phrase of ['звёздочки', 'не знаю', 'требовательный', 'личные данные', 'Не придумывай задачи', 'не отказывай']) {
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
