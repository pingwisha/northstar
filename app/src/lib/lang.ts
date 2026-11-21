// The language of a public page: ?lang=ru or ?lang=en when the visitor chose, otherwise the
// browser's language (Russian for Russian browsers, English for everyone else).
export type Lang = 'ru' | 'en';

export function pickLang(url: URL, acceptLanguage: string | null): Lang {
	const asked = url.searchParams.get('lang');
	if (asked === 'ru' || asked === 'en') return asked;
	return (acceptLanguage ?? '').trim().toLowerCase().startsWith('ru') ? 'ru' : 'en';
}
