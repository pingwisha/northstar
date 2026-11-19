// Checks for what a person types as their own material or note on a task.
export const MAX_MATERIAL_TITLE = 120;
export const MAX_URL = 500;
export const MAX_NOTE = 1000;
export const MAX_OWN_MATERIALS = 20;

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };

// Only https addresses are kept, so a link can never run code or open a plain-text page.
export function parseMaterialLink(titleRaw: string, urlRaw: string): Checked<{ title: string; url: string }> {
	const text = urlRaw.trim();
	if (!text) return { ok: false, message: 'Вставь ссылку.' };
	if (text.length > MAX_URL) return { ok: false, message: `Ссылка длиннее ${MAX_URL} знаков.` };
	let url: URL;
	try {
		url = new URL(text);
	} catch {
		return { ok: false, message: 'Это не похоже на ссылку. Скопируй её целиком из адресной строки.' };
	}
	if (url.protocol !== 'https:') return { ok: false, message: 'Принимаются только ссылки, которые начинаются с https://.' };
	if (url.username || url.password) return { ok: false, message: 'Ссылка с логином и паролем не подходит.' };
	const title = titleRaw.replace(/\s+/g, ' ').trim() || url.hostname.replace(/^www\./, '');
	if (title.length > MAX_MATERIAL_TITLE) return { ok: false, message: `Название длиннее ${MAX_MATERIAL_TITLE} знаков.` };
	return { ok: true, value: { title, url: url.href } };
}

// An empty note clears it.
export function parseNote(raw: string): Checked<string | null> {
	const note = raw.replace(/\r\n/g, '\n').trim();
	if (note.length > MAX_NOTE) return { ok: false, message: `Заметка длиннее ${MAX_NOTE} знаков.` };
	return { ok: true, value: note || null };
}
