// The person's accent colour and text size. They live in this browser only (like the theme),
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

export function readAppearance(): { accent: Accent; size: TextSize } {
	try {
		const accent = localStorage.getItem('accent');
		const size = localStorage.getItem('size');
		return { accent: isAccent(accent) ? accent : 'blue', size: isTextSize(size) ? size : 'normal' };
	} catch {
		return { accent: 'blue', size: 'normal' };
	}
}

export function applyAppearance(accent: Accent, size: TextSize): void {
	const root = document.documentElement;
	if (accent === 'blue') root.removeAttribute('data-accent');
	else root.setAttribute('data-accent', accent);
	if (size === 'normal') root.removeAttribute('data-size');
	else root.setAttribute('data-size', size);
	try {
		if (accent === 'blue') localStorage.removeItem('accent');
		else localStorage.setItem('accent', accent);
		if (size === 'normal') localStorage.removeItem('size');
		else localStorage.setItem('size', size);
	} catch {
		/* it still applies for this visit */
	}
}
