// The only place that talks to the AI provider. It runs on the server, so the key
// (GEMINI_API_KEY, a secret) never reaches a page. The address and the model are fixed
// here: no request from a browser can name another host or carry its own key.
//
// Everyone may ask (plan, chat, weekly comment). Members spend a smaller daily budget of their
// own, and all members together share one cap for the whole site, so a crowd of newcomers cannot
// run up the bill. The owner has the larger budget and is not held back by the members' cap.

export const AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export const FALLBACK_MODEL = 'gemini-3.5-flash-lite';
// Statuses after which another model is worth a try: busy, rate-limited, gone.
const RETRY_STATUS = new Set([404, 429, 500, 502, 503, 504]);
export const DEFAULT_DAILY_LIMIT = 50;
export const DEFAULT_MEMBER_DAILY_LIMIT = 30;
export const DEFAULT_MEMBERS_TOTAL_LIMIT = 300;
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
	// Requests per member per day, and for all members together per day.
	MEMBER_DAILY_LIMIT?: string;
	MEMBERS_TOTAL_LIMIT?: string;
}

export interface AiCaller {
	userId: string;
	role: 'owner' | 'member';
}

export type AiResult =
	| { ok: true; content: string }
	| { ok: false; error: 'not_available' | 'not_configured' | 'invalid_messages' | 'limit_reached' | 'service_busy' | 'ai_unavailable' };

export interface AiOptions {
	temperature?: number;
	maxTokens?: number;
	// Ask for a JSON object (used for plans); chat answers are plain text.
	json?: boolean;
	// This request may be made for a member too (building a plan).
	allowMember?: boolean;
	timeoutMs?: number;
	fetch?: typeof fetch;
	now?: () => Date;
}

const utcDay = (now: Date): string => now.toISOString().slice(0, 10);

export function limitOf(raw: unknown, fallback: number = DEFAULT_DAILY_LIMIT): number {
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : fallback;
}

// What every member together has asked for today (the owner's own requests are not counted).
export async function membersUsedToday(db: D1Database, day: string): Promise<number> {
	const row = await db
		.prepare("SELECT COALESCE(SUM(u.count), 0) AS n FROM ai_usage u JOIN users x ON x.id = u.user_id WHERE u.day = ? AND x.role != 'owner'")
		.bind(day)
		.first<{ n: number }>();
	return row?.n ?? 0;
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
	const isOwner = caller.role === 'owner';
	if (!isOwner && !options.allowMember) return { ok: false, error: 'not_available' };
	if (!env.GEMINI_API_KEY) return { ok: false, error: 'not_configured' };
	if (!validMessages(messages)) return { ok: false, error: 'invalid_messages' };

	const now = (options.now ?? (() => new Date()))();
	const day = utcDay(now);
	if (!isOwner && (await membersUsedToday(env.DB, day)) >= limitOf(env.MEMBERS_TOTAL_LIMIT, DEFAULT_MEMBERS_TOTAL_LIMIT)) return { ok: false, error: 'service_busy' };
	const limit = isOwner ? limitOf(env.DAILY_LIMIT) : limitOf(env.MEMBER_DAILY_LIMIT, DEFAULT_MEMBER_DAILY_LIMIT);
	// A request is counted when it is sent on, even if the provider then fails.
	if (!(await reserve(env.DB, caller.userId, day, limit))) return { ok: false, error: 'limit_reached' };

	// Taken into a variable first: the platform's fetch refuses to run as a method of an object.
	const send = options.fetch ?? fetch;
	// When the provider is overloaded or has retired a model, the next model in the row is tried.
	// One request from the budget covers all the tries.
	const models = [env.AI_MODEL || DEFAULT_MODEL, FALLBACK_MODEL].filter((m, i, all) => all.indexOf(m) === i);
	for (const model of models) {
		try {
			const res = await send(`${AI_BASE_URL}/chat/completions`, {
				method: 'POST',
				headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GEMINI_API_KEY}` },
				body: JSON.stringify({
					model,
					messages,
					...(options.temperature !== undefined && { temperature: options.temperature }),
					...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
					...(options.json && { response_format: { type: 'json_object' } })
				}),
				signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS)
			});
			if (!res.ok) {
				if (RETRY_STATUS.has(res.status)) continue;
				return { ok: false, error: 'ai_unavailable' };
			}
			const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
			const content = data.choices?.[0]?.message?.content;
			if (typeof content !== 'string' || !content.trim()) continue;
			return { ok: true, content };
		} catch {
			// A timeout or a network error: try the next model too.
		}
	}
	return { ok: false, error: 'ai_unavailable' };
}
