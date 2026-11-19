// What goes into the AI's instructions and what comes back out of it.
import rules from './ai-rules.txt?raw';

// The rules live in ai-rules.txt, so they can be changed without touching the code.
export const AI_RULES: string = rules.trim();

export interface SystemMessage {
	role: 'system';
	content: string;
}

// The system message of every conversation: the rules, then what the AI knows about the person.
export function systemMessage(context?: string): SystemMessage {
	return { role: 'system', content: context ? `${AI_RULES}\n\n${context.trim()}` : AI_RULES };
}

const FORBIDDEN = /[*#`()[\]{}/\\]/g;

// A web address, up to the first space. Punctuation that ends a sentence is not part of it.
export const LINK = /https:\/\/[^\s<>"'«»]+/g;
const TRAILING = /[.,;:!?]+$/;

// A safety net for text shown in the chat: the rules ask the AI not to use stars, hashes,
// brackets or slashes, and this removes any that slip through. Web addresses are kept whole,
// because a link with a slash removed does not open. Not for JSON, which has its own fields.
export function plainText(text: string): string {
	const links: string[] = [];
	const guarded = text.replace(LINK, (match) => {
		const tail = TRAILING.exec(match)?.[0] ?? '';
		links.push(tail ? match.slice(0, -tail.length) : match);
		return `\u0000${links.length - 1}\u0000${tail}`;
	});
	return guarded
		.replace(FORBIDDEN, ' ')
		.split('\n')
		.map((line) => line.replace(/[ \t]+/g, ' ').replace(/ ([,.!?:;])/g, '$1').trim())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
		.replace(/\u0000(\d+)\u0000/g, (_, n) => links[Number(n)]);
}

// Every web address in a text, as written.
export function linksIn(text: string): string[] {
	return [...text.matchAll(LINK)].map((m) => m[0].replace(TRAILING, ''));
}

// Splits a text into plain pieces and links, so a page can show the links as links.
export function splitLinks(text: string): { text: string; href?: string }[] {
	const out: { text: string; href?: string }[] = [];
	let last = 0;
	for (const m of text.matchAll(LINK)) {
		const href = m[0].replace(TRAILING, '');
		if (m.index > last) out.push({ text: text.slice(last, m.index) });
		out.push({ text: href, href });
		last = m.index + href.length;
	}
	if (last < text.length) out.push({ text: text.slice(last) });
	return out;
}
