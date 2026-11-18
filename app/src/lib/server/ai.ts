// The only place that talks to the AI provider. It runs on the server, so the key
// (GEMINI_API_KEY, a secret) never reaches a page. The address and the model are fixed
// here: no request from a browser can name another host or carry its own key.
//
// For now the AI is for the owner only; members get "not_available".

export const AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export const DEFAULT_DAILY_LIMIT = 50;
const TIMEOUT_MS = 30_000;
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 20_000;

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface AiEnv {
	DB: D1Database;
	GEMINI_API_KEY?: string;
	AI_MODEL?: string;
	DAILY_LIMIT?: string;
}

export interface AiCaller {
	userId: string;
	role: 'owner' | 'member';
}

export type AiResult =
	| { ok: true; content: string }
	| { ok: false; error: 'not_available' | 'not_configured' | 'invalid_messages' | 'limit_reached' | 'ai_unavailable' };

export interface AiOptions {
	temperature?: number;
	maxTokens?: number;
	fetch?: typeof fetch;
	now?: () => Date;
}

const utcDay = (now: Date): string => now.toISOString().slice(0, 10);

export function limitOf(raw: unknown): number {
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
}

// Takes one request from the person's budget for the day, atomically.
// Returns false, and changes nothing, when the budget is used up.
export async function reserve(db: D1Database, userId: string, day: string, limit: number): Promise<boolean> {
	const row = await db
		.prepare('INSERT INTO ai_usage (user_id, day, count) VALUES (?1, ?2, 1) ON CONFLICT (user_id, day) DO UPDATE SET count = count + 1 WHERE count < ?3 RETURNING count')
		.bind(userId, day, limit)
		.first<{ count: number }>();
	return row !== null;
}

export async function usedToday(db: D1Database, userId: string, now: Date = new Date()): Promise<number> {
	const row = await db.prepare('SELECT count FROM ai_usage WHERE user_id = ? AND day = ?').bind(userId, utcDay(now)).first<{ count: number }>();
	return row?.count ?? 0;
}

function validMessages(messages: ChatMessage[]): boolean {
	return (
		messages.length >= 1 &&
		messages.length <= MAX_MESSAGES &&
		messages.every((m) => ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= MAX_MESSAGE_LENGTH)
	);
}

export async function askAi(env: AiEnv, caller: AiCaller, messages: ChatMessage[], options: AiOptions = {}): Promise<AiResult> {
	if (caller.role !== 'owner') return { ok: false, error: 'not_available' };
	if (!env.GEMINI_API_KEY) return { ok: false, error: 'not_configured' };
	if (!validMessages(messages)) return { ok: false, error: 'invalid_messages' };

	const now = (options.now ?? (() => new Date()))();
	// A request is counted when it is sent on, even if the provider then fails.
	if (!(await reserve(env.DB, caller.userId, utcDay(now), limitOf(env.DAILY_LIMIT)))) return { ok: false, error: 'limit_reached' };

	try {
		// Taken into a variable first: the platform's fetch refuses to run as a method of an object.
		const send = options.fetch ?? fetch;
		const res = await send(`${AI_BASE_URL}/chat/completions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GEMINI_API_KEY}` },
			body: JSON.stringify({
				model: env.AI_MODEL || DEFAULT_MODEL,
				messages,
				...(options.temperature !== undefined && { temperature: options.temperature }),
				...(options.maxTokens !== undefined && { max_tokens: options.maxTokens })
			}),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (!res.ok) return { ok: false, error: 'ai_unavailable' };
		const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
		const content = data.choices?.[0]?.message?.content;
		if (typeof content !== 'string' || !content.trim()) return { ok: false, error: 'ai_unavailable' };
		return { ok: true, content };
	} catch {
		return { ok: false, error: 'ai_unavailable' };
	}
}
