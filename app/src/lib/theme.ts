// The colour theme: follow the device by default, or be forced light or dark.
export type Theme = 'auto' | 'light' | 'dark';

const ORDER: Theme[] = ['auto', 'light', 'dark'];
export const THEME_LABEL: Record<Theme, string> = { auto: 'Тема: как на устройстве', light: 'Тема: светлая', dark: 'Тема: тёмная' };

export const nextTheme = (t: Theme): Theme => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];

export function readTheme(): Theme {
	try {
		const v = localStorage.getItem('theme');
		return v === 'light' || v === 'dark' ? v : 'auto';
	} catch {
		return 'auto';
	}
}

export function applyTheme(t: Theme): void {
	const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
	document.documentElement.classList.toggle('dark', dark);
	try {
		if (t === 'auto') localStorage.removeItem('theme');
		else localStorage.setItem('theme', t);
	} catch {
		/* the theme still applies for this visit */
	}
}
