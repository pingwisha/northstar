// The self-check: the AI asks a few short questions on a topic, the person answers in their head,
// looks at the answer and says whether they remembered. Pure: no database, no network.
export const MAX_QUIZ_QUESTIONS = 5;
export const MAX_QUIZ_TOPIC = 80;
const MAX_QUESTION = 300;
const MAX_ANSWER = 500;

export interface QuizQuestion {
	question: string;
	answer: string;
}

export function buildQuizMessages(goal: { title: string }, topic: string, recent: string[], count: number) {
	const system = [
		'Ты помогаешь человеку проверить себя. Отвечай только одним JSON объектом, без пояснений.',
		`Формат: {"questions":[{"q":"вопрос","a":"короткий правильный ответ"}]}. Ровно ${count} вопросов, от простых к более сложным.`,
		'Вопросы короткие и по делу, на которые можно ответить за минуту. Ответ один или два предложения.',
		'Пиши простым русским текстом без звёздочек и решёток. Не придумывай факты: если не уверен, задай более общий вопрос.'
	].join('\n');
	const lines = [`Цель человека: ${goal.title}`, `Тема проверки: ${topic}`];
	if (recent.length > 0) lines.push('Что человек недавно прошёл:', ...recent.map((t) => `- ${t}`));
	return [
		{ role: 'system' as const, content: system },
		{ role: 'user' as const, content: lines.join('\n') }
	];
}

// Only markup is removed: a question may need a slash or brackets (1/2, f(x)). The page shows it as plain text.
const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[*#`]/g, '').replace(/\s+/g, ' ').slice(0, max).trim() : '');

// Reads the AI answer. Questions without an answer are dropped; fewer than two good ones is a failure.
export function parseQuiz(raw: string): { ok: true; questions: QuizQuestion[] } | { ok: false } {
	try {
		const data: unknown = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
		const list = typeof data === 'object' && data !== null ? (data as { questions?: unknown }).questions : undefined;
		if (!Array.isArray(list)) return { ok: false };
		const questions = list
			.map((item): QuizQuestion => {
				const o = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
				return { question: clean(o.q, MAX_QUESTION), answer: clean(o.a, MAX_ANSWER) };
			})
			.filter((q) => q.question && q.answer)
			.slice(0, MAX_QUIZ_QUESTIONS);
		return questions.length >= 2 ? { ok: true, questions } : { ok: false };
	} catch {
		return { ok: false };
	}
}
