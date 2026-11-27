// Friends: what the person types and the limits. Pure: no database, no clock.
import type { Parsed } from './goals';

export const MAX_NICKNAME = 30;
export const MAX_ACTIVE_INVITES = 5;
export const MAX_FRIENDS = 20;
export const INVITE_DAYS = 7;

export function parseNickname(raw: unknown): Parsed<string> {
	const nickname = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
	if (!nickname) return { ok: false, message: 'Напиши прозвище, под которым друг будет тебя видеть.' };
	if (nickname.length > MAX_NICKNAME) return { ok: false, message: `Прозвище длиннее ${MAX_NICKNAME} знаков.` };
	return { ok: true, value: nickname };
}

// The two people of a friendship in the order the table keeps them.
export const sortedPair = (x: string, y: string): [string, string] => (x < y ? [x, y] : [y, x]);

export type AcceptError = 'not_found' | 'used' | 'expired' | 'own' | 'already' | 'full';
export const ACCEPT_MESSAGES: Record<AcceptError, string> = {
	not_found: 'Такой ссылки нет. Попроси друга создать новую.',
	used: 'Эта ссылка уже использована. Попроси друга создать новую.',
	expired: 'Срок этой ссылки вышел. Попроси друга создать новую.',
	own: 'Это твоя собственная ссылка: отправь её другу.',
	already: 'Вы с этим человеком уже друзья.',
	full: `Друзей может быть не больше ${MAX_FRIENDS}. Освободи место или попроси друга сделать это.`
};
