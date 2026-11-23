import { error, fail } from '@sveltejs/kit';
import { linksIn, plainText, systemMessage } from '$lib/ai-text';
import { buildChatContext } from '$lib/chat-context';
import { todayIso } from '$lib/goals';
import { askAi, type ChatMessage } from '$lib/server/ai';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

const MAX_QUESTION = 2000;
// How many earlier messages go back to the AI with a new question.
const HISTORY = 20;

const MESSAGES = {
	not_available: 'Эта функция пока недоступна.',
	not_configured: 'ИИ ещё не подключён: нет ключа.',
	limit_reached: 'На сегодня лимит запросов к ИИ исчерпан. Попробуй завтра.',
	service_busy: 'Сегодня ИИ слишком загружен. Попробуй завтра.',
	ai_unavailable: 'ИИ сейчас не отвечает. Попробуй через несколько минут.',
	invalid_messages: 'Сообщение не получилось отправить. Попробуй короче.'
} as const;

async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return { env, me: scoped(env.DB, locals.userId) };
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const { me } = await mine(locals, platform);
	const chatId = await me.currentChat();
	return { canChat: true, messages: chatId ? await me.chatMessages(chatId) : [] };
};

export const actions: Actions = {
	send: async ({ request, locals, platform }) => {
		const { env, me } = await mine(locals, platform);
		const question = String((await request.formData()).get('text') ?? '').trim();
		if (!question) return fail(400, { message: 'Напиши сообщение.', text: question });
		if (question.length > MAX_QUESTION) return fail(400, { message: `Сообщение длиннее ${MAX_QUESTION} знаков. Напиши короче.`, text: question });

		const chatId = (await me.currentChat()) ?? (await me.createChat());
		const history = (await me.chatMessages(chatId, HISTORY)).map((m): ChatMessage => ({ role: m.role, content: m.content }));
		const today = todayIso(undefined, locals.timezone);
		const [goals, tasks, materials] = await Promise.all([me.listGoals(), me.listGoalTasks(), me.listMaterials()]);
		const messages: ChatMessage[] = [systemMessage(buildChatContext(goals, tasks, today, materials)), ...history, { role: 'user', content: question }];

		const result = await askAi(env, { userId: locals.userId!, role: locals.role ?? 'member' }, messages, { temperature: 0.5, maxTokens: 700, allowMember: true });
		if (!result.ok) return fail(result.error === 'not_available' ? 403 : 502, { message: MESSAGES[result.error], text: question });

		// Only addresses from the person's own materials may reach the page: the AI cannot add its own.
		const known = new Set(materials.map((m) => m.url).filter((u): u is string => u !== null));
		let answer = plainText(result.content);
		for (const link of linksIn(answer)) if (!known.has(link)) answer = answer.split(link).join('ссылка не из плана');
		await me.addExchange(chatId, question, answer || 'Не знаю, что ответить. Спроси иначе.');
		return { ok: true };
	},

	fresh: async ({ locals, platform }) => {
		const { me } = await mine(locals, platform);
		await me.createChat();
		return { ok: true };
	}
};
