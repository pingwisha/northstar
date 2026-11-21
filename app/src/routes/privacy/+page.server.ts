import { pickLang } from '$lib/lang';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, request }) => ({ lang: pickLang(url, request.headers.get('accept-language')) });
