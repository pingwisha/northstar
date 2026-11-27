import { error, fail } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { MAX_MISTAKES_TOTAL, parseMistake } from '$lib/mistakes';
import { buildQuizMessages, MAX_QUIZ_QUESTIONS, MAX_QUIZ_TOPIC, parseQuiz } from '$lib/quiz';
import { askAi, type AiResult } from '$lib/server/ai';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return { env, me: scoped(env.DB, locals.userId) };
}

type AiError = Extract<AiResult, { ok: false }>['error'];
const MESSAGES: Record<AiError, string> = {
	not_available: 'Эта функция пока недоступна.',
	not_configured: 'ИИ ещё не подключён: нет ключа.',
	invalid_messages: 'Не удалось составить вопросы. Попробуй ещё раз.',
	limit_reached: 'На сегодня твой лимит запросов к ИИ исчерпан. Попробуй завтра.',
	service_busy: 'Сегодня ИИ слишком загружен у всех. Попробуй завтра.',
	ai_unavailable: 'ИИ сейчас не отвечает. Попробуй через несколько минут.'
};

const field = (data: FormData, name: string) => String(data.get(name) ?? '');

// What the person finished lately on a goal: the best hint for what to check.
const RECENT = 5;

export const load: PageServerLoad = async ({ locals, platform }) => {
	const { me } = await mine(locals, platform);
	const [goals, tasks] = await Promise.all([me.listGoals(), me.listGoalTasks()]);
	return {
		goals: goals
			.filter((g) => g.status === 'active')
			.map((g) => ({
				id: g.id,
				title: g.title,
				recent: tasks
					.filter((t) => t.goal_id === g.id && t.completed_at)
					.sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
					.slice(0, RECENT)
					.map((t) => t.title)
			}))
	};
};

export const actions: Actions = {
	// Asks the AI for a few questions. Nothing is stored: the questions live on the page only.
	ask: async ({ request, locals, platform }) => {
		const { env, me } = await mine(locals, platform);
		const data = await request.formData();
		const goalId = field(data, 'goalId');
		const goal = (await me.listGoals()).find((g) => g.id === goalId && g.status === 'active');
		if (!goal) return fail(404, { action: 'ask', message: 'Выбери цель из списка.' });
		const topic = field(data, 'topic').trim().replace(/\s+/g, ' ').slice(0, MAX_QUIZ_TOPIC);
		const recent = (await me.listGoalTasks())
			.filter((t) => t.goal_id === goal.id && t.completed_at)
			.sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
			.slice(0, RECENT)
			.map((t) => t.title);
		// Without a topic the check covers the goal itself and what was done lately.
		const messages = buildQuizMessages(goal, topic || goal.title, recent, MAX_QUIZ_QUESTIONS - 1);

		for (let attempt = 0; attempt < 2; attempt++) {
			const answer = await askAi(env, { userId: locals.userId!, role: locals.role ?? 'member' }, messages, { json: true, maxTokens: 1200, temperature: 0.5, allowMember: true });
			if (!answer.ok) return fail(answer.error === 'not_available' ? 403 : 502, { action: 'ask', message: MESSAGES[answer.error] });
			const parsed = parseQuiz(answer.content);
			if (parsed.ok) return { action: 'ask', ok: true, goalId, topic: topic || goal.title, questions: parsed.questions };
		}
		return fail(502, { action: 'ask', message: 'ИИ не смог составить вопросы в нужном виде. Попробуй ещё раз.' });
	},

	// "I did not remember": the question goes to the mistake notebook.
	miss: async ({ request, locals, platform }) => {
		const { me } = await mine(locals, platform);
		const data = await request.formData();
		const goalId = field(data, 'goalId');
		const parsed = parseMistake({ topic: field(data, 'topic'), note: field(data, 'question') });
		if (!parsed.ok) return fail(400, { action: 'miss', message: parsed.message });
		if ((await me.countMistakes()) >= MAX_MISTAKES_TOTAL) return fail(400, { action: 'miss', message: `В тетради уже ${MAX_MISTAKES_TOTAL} записей. Удали старые.` });
		if (!(await me.addMistake(goalId, parsed.value, todayIso(undefined, locals.timezone)))) return fail(404, { action: 'miss', message: 'Такой цели нет.' });
		return { action: 'miss', ok: true };
	}
};
