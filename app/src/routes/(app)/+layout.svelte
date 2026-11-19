<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { applyTheme, nextTheme, readTheme, THEME_LABEL, type Theme } from '$lib/theme';

	let { data, children } = $props();
	let theme = $state<Theme>('auto');
	onMount(() => (theme = readTheme()));
	function cycle() {
		theme = nextTheme(theme);
		applyTheme(theme);
	}

	// One navigation: a bar along the bottom on a phone, in the header on a wide screen.
	const tabs = $derived([
		{ href: '/', label: 'Сегодня', icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
		{ href: '/calendar', label: 'Календарь', icon: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
		{ href: '/trials', label: 'Пробники', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
		{ href: '/goals', label: 'Мои цели', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01' },
		...(data.role === 'owner'
			? [
					{ href: '/chat', label: 'Чат с ИИ', icon: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z' },
					{ href: '/family', label: 'Семья и доступ', icon: 'M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8' }
				]
			: [])
	]);
	const here = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));
</script>

<header class="sticky top-0 z-20 border-b">
	<div class="absolute inset-0 -z-10 bg-background/80 backdrop-blur-md"></div>
	<div class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
		<a href="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="text-primary" aria-hidden="true"><path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1z" /></svg>
			Northstar
		</a>

		<nav
			aria-label="Разделы"
			class="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-background/90 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md sm:static sm:inset-auto sm:justify-start sm:gap-1 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
		>
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={here(tab.href) ? 'page' : undefined}
					class="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] font-medium transition-colors sm:min-h-9 sm:flex-none sm:flex-row sm:gap-2 sm:px-3 sm:text-sm {here(tab.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="sm:size-4" aria-hidden="true"><path d={tab.icon} /></svg>
					<span class="text-center leading-tight">{tab.label}</span>
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2">
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
			<form method="POST" action="/auth/logout">
				<button type="submit" class="h-9 rounded-full border px-3 text-sm text-muted-foreground hover:text-foreground" title={data.email}>Выйти</button>
			</form>
		</div>
	</div>
</header>

<div class="pb-24 sm:pb-8">
	{@render children()}
</div>
