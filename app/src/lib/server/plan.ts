// Building a plan with the AI: ask, read the answer, set the dates; materials and link checks follow per stage.
import { daysUntil } from '../progress';
import { buildMaterialsMessages, buildPlanMessages, parseMaterials, parsePlan, schedulePlan, targetTaskCount, withSearchLinks, type PlanStage, type ScheduledStage } from '../plan';
import { askAi, type AiCaller, type AiEnv } from './ai';

const PLAN_TIMEOUT_MS = 90_000;
const PLAN_MAX_TOKENS = 8192;
const LINK_TIMEOUT_MS = 5_000;
const MAX_LINK_CHECKS = 30;
// Sites that refuse robots answer with these even when the page exists, so they do not count as broken.
const NOT_PROOF_OF_BROKEN = new Set([401, 403, 405, 429, 999]);

export type PlanError = 'not_available' | 'not_configured' | 'limit_reached' | 'service_busy' | 'ai_unavailable' | 'bad_answer' | 'deadline_passed';

export async function linkWorks(url: string, send: typeof fetch): Promise<boolean> {
	try {
		const res = await send(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(LINK_TIMEOUT_MS), headers: { 'user-agent': 'Mozilla/5.0 (compatible; NorthstarLinkCheck)' } });
		void res.body?.cancel();
		return res.status < 400 || NOT_PROOF_OF_BROKEN.has(res.status);
	} catch {
		return false;
	}
}

// The AI cannot be trusted with web addresses, so each one is opened. A material whose link
// fails keeps only its hint on where to look; with no hint it is dropped. Links beyond the
// check budget are not shown: an unchecked link is treated like a failed one.
export async function verifyLinks(stages: PlanStage[], send: typeof fetch = fetch): Promise<PlanStage[]> {
	const urls = [...new Set(stages.flatMap((s) => s.tasks.flatMap((t) => t.materials.map((m) => m.url)).filter((u): u is string => u !== null)))];
	const good = new Set<string>();
	const results = await Promise.all(urls.slice(0, MAX_LINK_CHECKS).map(async (u) => [u, await linkWorks(u, send)] as const));
	for (const [u, ok] of results) if (ok) good.add(u);
	return stages.map((s) => ({
		title: s.title,
		tasks: s.tasks.map((t) => ({
			...t,
			materials: t.materials
				.map((m) => (m.url && !good.has(m.url) ? { ...m, url: null } : m))
				.filter((m) => m.url !== null || m.source !== null)
		}))
	}));
}

// Second step, run per stage after the plan is shown: the AI names materials, every address is
// opened, and a task with no working page gets the search link. A stage the AI cannot answer
// still gets search links, so the plan is never left bare. Only a spent limit is an error.
export async function fillStageMaterials(
	env: AiEnv,
	caller: AiCaller,
	goal: { title: string },
	stage: PlanStage,
	send?: typeof fetch
): Promise<{ ok: true; stage: PlanStage } | { ok: false; error: PlanError }> {
	const answer = await askAi(env, caller, buildMaterialsMessages(goal, stage), { json: true, maxTokens: 3000, timeoutMs: 60_000, temperature: 0.3, fetch: send, allowMember: true });
	if (!answer.ok && (answer.error === 'limit_reached' || answer.error === 'service_busy' || answer.error === 'not_available')) return { ok: false, error: answer.error };
	const found = answer.ok ? parseMaterials(answer.content, stage.tasks.length) : null;
	const withMaterials: PlanStage = { ...stage, tasks: stage.tasks.map((t, j) => ({ ...t, materials: found?.[j] ?? t.materials })) };
	const [checked] = withSearchLinks(goal.title, await verifyLinks([withMaterials], send));
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
