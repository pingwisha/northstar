import { error, fail } from '@sveltejs/kit';
import { todayIso } from '$lib/goals';
import { frequentTopics, MAX_MISTAKES_TOTAL, parseMistake } from '$lib/mistakes';
import { scoped } from '$lib/server/db';
import { appEnv } from '$lib/server/env';
import type { Actions, PageServerLoad } from './$types';

async function mine(locals: App.Locals, platform: App.Platform | undefined) {
	const env = await appEnv(platform);
	if (!env || !locals.userId) error(503, 'База данных не подключена');
	return scoped(env.DB, locals.userId);
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const me = await mine(locals, platform);
	const [goals, mistakes] = await Promise.all([me.listGoals(), me.listMistakes()]);
	const active = goals.filter((g) => g.status === 'active');
	const titles = new Map(goals.map((g) => [g.id, g.title]));
	const view = (m: (typeof mistakes)[number]) => ({ id: m.id, topic: m.topic, note: m.note, goalTitle: titles.get(m.goalId) ?? '', fixed: m.fixedAt !== null });
	return {
		goals: active.map((g) => ({ id: g.id, title: g.title })),
		open: mistakes.filter((m) => !m.fixedAt).map(view),
		fixed: mistakes.filter((m) => m.fixedAt).map(view),
		frequent: frequentTopics(mistakes)
	};
};

const field = (data: FormData, name: string) => String(data.get(name) ?? '');

export const actions: Actions = {
	add: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		const values = { goalId: field(data, 'goalId'), topic: field(data, 'topic'), note: field(data, 'note') };
		const parsed = parseMistake(values);
		if (!parsed.ok) return fail(400, { action: 'add', message: parsed.message, values });
		if ((await me.countMistakes()) >= MAX_MISTAKES_TOTAL) return fail(400, { action: 'add', message: `Можно хранить не больше ${MAX_MISTAKES_TOTAL} записей. Удали старые.`, values });
		if (!(await me.addMistake(values.goalId, parsed.value, todayIso(undefined, locals.timezone)))) return fail(404, { action: 'add', message: 'Выбери цель из списка.', values });
		return { action: 'add', ok: true };
	},

	fix: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		const data = await request.formData();
		if (!(await me.setMistakeFixed(field(data, 'id'), field(data, 'fixed') === '1', todayIso(undefined, locals.timezone)))) return fail(404, { action: 'fix', message: 'Такой записи нет.' });
		return { action: 'fix', ok: true };
	},

	delete: async ({ request, locals, platform }) => {
		const me = await mine(locals, platform);
		if (!(await me.deleteMistake(field(await request.formData(), 'id')))) return fail(404, { action: 'delete', message: 'Такой записи нет.' });
		return { action: 'delete', ok: true };
	}
};
