import { describe, expect, it } from 'vitest';
import { MAX_TASKS, parseMaterials, parsePlan, replan, schedulePlan, snapToStudyDay, spreadDates, targetTaskCount, withHelperFallback, type PlanStage, type PlanTask } from './plan';
import { daysUntil } from './progress';

const task = (title: string, weight = 1) => ({ title, weight, materials: [] });
const stages = (counts: number[], weight = 1): PlanStage[] => counts.map((n, i) => ({ title: `Этап ${i + 1}`, tasks: Array.from({ length: n }, (_, j) => task(`Задача ${i + 1}.${j + 1}`, weight)) }));

describe('parsePlan', () => {
	const ok = { stages: [{ title: 'Основы', tasks: [{ title: 'Прочитать главу', weight: 2, materials: [] }] }] };

	it('reads a valid plan, also inside a code fence', () => {
		for (const raw of [JSON.stringify(ok), '```json\n' + JSON.stringify(ok) + '\n```']) {
			const r = parsePlan(raw);
			expect(r.ok && r.stages[0].tasks[0]).toMatchObject({ title: 'Прочитать главу', weight: 2 });
		}
	});

	it('refuses what is not a plan', () => {
		for (const bad of ['привет', '{}', '{"stages":[]}', '{"stages":[{"title":"A","tasks":[]}]}', '{"stages":[{"title":"","tasks":[{"title":"x"}]}]}', '{"stages":[{"title":"A","tasks":["x"]}]}']) {
			expect(parsePlan(bad).ok, bad).toBe(false);
		}
	});

	it('refuses a plan with too many tasks', () => {
		const big = { stages: [{ title: 'A', tasks: Array.from({ length: MAX_TASKS + 1 }, (_, i) => ({ title: `t${i}` })) }] };
		expect(parsePlan(JSON.stringify(big))).toEqual({ ok: false, error: 'too_many_tasks' });
	});

	it('fixes small mistakes instead of failing: weight, kind, symbols in titles', () => {
		const r = parsePlan(JSON.stringify({ stages: [{ title: '**Старт**', tasks: [{ title: 'Решить (5 штук)', weight: 9, materials: [{ kind: 'podcast', title: 'Слушать', url: null, source: 'Поиск: подкаст' }] }] }] }));
		if (!r.ok) throw new Error(r.error);
		expect(r.stages[0].title).toBe('Старт');
		expect(r.stages[0].tasks[0]).toMatchObject({ title: 'Решить 5 штук', weight: 1 });
	});

	it('ignores materials inside the plan answer: they are asked for separately', () => {
		const r = parsePlan(JSON.stringify({ stages: [{ title: 'A', tasks: [{ title: 'x', materials: [{ kind: 'article', title: 'ok', url: 'https://example.com/x' }] }] }] }));
		if (!r.ok) throw new Error(r.error);
		expect(r.stages[0].tasks[0].materials).toEqual([]);
	});
});

describe('schedulePlan', () => {
	const today = '2026-11-18';
	const dates = (s: ReturnType<typeof schedulePlan>) => s.flatMap((st) => st.tasks.map((t) => t.plannedFor));

	it('puts every task between today and the deadline', () => {
		for (const deadline of ['2026-11-18', '2026-11-20', '2026-12-18', '2027-05-18']) {
			const out = schedulePlan(stages([5, 7, 4], 2), today, deadline);
			for (const d of dates(out)) {
				expect(d >= today && d <= deadline, `${d} for ${deadline}`).toBe(true);
			}
		}
	});

	it('keeps the order and starts today', () => {
		const d = dates(schedulePlan(stages([4, 4]), today, '2027-05-18'));
		expect(d[0]).toBe(today);
		expect([...d].sort()).toEqual(d);
	});

	it('leaves the last day free when there is at least a week', () => {
		const out = dates(schedulePlan(stages([10]), today, '2026-12-18'));
		expect(out.at(-1)! < '2026-12-18').toBe(true);
	});

	it('gives a heavy task more room before the next one', () => {
		const out = schedulePlan([{ title: 'A', tasks: [task('тяжёлая', 3), task('лёгкая', 1)] }], today, '2026-12-18');
		const [a, b] = out[0].tasks.map((t) => daysUntil(today, t.plannedFor));
		expect(a).toBe(0);
		expect(b).toBeGreaterThanOrEqual(20);
	});

	it('dates each stage by its last task', () => {
		const out = schedulePlan(stages([2, 2]), today, '2027-05-18');
		expect(out[0].dueDate).toBe(out[0].tasks[1].plannedFor);
	});

	it('works for a one-day goal', () => {
		expect(new Set(dates(schedulePlan(stages([3]), today, today)))).toEqual(new Set([today]));
	});
});

describe('targetTaskCount', () => {
	it('is about one per day, between 3 and the maximum', () => {
		expect(targetTaskCount(1)).toBe(3);
		expect(targetTaskCount(20)).toBe(20);
		expect(targetTaskCount(400)).toBe(MAX_TASKS);
	});
});

describe('parseMaterials', () => {
	it('builds the address from a listed site, one list per task, empty lists for anything unusable', () => {
		const raw = JSON.stringify({ materials: [[{ kind: 'trainer', title: 'Задания', site: 'oge-rus', query: 'ударения' }], 'мусор'] });
		const r = parseMaterials(raw, 3);
		expect(r.map((l) => l.length)).toEqual([1, 0, 0]);
		expect(r[0][0]).toEqual({ kind: 'trainer', title: 'Задания', url: 'https://rus-oge.sdamgia.ru/search?search=' + encodeURIComponent('ударения'), source: 'Решу ОГЭ: русский язык' });
		expect(parseMaterials('не json', 2)).toEqual([[], []]);
		expect(parseMaterials('{"x":1}', 1)).toEqual([[]]);
	});

	it('takes a ready page from the list by its id and nothing else', () => {
		const raw = JSON.stringify({ materials: [[{ kind: 'trainer', title: 'Тексты', page: 'oge-rus-interview-texts' }, { kind: 'trainer', title: 'Чужая', page: 'https://evil.example/' }]] });
		const r = parseMaterials(raw, 1)[0];
		expect(r).toEqual([{ kind: 'trainer', title: 'Тексты', url: 'https://ruso-oge.sdamgia.ru/test?theme=2', source: 'Решу ОГЭ: тексты итогового собеседования' }]);
	});

	it('never takes an address written by the AI, and drops a site that is not in the list', () => {
		const raw = JSON.stringify({ materials: [[
			{ kind: 'article', title: 'Выдумка', url: 'https://evil.example/x', source: 'Блог' },
			{ kind: 'article', title: 'Чужой сайт', site: 'evil', query: 'x', url: 'https://evil.example/y' },
			{ kind: 'article', title: 'Смесь', site: 'khan', query: 'дроби', url: 'https://evil.example/z' }
		]] });
		const r = parseMaterials(raw, 1)[0];
		expect(r.map((m) => m.title)).toEqual(['Смесь']);
		expect(r[0].url?.startsWith('https://ru.khanacademy.org/')).toBe(true);
	});

	it('keeps at most three materials per task', () => {
		const many = Array.from({ length: 6 }, (_, i) => ({ kind: 'other', title: `М${i}`, site: 'youtube', query: 'тема' }));
		expect(parseMaterials(JSON.stringify({ materials: [many] }), 1)[0]).toHaveLength(3);
	});
});

describe('replan', () => {
	const t = (id: string, plannedFor: string, done = false, weight = 1) => ({ id, plannedFor, weight, done });
	const today = '2026-11-18';

	it('moves overdue tasks into the days left, never past the deadline', () => {
		const tasks = [t('1', '2026-11-10'), t('2', '2026-11-11'), t('3', '2026-11-12'), t('4', '2026-11-13')];
		const r = replan(tasks, today, '2026-11-30');
		expect(r.changed).toBe(true);
		expect(r.moves.every((m) => m.to >= today && m.to < '2026-11-30')).toBe(true);
		expect(r.summary).toContain('Просроченных было 4');
	});

	it('leaves done tasks alone and keeps the order of the open ones', () => {
		const tasks = [t('1', '2026-11-10', true), t('2', '2026-11-11'), t('3', '2026-11-12')];
		const r = replan(tasks, today, '2026-12-18');
		expect(r.moves.find((m) => m.id === '1')).toBeUndefined();
		const dates = r.moves.map((m) => m.to);
		expect([...dates].sort()).toEqual(dates);
	});

	it('says nothing to do when all is done or already even', () => {
		expect(replan([t('1', '2026-11-10', true)], today, '2026-12-18')).toMatchObject({ changed: false, moves: [] });
		const first = replan([t('1', '2026-11-10'), t('2', '2026-11-11')], today, '2026-12-18');
		const settled = [t('1', first.moves[0].to), t('2', first.moves[1].to)];
		expect(replan(settled, today, '2026-12-18').changed).toBe(false);
	});

	it('warns when the load is heavy', () => {
		const tasks = Array.from({ length: 20 }, (_, i) => t(String(i), '2026-11-01'));
		expect(replan(tasks, today, '2026-11-22').summary).toContain('подвинуть срок');
	});
});

describe('study days', () => {
	// 2026-11-20 is a Friday. Monday-Wednesday-Friday = 1 + 4 + 16 = 21.
	const MWF = 21;
	const dayOf = (iso: string) => ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][new Date(`${iso}T00:00:00Z`).getUTCDay()];

	it('puts every task on a study day and keeps the order', () => {
		const dates = spreadDates(Array(12).fill(1), '2026-11-20', '2026-12-20', MWF);
		for (const d of dates) expect(['Пн', 'Ср', 'Пт']).toContain(dayOf(d));
		expect([...dates].sort()).toEqual(dates);
	});

	it('never goes past the deadline, falling back to the last study day', () => {
		// Deadline on a Sunday, only Monday studied: the last Monday before it.
		const dates = spreadDates([1, 1, 1], '2026-11-20', '2026-11-22', 1);
		for (const d of dates) expect(d <= '2026-11-22').toBe(true);
	});

	it('leaves the dates alone when no study day fits before the deadline', () => {
		expect(snapToStudyDay('2026-11-21', '2026-11-20', '2026-11-21', 1)).toBe('2026-11-21');
	});

	it('changes nothing when every day is a study day', () => {
		expect(spreadDates([1, 1, 1], '2026-11-20', '2026-12-20')).toEqual(spreadDates([1, 1, 1], '2026-11-20', '2026-12-20', 127));
	});
});

describe('the helper for tasks without a page', () => {
	const stage = (materials: PlanTask['materials']): PlanStage[] => [{ title: 'Этап', tasks: [{ title: 'Решить задачи', weight: 1, materials }] }];

	it('gives a task with no material the site\'s own AI helper, never a web search', () => {
		const [s] = withHelperFallback(stage([]));
		expect(s.tasks[0].materials).toEqual([{ kind: 'other', title: 'Разобрать задачу с ИИ-помощником', url: '/chat', source: 'Northstart' }]);
	});

	it('leaves a task that already has a material alone', () => {
		const own = [{ kind: 'article' as const, title: 'Статья', url: 'https://example.com/a', source: null }];
		expect(withHelperFallback(stage(own))[0].tasks[0].materials).toEqual(own);
	});
});
