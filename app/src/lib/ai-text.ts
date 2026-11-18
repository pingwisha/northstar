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

// A safety net for text shown in the chat: the rules ask the AI not to use stars, hashes,
// brackets or slashes, and this removes any that slip through. Not for JSON or links,
// which carry those characters on purpose and are kept in separate fields.
export function plainText(text: string): string {
	return text
		.replace(FORBIDDEN, ' ')
		.split('\n')
		.map((line) => line.replace(/[ \t]+/g, ' ').replace(/ ([,.!?:;])/g, '$1').trim())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
