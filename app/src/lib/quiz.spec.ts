import { describe, expect, it } from 'vitest';
import { buildQuizMessages, MAX_QUIZ_QUESTIONS, parseQuiz } from './quiz';

describe('parseQuiz', () => {
	it('reads questions with answers, also from a fenced block', () => {
		const raw = '```json\n{"questions":[{"q":"Что такое дробь?","a":"Часть целого."},{"q":"Сколько будет 1/2 + 1/2?","a":"Один."}]}\n```';
		expect(parseQuiz(raw)).toEqual({ ok: true, questions: [{ question: 'Что такое дробь?', answer: 'Часть целого.' }, { question: 'Сколько будет 1/2 + 1/2?', answer: 'Один.' }] });
	});

	it('drops questions without an answer and gives up with fewer than two', () => {
		expect(parseQuiz('{"questions":[{"q":"А?","a":"Б"},{"q":"Без ответа"}]}')).toEqual({ ok: false });
		expect(parseQuiz('не json')).toEqual({ ok: false });
		expect(parseQuiz('{"questions":"нет"}')).toEqual({ ok: false });
	});

	it('keeps at most the allowed number and strips markup', () => {
		const many = Array.from({ length: 9 }, (_, i) => ({ q: `**Вопрос ${i}**`, a: `Ответ ${i}` }));
		const r = parseQuiz(JSON.stringify({ questions: many }));
		if (!r.ok) throw new Error('not ok');
		expect(r.questions).toHaveLength(MAX_QUIZ_QUESTIONS);
		expect(r.questions[0].question).not.toContain('*');
	});
});

describe('buildQuizMessages', () => {
	it('names the goal, the topic and what was studied lately', () => {
		const m = buildQuizMessages({ title: 'Сдать ОГЭ' }, 'Дроби', ['Сложение дробей'], 4);
		expect(m[0].content).toContain('Ровно 4');
		expect(m[1].content).toContain('Сдать ОГЭ');
		expect(m[1].content).toContain('Дроби');
		expect(m[1].content).toContain('Сложение дробей');
	});
});
