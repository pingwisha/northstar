// Friends: invitation links and friendships (decision 0075). The person always comes from the verified session.
import { MAX_FRIENDS, sortedPair, type AcceptError } from '$lib/friends';

const b64url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// A new random key for an invitation link.
export const newInviteKey = (): string => b64url(crypto.getRandomValues(new Uint8Array(32)));

// Only this hash is stored, so a copy of the database cannot be used to join anyone's friends.
export async function hashKey(key: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function friendCount(db: D1Database, userId: string): Promise<number> {
	return (await db.prepare('SELECT COUNT(*) AS n FROM friendships WHERE user_a = ?1 OR user_b = ?1').bind(userId).first<{ n: number }>())!.n;
}

// Opens an invitation for the signed-in person: both become friends, or the reason is returned.
export async function acceptInvite(db: D1Database, userId: string, key: string, nickname: string, now: Date = new Date()): Promise<{ ok: true } | { ok: false; error: AcceptError }> {
	const invite = await db
		.prepare('SELECT id, user_id, nickname, expires_at, used_at FROM friend_invites WHERE token_hash = ?')
		.bind(await hashKey(key))
		.first<{ id: string; user_id: string; nickname: string; expires_at: string; used_at: string | null }>();
	if (!invite) return { ok: false, error: 'not_found' };
	if (invite.used_at) return { ok: false, error: 'used' };
	if (invite.expires_at <= now.toISOString()) return { ok: false, error: 'expired' };
	if (invite.user_id === userId) return { ok: false, error: 'own' };
	const [a, b] = sortedPair(invite.user_id, userId);
	if (await db.prepare('SELECT 1 AS x FROM friendships WHERE user_a = ? AND user_b = ?').bind(a, b).first()) return { ok: false, error: 'already' };
	if ((await friendCount(db, userId)) >= MAX_FRIENDS || (await friendCount(db, invite.user_id)) >= MAX_FRIENDS) return { ok: false, error: 'full' };
	const [nickA, nickB] = a === invite.user_id ? [invite.nickname, nickname] : [nickname, invite.nickname];
	// The first statement spends the invitation; the second runs only if it was still unspent (changes() = 1).
	const results = await db.batch([
		db.prepare('UPDATE friend_invites SET used_at = ? WHERE id = ? AND used_at IS NULL').bind(now.toISOString(), invite.id),
		db
			.prepare('INSERT INTO friendships (id, user_a, user_b, nick_a, nick_b) SELECT ?, ?, ?, ?, ? WHERE changes() = 1')
			.bind(crypto.randomUUID(), a, b, nickA, nickB)
	]);
	return (results[1].meta.changes ?? 0) === 1 ? { ok: true } : { ok: false, error: 'used' };
}
