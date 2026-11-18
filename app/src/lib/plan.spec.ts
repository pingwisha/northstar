import { describe, expect, it } from 'vitest';
import { MAX_TASKS, parseMaterials, parsePlan, schedulePlan, targetTaskCount, type PlanStage } from './plan';
import { daysUntil } from './progress';

const task = (title: string, weight = 1) => ({ title, weight, materials: [] });
const stages = (counts: number[], weight = 1): PlanStage[] => counts.map((n, i) => ({ title: `Этап ${i + 1}`, tasks: Array.from({ length: n }, (_, j) => task(`Задача ${i + 1}.${j + 1}`, weight)) }));

describe('parsePlan', () => {
	const ok = { stages: [{ title: 'Основы', tasks: [{ title: 'Прочитать главу', weight: 2, materials: [{ kind: 'video', title: 'Урок', url: 'https://example.com/a', source: 'Канал' }] }] }] };

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
		expect(r.stages[0].tasks[0].materials[0].kind).toBe('other');
	});

	it('keeps only https links and drops materials with neither a link nor a hint', () => {
		const r = parsePlan(JSON.stringify({ stages: [{ title: 'A', tasks: [{ title: 'x', materials: [
			{ kind: 'article', title: 'http', url: 'http://example.com', source: 'Сайт' },
			{ kind: 'article', title: 'junk', url: 'not a link', source: null },
			{ kind: 'article', title: 'ok', url: 'https://example.com/x' },
			{ title: '' }
		] }] }] }));
		if (!r.ok) throw new Error(r.error);
		expect(r.stages[0].tasks[0].materials.map((m) => [m.title, m.url])).toEqual([['http', null], ['ok', 'https://example.com/x']]);
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
	it('gives one list per task, in order, and empty lists for anything unusable', () => {
		const raw = JSON.stringify({ materials: [[{ kind: 'article', title: 'А', url: 'https://example.com/a' }], 'мусор'] });
		const r = parseMaterials(raw, 3);
		expect(r.map((l) => l.length)).toEqual([1, 0, 0]);
		expect(parseMaterials('не json', 2)).toEqual([[], []]);
		expect(parseMaterials('{"x":1}', 1)).toEqual([[]]);
	});

	it('keeps at most three materials per task', () => {
		const many = Array.from({ length: 6 }, (_, i) => ({ kind: 'other', title: `М${i}`, source: 'поиск' }));
		expect(parseMaterials(JSON.stringify({ materials: [many] }), 1)[0]).toHaveLength(3);
	});
});
