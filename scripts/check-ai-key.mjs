// Asks the AI one tiny question with the key from .env and prints only ok or the reason.
// It never prints the key. Run from the repository root: node scripts/check-ai-key.mjs
import { readFileSync } from 'node:fs';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';
const MODEL = 'gemini-3.1-flash-lite';

const env = Object.fromEntries(
	readFileSync(new URL('../.env', import.meta.url), 'utf8')
		.split('\n')
		.filter((l) => /^[A-Z_]+=/.test(l))
		.map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);

if (!env.GEMINI_API_KEY) {
	console.log('нет ключа: поле GEMINI_API_KEY в .env пустое');
	process.exit(1);
}

try {
	const res = await fetch(`${BASE}/chat/completions`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GEMINI_API_KEY}` },
		body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: 'Ответь одним словом: да' }], max_tokens: 20 }),
		signal: AbortSignal.timeout(30_000)
	});
	if (!res.ok) {
		console.log(`ключ не подошёл или ИИ недоступен, код ответа ${res.status}`);
		process.exit(1);
	}
	const data = await res.json();
	console.log(typeof data.choices?.[0]?.message?.content === 'string' ? 'ok: ИИ отвечает' : 'ответ ИИ пустой');
} catch (err) {
	console.log(`не удалось связаться с ИИ: ${err instanceof Error ? err.message : 'ошибка'}`);
	process.exit(1);
}
