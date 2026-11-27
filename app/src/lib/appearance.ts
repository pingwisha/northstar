// The person's accent colour (one of six, or a hue of their own), text size and font. They live in this browser only (like the theme),
// and are applied as attributes on <html>; the colours themselves are in layout.css.
export const ACCENTS = [
	{ key: 'blue', name: 'Синий', swatch: 'oklch(0.5 0.14 255)' },
	{ key: 'violet', name: 'Фиолетовый', swatch: 'oklch(0.52 0.19 295)' },
	{ key: 'green', name: 'Зелёный', swatch: 'oklch(0.5 0.13 155)' },
	{ key: 'rose', name: 'Розовый', swatch: 'oklch(0.55 0.19 10)' },
	{ key: 'orange', name: 'Оранжевый', swatch: 'oklch(0.57 0.16 50)' },
	{ key: 'teal', name: 'Бирюзовый', swatch: 'oklch(0.5 0.1 195)' }
] as const;
export type Accent = (typeof ACCENTS)[number]['key'];

export const SIZES = [
	{ key: 'normal', name: 'Обычный' },
	{ key: 'large', name: 'Крупный' },
	{ key: 'xlarge', name: 'Очень крупный' }
] as const;
export type TextSize = (typeof SIZES)[number]['key'];

export const isAccent = (v: unknown): v is Accent => ACCENTS.some((a) => a.key === v);
export const isTextSize = (v: unknown): v is TextSize => SIZES.some((s) => s.key === v);

export const FONTS = [
	{ key: 'normal', name: 'Обычный', stack: "'Geist Variable', sans-serif" },
	{ key: 'serif', name: 'С засечками', stack: "Georgia, 'Times New Roman', serif" },
	{ key: 'rounded', name: 'Круглый', stack: "ui-rounded, 'Varela Round', 'Nunito', 'Trebuchet MS', sans-serif" },
	{ key: 'hand', name: 'Рукописный', stack: "'Comic Sans MS', 'Comic Neue', 'Segoe Print', cursive" },
	{ key: 'mono', name: 'Моноширинный', stack: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" }
] as const;
export type Font = (typeof FONTS)[number]['key'];
export const isFont = (v: unknown): v is Font => FONTS.some((f) => f.key === v);

// The person's own colour: only the hue (0..359) is kept; lightness and chroma are fixed in layout.css, so text on buttons stays readable.
export type AccentChoice = Accent | 'custom';
export const DEFAULT_HUE = 255;
export function parseHue(raw: unknown): number | null {
	const text = typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? String(raw) : '';
	if (!/^\d{1,3}$/.test(text)) return null;
	const n = Number(text);
	return n >= 0 && n <= 359 ? n : null;
}

export interface Look {
	accent: AccentChoice;
	hue: number;
	size: TextSize;
	font: Font;
}

export function readAppearance(): Look {
	try {
		const accent = localStorage.getItem('accent');
		const size = localStorage.getItem('size');
		const font = localStorage.getItem('font');
		const hue = parseHue(localStorage.getItem('hue'));
		const custom = accent === 'custom' && hue !== null;
		return { accent: custom ? 'custom' : isAccent(accent) ? accent : 'blue', hue: hue ?? DEFAULT_HUE, size: isTextSize(size) ? size : 'normal', font: isFont(font) ? font : 'normal' };
	} catch {
		return { accent: 'blue', hue: DEFAULT_HUE, size: 'normal', font: 'normal' };
	}
}

// Puts the choices on <html> (colours and fonts are in layout.css) and keeps them in this browser.
export function applyAppearance(look: Look): void {
	const root = document.documentElement;
	const set = (name: string, value: string | null) => (value === null ? root.removeAttribute(name) : root.setAttribute(name, value));
	set('data-accent', look.accent === 'blue' ? null : look.accent);
	if (look.accent === 'custom') root.style.setProperty('--hue', String(look.hue));
	else root.style.removeProperty('--hue');
	set('data-size', look.size === 'normal' ? null : look.size);
	set('data-font', look.font === 'normal' ? null : look.font);
	try {
		const keep = (key: string, value: string | null) => (value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value));
		keep('accent', look.accent === 'blue' ? null : look.accent);
		keep('hue', look.accent === 'custom' ? String(look.hue) : null);
		keep('size', look.size === 'normal' ? null : look.size);
		keep('font', look.font === 'normal' ? null : look.font);
	} catch {
		/* it still applies for this visit */
	}
}
