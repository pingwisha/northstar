// The sites a plan may point to. The AI picks an id and a search phrase; the address is built here,
// so an address the AI wrote itself never reaches a person (decision 0072).
export interface Site {
	id: string;
	name: string;
	// Home page; also the address when the site has no search of its own.
	base: string;
	// What the site is good for, shown to the AI so it picks the right one.
	topics: string;
	// Address of a search on the site; "{q}" is replaced by the encoded phrase.
	search?: string;
}

export const SITES: readonly Site[] = [
	{ id: 'fipi', name: 'ФИПИ', base: 'https://fipi.ru/', topics: 'официальные демоверсии, кодификаторы и спецификации ОГЭ и ЕГЭ по всем предметам' },
	{ id: 'oge-sdamgia', name: 'Решу ОГЭ', base: 'https://oge.sdamgia.ru/', topics: 'тренировочные задания и варианты ОГЭ по всем предметам', search: 'https://oge.sdamgia.ru/search?search={q}' },
	{ id: 'ege-sdamgia', name: 'Решу ЕГЭ', base: 'https://ege.sdamgia.ru/', topics: 'тренировочные задания и варианты ЕГЭ по всем предметам', search: 'https://ege.sdamgia.ru/search?search={q}' },
	{ id: 'khan', name: 'Khan Academy', base: 'https://ru.khanacademy.org/', topics: 'школьные математика, физика, химия, биология, экономика, основы программирования: уроки и тренажёры', search: 'https://ru.khanacademy.org/search?page_search_query={q}' },
	{ id: 'stepik', name: 'Stepik', base: 'https://stepik.org/', topics: 'онлайн-курсы: программирование, математика, языки, подготовка к экзаменам', search: 'https://stepik.org/catalog/search?q={q}' },
	{ id: 'wikipedia-ru', name: 'Википедия', base: 'https://ru.wikipedia.org/', topics: 'общая справка по любой теме: определения, история, понятия', search: 'https://ru.wikipedia.org/w/index.php?search={q}' },
	{ id: 'wiktionary-ru', name: 'Викисловарь', base: 'https://ru.wiktionary.org/', topics: 'значения, формы и происхождение слов в любых языках', search: 'https://ru.wiktionary.org/w/index.php?search={q}' },
	{ id: 'cambridge-dictionary', name: 'Cambridge Dictionary', base: 'https://dictionary.cambridge.org/', topics: 'английские слова и выражения, примеры, произношение', search: 'https://dictionary.cambridge.org/search/direct/?datasetsearch=english&q={q}' },
	{ id: 'mdn', name: 'MDN Web Docs', base: 'https://developer.mozilla.org/', topics: 'веб-разработка: HTML, CSS, JavaScript (на английском)', search: 'https://developer.mozilla.org/en-US/search?q={q}' },
	{ id: 'python-docs', name: 'Документация Python', base: 'https://docs.python.org/3/', topics: 'язык Python и его стандартная библиотека (на английском)', search: 'https://docs.python.org/3/search.html?q={q}' },
	{ id: 'freecodecamp', name: 'freeCodeCamp', base: 'https://www.freecodecamp.org/', topics: 'статьи и курсы по программированию (на английском)', search: 'https://www.freecodecamp.org/news/search/?query={q}' },
	{ id: 'youtube', name: 'YouTube', base: 'https://www.youtube.com/', topics: 'видеоуроки и лекции по любой теме', search: 'https://www.youtube.com/results?search_query={q}' },
	{ id: 'yandex', name: 'Яндекс', base: 'https://yandex.ru/', topics: 'общий поиск, когда другие сайты не подходят', search: 'https://yandex.ru/search/?text={q}' }
];

const MAX_PHRASE = 150;

export function findSite(id: unknown): Site | undefined {
	return typeof id === 'string' ? SITES.find((s) => s.id === id.trim()) : undefined;
}

// The address for a site id and a phrase, or null when the id is not in the list.
export function buildMaterialUrl(siteId: unknown, phrase: unknown): string | null {
	const site = findSite(siteId);
	if (!site) return null;
	const query = typeof phrase === 'string' ? phrase.replace(/\s+/g, ' ').trim().slice(0, MAX_PHRASE) : '';
	if (!site.search || !query) return site.base;
	return site.search.replace('{q}', encodeURIComponent(query));
}

// The list as the AI reads it.
export function siteListForPrompt(): string {
	return SITES.map((s) => `${s.id}: ${s.name}, ${s.topics}`).join('\n');
}
