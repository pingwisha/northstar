import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({ email: locals.email ?? '', role: locals.role ?? 'member' });
