// What a plan may point to. The AI picks an id; the address is built here, so an address the AI
// wrote itself never reaches a person (decision 0072). Two kinds of entries:
// - PAGES: one concrete page worth sending a person to (a list of exercises, a set of texts);
// - SITES: a whole site, reached by a search phrase the AI writes (or its home page).
export interface Page {
	id: string;
	name: string;
	url: string;
	// What the page holds, shown to the AI so it picks it for the right task.
	topics: string;
}

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

export const PAGES: readonly Page[] = [
	{ id: 'oge-rus-interview-texts', name: 'Решу ОГЭ: тексты итогового собеседования', url: 'https://ruso-oge.sdamgia.ru/test?theme=2', topics: 'итоговое собеседование по русскому языку (допуск к ОГЭ): тексты для чтения вслух, подготовка к чтению, интонация, ударения' },
	{ id: 'rus-interview-texts-4ege', name: '10 текстов итогового собеседования', url: 'https://4ege.ru/gia-po-russkomu-jazyku/72883-10-tekstov-itogovogo-sobesedovanija.html', topics: 'итоговое собеседование по русскому языку: образцы текстов для чтения вслух' },
	{ id: 'rus-interview-home', name: 'Решу ОГЭ: итоговое собеседование', url: 'https://ruso-oge.sdamgia.ru/', topics: 'итоговое собеседование по русскому языку: все четыре задания, пересказ, монолог, диалог' }
];

// Решу ОГЭ / Решу ЕГЭ keep one site per subject; its catalogue of tasks by topic and its search both work on every one.
const exam = (kind: 'oge' | 'ege', slug: string, subject: string, topics: string): Site => {
	const host = `https://${slug}-${kind}.sdamgia.ru`;
	const label = kind === 'oge' ? 'Решу ОГЭ' : 'Решу ЕГЭ';
	return { id: `${kind}-${slug}`, name: `${label}: ${subject}`, base: `${host}/prob_catalog`, topics: `тренировочные задания ${kind === 'oge' ? 'ОГЭ' : 'ЕГЭ'} по теме (${topics})`, search: `${host}/search?search={q}` };
};

const EXAM_SUBJECTS: [string, string, string][] = [
	['math', 'математика', 'алгебра, геометрия, вероятность'],
	['rus', 'русский язык', 'орфография, пунктуация, сочинение, изложение'],
	['phys', 'физика', 'механика, электричество, оптика'],
	['chem', 'химия', 'вещества, реакции, расчёты'],
	['bio', 'биология', 'организмы, человек, экология'],
	['inf', 'информатика', 'алгоритмы, программирование, системы счисления'],
	['soc', 'обществознание', 'общество, право, экономика'],
	['hist', 'история', 'даты, события, личности'],
	['geo', 'география', 'карта, климат, страны'],
	['lit', 'литература', 'произведения, герои, сочинение'],
	['en', 'английский язык', 'грамматика, лексика, письмо'],
	['de', 'немецкий язык', 'грамматика, лексика, письмо'],
	['fr', 'французский язык', 'грамматика, лексика, письмо'],
	['sp', 'испанский язык', 'грамматика, лексика, письмо']
];

export const SITES: readonly Site[] = [
	...EXAM_SUBJECTS.map(([slug, subject, topics]) => exam('oge', slug, subject, topics)),
	{ ...exam('ege', 'math', 'математика, профильный уровень', 'алгебра, геометрия, вероятность'), id: 'ege-math' },
	{ ...exam('ege', 'mathb', 'математика, базовый уровень', 'арифметика, геометрия, вероятность'), id: 'ege-mathb' },
	...EXAM_SUBJECTS.filter(([slug]) => slug !== 'math').map(([slug, subject, topics]) => exam('ege', slug, subject, topics)),
	{ id: 'fipi', name: 'ФИПИ', base: 'https://fipi.ru/', topics: 'официальные демоверсии, кодификаторы и спецификации ОГЭ и ЕГЭ по всем предметам' },
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

export function findPage(id: unknown): Page | undefined {
	return typeof id === 'string' ? PAGES.find((p) => p.id === id.trim()) : undefined;
}

// The address for a site id and a phrase, or null when the id is not in the list.
export function buildMaterialUrl(siteId: unknown, phrase: unknown): string | null {
	const site = findSite(siteId);
	if (!site) return null;
	const query = typeof phrase === 'string' ? phrase.replace(/\s+/g, ' ').trim().slice(0, MAX_PHRASE) : '';
	if (!site.search || !query) return site.base;
	return site.search.replace('{q}', encodeURIComponent(query));
}

// The lists as the AI reads them.
export function pageListForPrompt(): string {
	return PAGES.map((p) => `${p.id}: ${p.name}, ${p.topics}`).join('\n');
}

export function siteListForPrompt(): string {
	return SITES.map((s) => `${s.id}: ${s.name}, ${s.topics}`).join('\n');
}
