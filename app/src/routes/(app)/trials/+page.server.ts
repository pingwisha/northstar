import { error, fail } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import { parseTrial, summarizeTrials, scoreText } from '$lib/trials';
import type { Actions, PageServerLoad } from './$types';

async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, locals.userId);
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const me = await mine(locals, platform);
	const [goals, trials] = await Promise.all([me.listGoals(), me.listTrials()]);
	const titles = new Map(goals.map((g) => [g.id, g.title]));
	const goalsWithTrials = goals.filter((g) => g.status === 'active' || trials.some((t) => t.goalId === g.id));
	return {
		today: todayIso(),
		activeGoals: goals.filter((g) => g.status === 'active').map((g) => ({ id: g.id, title: g.title })),
		// One block per goal: its own chart and weak topics.
		blocks: goalsWithTrials.map((g) => {
			const own = trials.filter((t) => t.goalId === g.id);
			return {
				goalId: g.id,
				goalTitle: titles.get(g.id)!,
				summary: summarizeTrials(own),
				// Newest first for the list.
				list: [...own].reverse().map((t) => ({ id: t.id, title: t.title, takenOn: t.takenOn, text: scoreText(t), weakTopics: t.weakTopics }))
			};
		})
	};
};

const field = (data: FormData, name: string) => String(data.get(name) ?? '');

export const actions: Actions = {
	add: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const values = { goalId: field(data, 'goalId'), title: field(data, 'title'), day: field(data, 'day'), score: field(data, 'score'), maxScore: field(data, 'maxScore'), topics: field(data, 'topics') };
		const parsed = parseTrial(values, todayIso());
		if (!parsed.ok) return fail(400, { action: 'add', message: parsed.message, values });
		if (!(await me.addTrial(values.goalId, parsed.value))) return fail(404, { action: 'add', message: 'Выбери цель из списка.', values });
		return { action: 'add', ok: true };
	},

	delete: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const id = field(await request.formData(), 'id');
		if (!(await me.deleteTrial(id))) return fail(404, { action: 'delete', message: 'Такого результата нет.' });
		return { action: 'delete', ok: true };
	}
};
