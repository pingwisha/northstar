// Building a plan with the AI: ask, read the answer, set the dates; materials and link checks follow per stage.
import { daysUntil } from '../progress';
import { buildMaterialsMessages, buildPlanMessages, parseMaterials, parsePlan, schedulePlan, targetTaskCount, withHelperFallback, type PlanStage, type ScheduledStage } from '../plan';
import { askAi, type AiCaller, type AiEnv } from './ai';
import { makeConcrete } from './resolve';

const PLAN_TIMEOUT_MS = 90_000;
const PLAN_MAX_TOKENS = 8192;
export type PlanError = 'not_available' | 'not_configured' | 'limit_reached' | 'service_busy' | 'ai_unavailable' | 'bad_answer' | 'deadline_passed';

// Second step, run per stage after the plan is shown: the AI picks sites from the verified list
// (the code builds the addresses), and a task with no material gets the search link. A stage the AI cannot answer
// still gets search links, so the plan is never left bare. Only a spent limit is an error.
export async function fillStageMaterials(
	env: AiEnv,
	caller: AiCaller,
	goal: { title: string },
	stage: PlanStage,
	send?: typeof fetch
): Promise<{ ok: true; stage: PlanStage } | { ok: false; error: PlanError }> {
	const ask = async (tasks: PlanStage['tasks']) => {
		const answer = await askAi(env, caller, buildMaterialsMessages(goal, { ...stage, tasks }), { json: true, maxTokens: 3000, timeoutMs: 60_000, temperature: 0.3, fetch: send, allowMember: true });
		return answer;
	};
	const stop = (e: string) => e === 'limit_reached' || e === 'service_busy' || e === 'not_available';
	const first = await ask(stage.tasks);
	if (!first.ok && stop(first.error)) return { ok: false, error: first.error as PlanError };
	const found = first.ok ? parseMaterials(first.content, stage.tasks.length) : null;
	let tasks = stage.tasks.map((t, j) => ({ ...t, materials: found?.[j] ?? t.materials }));

	// One more try for the tasks that got nothing, with only those tasks in front of the AI.
	const empty = tasks.map((t, j) => [t, j] as const).filter(([t]) => t.materials.length === 0);
	if (empty.length > 0) {
		const second = await ask(empty.map(([t]) => t));
		if (!second.ok && stop(second.error)) return { ok: false, error: second.error as PlanError };
		const again = second.ok ? parseMaterials(second.content, empty.length) : null;
		tasks = tasks.map((t, j) => {
			const k = empty.findIndex(([, idx]) => idx === j);
			return k >= 0 && again?.[k]?.length ? { ...t, materials: again[k] } : t;
		});
	}

	// A search address becomes the page itself where the site allows it (resolve.ts); the rest stays.
	const resolved = await Promise.all(tasks.map((t) => makeConcrete(t, send)));
	const [checked] = withHelperFallback([{ ...stage, tasks: resolved }]);
	return { ok: true, stage: checked };
}

export interface PlanDeps {
	fetch?: typeof fetch;
}

export async function generatePlan(
	env: AiEnv,
	caller: AiCaller,
	goal: { title: string; description: string | null; deadline: string; study_days?: number },
	today: string,
	deps: PlanDeps = {}
): Promise<{ ok: true; stages: ScheduledStage[]; draft: PlanStage[]; missingMaterials: number } | { ok: false; error: PlanError }> {
	const days = daysUntil(today, goal.deadline);
	if (days < 0) return { ok: false, error: 'deadline_passed' };
	const messages = buildPlanMessages(goal, today, targetTaskCount(days + 1));

	// One retry when the answer is not a usable plan: the AI sometimes breaks the format.
	for (let attempt = 0; attempt < 2; attempt++) {
		const answer = await askAi(env, caller, messages, { json: true, maxTokens: PLAN_MAX_TOKENS, timeoutMs: PLAN_TIMEOUT_MS, temperature: 0.4, fetch: deps.fetch, allowMember: true });
		if (!answer.ok) {
			if (answer.error === 'invalid_messages') return { ok: false, error: 'bad_answer' };
			return { ok: false, error: answer.error };
		}
		const parsed = parsePlan(answer.content);
		if (!parsed.ok) continue;
		// Materials come later, stage by stage (fillStageMaterials), so the plan appears quickly.
		return { ok: true, stages: schedulePlan(parsed.stages, today, goal.deadline, goal.study_days), draft: parsed.stages, missingMaterials: parsed.stages.length };
	}
	return { ok: false, error: 'bad_answer' };
}
