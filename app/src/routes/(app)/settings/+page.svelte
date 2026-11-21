<script lang="ts">
	import { onMount } from 'svelte';
	import { ACCENTS, SIZES, applyAppearance, readAppearance, type Accent, type TextSize } from '$lib/appearance';
	import { applyTheme, readTheme, type Theme } from '$lib/theme';
	import ProgressRing from '$lib/components/ProgressRing.svelte';

	let accent = $state<Accent>('blue');
	let size = $state<TextSize>('normal');
	let theme = $state<Theme>('auto');
	onMount(() => {
		({ accent, size } = readAppearance());
		theme = readTheme();
	});

	const THEMES: { key: Theme; name: string }[] = [
		{ key: 'auto', name: 'Как на устройстве' },
		{ key: 'light', name: 'Светлая' },
		{ key: 'dark', name: 'Тёмная' }
	];
	const pickAccent = (a: Accent) => ((accent = a), applyAppearance(accent, size));
	const pickSize = (s: TextSize) => ((size = s), applyAppearance(accent, size));
	const pickTheme = (t: Theme) => ((theme = t), applyTheme(t));
	const chip = 'flex h-11 cursor-pointer items-center justify-center rounded-md border px-4 text-sm transition-colors';
	const on = 'border-primary bg-primary/10 text-primary font-medium';
</script>

<svelte:head><title>Оформление. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<h1 class="text-3xl font-semibold">Оформление</h1>
	<p class="text-sm text-muted-foreground">Выбор хранится в этом браузере: на другом устройстве его нужно сделать заново.</p>

	<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="theme-h">
		<h2 id="theme-h" class="text-lg font-semibold">Тема</h2>
		<div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="theme-h">
			{#each THEMES as t (t.key)}
				<button type="button" role="radio" aria-checked={theme === t.key} class="{chip} {theme === t.key ? on : ''}" onclick={() => pickTheme(t.key)}>{t.name}</button>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="accent-h">
		<h2 id="accent-h" class="text-lg font-semibold">Акцентный цвет</h2>
		<div class="flex flex-wrap gap-3" role="radiogroup" aria-labelledby="accent-h">
			{#each ACCENTS as a (a.key)}
				<button
					type="button"
					role="radio"
					aria-checked={accent === a.key}
					aria-label={a.name}
					title={a.name}
					data-testid="accent-{a.key}"
					class="flex size-12 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 {accent === a.key ? 'border-foreground' : 'border-transparent'}"
					onclick={() => pickAccent(a.key)}
				>
					<span class="size-8 rounded-full" style:background={a.swatch}></span>
				</button>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="size-h">
		<h2 id="size-h" class="text-lg font-semibold">Размер текста</h2>
		<div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="size-h">
			{#each SIZES as s (s.key)}
				<button type="button" role="radio" aria-checked={size === s.key} class="{chip} {size === s.key ? on : ''}" data-testid="size-{s.key}" onclick={() => pickSize(s.key)}>{s.name}</button>
			{/each}
		</div>
	</section>

	<section class="flex items-center gap-5 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm" aria-label="Пример">
		<ProgressRing percent={64} size={96} label="Пример" />
		<div class="flex min-w-0 flex-col gap-2">
			<p class="font-medium">Так будет выглядеть сайт</p>
			<p class="text-sm text-muted-foreground">Кольцо, кнопки и ссылки берут выбранный цвет.</p>
			<span class="inline-flex h-10 items-center self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Кнопка</span>
		</div>
	</section>
</main>
