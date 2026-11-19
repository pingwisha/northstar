<script lang="ts">
	import { onMount } from 'svelte';
	import { applyTheme, nextTheme, readTheme, THEME_LABEL, type Theme } from '$lib/theme';

	let { data, children } = $props();
	let theme = $state<Theme>('auto');
	onMount(() => (theme = readTheme()));
	function cycle() {
		theme = nextTheme(theme);
		applyTheme(theme);
	}
</script>

<header class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
	<a href="/" class="text-lg font-semibold">Northstar</a>
	<nav class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
		<a href="/goals" class="underline-offset-4 hover:underline">Мои цели</a>
		{#if data.role === 'owner'}
			<a href="/chat" class="underline-offset-4 hover:underline">Чат с ИИ</a>
			<a href="/family" class="underline-offset-4 hover:underline">Семья и доступ</a>
		{/if}
		<span class="hidden text-muted-foreground sm:inline">{data.email}</span>
		<button type="button" onclick={cycle} class="h-9 rounded-md border px-2 text-xs" data-testid="theme-toggle">{THEME_LABEL[theme]}</button>
		<form method="POST" action="/auth/logout">
			<button type="submit" class="underline-offset-4 hover:underline">Выйти</button>
		</form>
	</nav>
</header>

{@render children()}
