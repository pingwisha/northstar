// The owner's own addresses come from the ALLOWED_EMAILS secret as
// comma-separated emails. Everyone else is let in through the invites table.
// Both are checked on every request, so removing an address ends that
// person's access at once.

export function parseAllowlist(raw: string | undefined): Set<string> {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((e) => e.trim().toLowerCase())
			.filter(Boolean)
	);
}

export function isAllowed(allowlist: Set<string>, email: string): boolean {
	return allowlist.has(email.trim().toLowerCase());
}
