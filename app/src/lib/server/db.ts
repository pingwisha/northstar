// Data access for D1. User-owned data is reachable only through scoped(), which
// fixes the user id once, from the verified session. findOrCreateUser and the
// invite helpers are the exceptions: they run before a user id exists, or on
// behalf of the owner, whose role the caller has already checked.

export type Role = 'owner' | 'member';

export interface User {
	id: string;
	email: string;
	nick: string | null;
	role: Role;
	created_at: string;
}

export interface Invite {
	email: string;
	invited_by: string | null;
	created_at: string;
}

const normalize = (email: string): string => email.trim().toLowerCase();

export async function findOrCreateUser(db: D1Database, verifiedEmail: string, role: Role = 'member'): Promise<User> {
	const email = normalize(verifiedEmail);
	await db
		.prepare('INSERT INTO users (id, email, role) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET role = excluded.role')
		.bind(crypto.randomUUID(), email, role)
		.run();
	const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
	if (!user) throw new Error('user row missing after insert');
	return user;
}

export async function isInvited(db: D1Database, email: string): Promise<boolean> {
	return (await db.prepare('SELECT 1 AS ok FROM invites WHERE email = ?').bind(normalize(email)).first()) !== null;
}

export async function listInvites(db: D1Database): Promise<Invite[]> {
	return (await db.prepare('SELECT * FROM invites ORDER BY created_at, rowid').all<Invite>()).results;
}

export async function addInvite(db: D1Database, email: string, invitedBy: string): Promise<void> {
	await db
		.prepare('INSERT INTO invites (email, invited_by) VALUES (?, ?) ON CONFLICT (email) DO NOTHING')
		.bind(normalize(email), invitedBy)
		.run();
}

export async function removeInvite(db: D1Database, email: string): Promise<void> {
	await db.prepare('DELETE FROM invites WHERE email = ?').bind(normalize(email)).run();
}

export function scoped(db: D1Database, userId: string) {
	return {
		userId,

		getUser: () => db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<User>(),

		async setNick(nick: string): Promise<void> {
			await db.prepare('UPDATE users SET nick = ? WHERE id = ?').bind(nick, userId).run();
		}
	};
}
