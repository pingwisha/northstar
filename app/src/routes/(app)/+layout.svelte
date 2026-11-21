<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { applyTheme, nextTheme, readTheme, THEME_LABEL, type Theme } from '$lib/theme';

	let { data, children } = $props();
	let theme = $state<Theme>('auto');
	onMount(() => {
		theme = readTheme();
		// The browser knows the person's time zone; the server learns it from a cookie and then reloads the day.
		try {
			const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (zone && !document.cookie.split('; ').includes(`tz=${zone}`)) {
				document.cookie = `tz=${zone}; path=/; max-age=31536000; samesite=lax`;
				invalidateAll();
			}
		} catch {
			// Without it the default zone stays.
		}
	});
	function cycle() {
		theme = nextTheme(theme);
		applyTheme(theme);
	}

	// One navigation: a bar along the bottom on a phone, in the header on a wide screen.
	const tabs = $derived([
		{ href: '/', label: 'Сегодня', short: 'Сегодня', icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
		{ href: '/calendar', label: 'Календарь', short: 'Календарь', icon: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
		{ href: '/trials', label: 'Пробники', short: 'Пробники', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
		{ href: '/mistakes', label: 'Тетрадь ошибок', short: 'Ошибки', wide: true, icon: 'M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4V4zM8 9h8M8 13h5' },
		{ href: '/goals', label: 'Мои цели', short: 'Цели', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01' },
		{ href: '/chat', label: 'Чат с ИИ', short: 'Чат', icon: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z' },
		...(data.role === 'owner'
			? [
					{ href: '/family', label: 'Семья и доступ', short: 'Семья', icon: 'M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8' }
				]
			: [])
	]);
	const here = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));
</script>

<header class="sticky top-0 z-20 border-b lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-b-0 lg:border-r">
	<div class="absolute inset-0 -z-10 bg-background/80 backdrop-blur-md lg:bg-card/80"></div>
	<div class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5 lg:h-full lg:max-w-none lg:flex-col lg:items-stretch lg:justify-start lg:gap-6 lg:px-3 lg:py-5">
		<a href="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight lg:px-3 lg:text-xl">
			<Logo size={28} />
			Northstart
		</a>

		<nav
			aria-label="Разделы"
			class="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-background/90 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md lg:static lg:inset-auto lg:flex-col lg:justify-start lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
		>
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={here(tab.href) ? 'page' : undefined}
					aria-label={tab.label}
					class="{'wide' in tab && tab.wide ? 'max-lg:hidden ' : ''}flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[10.5px] font-medium transition-colors lg:min-h-10 lg:w-full lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm {here(tab.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="lg:size-[18px]" aria-hidden="true"><path d={tab.icon} /></svg>
					<span class="text-center leading-tight lg:hidden">{tab.short}</span>
					<span class="hidden text-center leading-tight lg:inline">{tab.label}</span>
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2 lg:mt-auto lg:justify-between lg:px-1">
			<button type="button" onclick={cycle} class="flex size-9 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground" data-testid="theme-toggle" aria-label={THEME_LABEL[theme]} title={THEME_LABEL[theme]}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					{#if theme === 'light'}
						<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
					{:else if theme === 'dark'}
						<path d="M21 13a9 9 0 11-10-10 7 7 0 0010 10z" />
					{:else}
						<circle cx="12" cy="12" r="9" /><path d="M12 3v18" /><path d="M12 3a9 9 0 010 18z" fill="currentColor" />
					{/if}
				</svg>
			</button>
			<a href="/settings" class="flex size-9 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground" aria-label="Оформление" title="Оформление" data-testid="settings-link">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 100 18 2 2 0 002-2c0-.6-.3-1-.6-1.4-.3-.4-.4-.8-.4-1.2a2 2 0 012-2h2.3A2.7 2.7 0 0021 11.7C21 6.9 17 3 12 3z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7.5" r="1" /><circle cx="15" cy="7.5" r="1" /></svg>
			</a>
			<form method="POST" action="/auth/logout">
				<button type="submit" class="h-9 rounded-full border px-3 text-sm text-muted-foreground hover:text-foreground" title={data.email}>Выйти</button>
			</form>
		</div>
	</div>
</header>

<div class="pb-24 lg:pb-8 lg:pl-60">
	{@render children()}
	<footer class="mx-auto flex max-w-3xl gap-4 px-4 pb-4 text-xs text-muted-foreground">
		<a href="/account" class="underline underline-offset-2">Мои данные</a>
		<a href="/privacy" class="underline underline-offset-2">Конфиденциальность</a>
		<a href="/terms" class="underline underline-offset-2">Условия</a>
	</footer>
</div>
