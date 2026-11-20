import { error, fail } from '@sveltejs/kit';
import { plainText, systemMessage } from '$lib/ai-text';
import { todayIso } from '$lib/goals';
import { askAi } from '$lib/server/ai';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import { buildWeekly, numbersAreKnown, weeklyContext } from '$lib/weekly';
import type { Actions, PageServerLoad } from './$types';

const MESSAGES = {
	not_available: 'ИИ пока доступен только владельцу сайта.',
	not_configured: 'ИИ ещё не подключён: нет ключа.',
	limit_reached: 'На сегодня лимит запросов к ИИ исчерпан. Попробуй завтра.',
	ai_unavailable: 'ИИ сейчас не отвечает. Попробуй через несколько минут.',
	invalid_messages: 'Не получилось отправить запрос. Попробуй позже.'
} as const;

async function report(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	const me = scoped(env.DB, locals.userId);
	const [goals, tasks, trials] = await Promise.all([me.listGoals(), me.listGoalTasks(), me.listTrials()]);
	return { env, weekly: buildWeekly(goals, tasks, trials, todayIso(undefined, locals.timezone), locals.timezone) };
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const { weekly } = await report(locals, platform);
	return { weekly, canAi: locals.role === 'owner' };
};

export const actions: Actions = {
	// The AI comments on the numbers above; a comment with a number that is not in the report is thrown away.
	comment: async ({ locals, platform }) => {
		const { env, weekly } = await report(locals, platform);
		if (weekly.goals.length === 0) return fail(400, { message: 'Нет активных целей, комментировать нечего.' });
		const context = weeklyContext(weekly);
		const result = await askAi(env, { userId: locals.userId!, role: locals.role ?? 'member' }, [systemMessage(context), { role: 'user', content: 'Напиши итог недели по отчёту.' }], { temperature: 0.4, maxTokens: 500 });
		if (!result.ok) return fail(result.error === 'not_available' ? 403 : 502, { message: MESSAGES[result.error] });
		const comment = plainText(result.content);
		if (!comment) return fail(502, { message: 'ИИ ничего не написал. Попробуй ещё раз.' });
		if (!numbersAreKnown(comment, context)) return fail(502, { message: 'ИИ назвал число, которого нет в отчёте, и я не стала его показывать. Попробуй ещё раз.' });
		return { ok: true, comment };
	}
};
