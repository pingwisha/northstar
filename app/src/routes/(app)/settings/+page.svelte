<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, tick } from 'svelte';
	import { ACCENTS, DEFAULT_HUE, FONTS, SIZES, applyAppearance, readAppearance, type AccentChoice, type Font, type TextSize } from '$lib/appearance';
	import { applyTheme, readTheme, type Theme } from '$lib/theme';
	import ProgressRing from '$lib/components/ProgressRing.svelte';

	let accent = $state<AccentChoice>('blue');
	let hue = $state(DEFAULT_HUE);
	let font = $state<Font>('normal');
	let size = $state<TextSize>('normal');
	let theme = $state<Theme>('auto');
	let { data, form } = $props();

	// Daily reminders: the browser's own push subscription, saved on the server with the chosen hour.
	let supported = $state(true);
	let enabled = $state(false);
	let busy = $state(false);
	let message = $state('');
	let hour = $state(9);
	let endpoint = $state('');
	let zone = $state('');
	let sender: HTMLFormElement | undefined = $state();

	onMount(async () => {
		({ accent, hue, size, font } = readAppearance());
		theme = readTheme();
		hour = data.defaultHour;
		zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
		supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
		if (!supported) return;
		try {
			const sub = await (await navigator.serviceWorker.getRegistration('/sw.js'))?.pushManager.getSubscription();
			if (sub) {
				endpoint = sub.endpoint;
				enabled = data.subscriptions.some((s) => s.endpoint === sub.endpoint);
				hour = data.subscriptions.find((s) => s.endpoint === sub.endpoint)?.hour ?? hour;
			}
		} catch {
			// The state stays "off"; the person can try again.
		}
	});

	const keyBytes = (text: string): Uint8Array => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

	async function turnOn() {
		message = '';
		if (!data.vapidPublicKey) return void (message = 'Напоминания на сайте ещё не настроены.');
		busy = true;
		try {
			const registration = await navigator.serviceWorker.register('/sw.js');
			await navigator.serviceWorker.ready;
			if ((await Notification.requestPermission()) !== 'granted') {
				message = 'Браузер не дал разрешение. Его можно включить в настройках сайта в браузере.';
				return;
			}
			const sub = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.vapidPublicKey) as BufferSource }));
			endpoint = sub.endpoint;
			await tick();
			sender?.requestSubmit();
		} catch {
			message = 'Не получилось включить напоминания в этом браузере.';
		} finally {
			busy = false;
		}
	}

	async function turnOff() {
		try {
			const sub = await (await navigator.serviceWorker.getRegistration('/sw.js'))?.pushManager.getSubscription();
			endpoint = sub?.endpoint ?? endpoint;
			await sub?.unsubscribe();
		} catch {
			// The server forgets it anyway.
		}
	}

	const THEMES: { key: Theme; name: string }[] = [
		{ key: 'auto', name: 'Как на устройстве' },
		{ key: 'light', name: 'Светлая' },
		{ key: 'dark', name: 'Тёмная' }
	];
	const apply = () => applyAppearance({ accent, hue, size, font });
	const pickAccent = (a: AccentChoice) => ((accent = a), apply());
	const pickHue = (h: number) => ((hue = h), (accent = 'custom'), apply());
	const pickSize = (s: TextSize) => ((size = s), apply());
	const pickFont = (f: Font) => ((font = f), apply());
	const pickTheme = (t: Theme) => ((theme = t), applyTheme(t));
	const chip = 'flex h-11 cursor-pointer items-center justify-center rounded-md border px-4 text-sm transition-colors';
	const on = 'border-primary bg-primary/10 text-primary font-medium';
</script>

<svelte:head><title>Настройки. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<h1 class="text-3xl font-semibold">Настройки</h1>
	<p class="text-sm text-muted-foreground">Оформление хранится в этом браузере: на другом устройстве его нужно выбрать заново. Напоминания включаются отдельно на каждом устройстве.</p>

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
		<label class="flex flex-col gap-2 text-sm">
			Свой цвет кнопок: двигай ползунок{accent === 'custom' ? '' : ' (пока выбран готовый цвет)'}
			<input type="range" min="0" max="359" step="1" value={hue} oninput={(e) => pickHue(Number(e.currentTarget.value))} aria-label="Свой оттенок кнопок" data-testid="hue" class="h-8 w-full" style="accent-color: oklch(0.55 0.15 {hue})" />
		</label>
	</section>

	<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="font-h">
		<h2 id="font-h" class="text-lg font-semibold">Шрифт текста</h2>
		<div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="font-h">
			{#each FONTS as f (f.key)}
				<button type="button" role="radio" aria-checked={font === f.key} class="{chip} {font === f.key ? on : ''}" style:font-family={f.stack} data-testid="font-{f.key}" onclick={() => pickFont(f.key)}>{f.name}</button>
			{/each}
		</div>
		<p class="text-xs text-muted-foreground">Берутся шрифты, которые уже есть на устройстве, поэтому на разных устройствах вид может немного отличаться.</p>
	</section>

	<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="size-h">
		<h2 id="size-h" class="text-lg font-semibold">Размер текста</h2>
		<div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="size-h">
			{#each SIZES as s (s.key)}
				<button type="button" role="radio" aria-checked={size === s.key} class="{chip} {size === s.key ? on : ''}" data-testid="size-{s.key}" onclick={() => pickSize(s.key)}>{s.name}</button>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="remind-h" data-testid="reminders">
		<h2 id="remind-h" class="text-lg font-semibold">Напоминания</h2>
		<p class="text-sm text-muted-foreground">Раз в день в выбранный час придёт уведомление, если остались несделанные задачи. Если всё сделано, оно не придёт.</p>
		{#if !supported}
			<p class="text-sm" data-testid="reminders-unsupported">Этот браузер не умеет присылать уведомления. На iPhone сначала добавь сайт на экран «Домой» (Поделиться, потом «На экран Домой») и открой его оттуда.</p>
		{:else if !data.vapidPublicKey}
			<p class="text-sm">Напоминания на сайте ещё не настроены.</p>
		{:else}
			<label class="flex flex-col gap-1 text-sm">
				Во сколько напоминать (по времени этого устройства{zone ? `, ${zone}` : ''})
				<select bind:value={hour} class="h-11 rounded-md border bg-background px-3" data-testid="reminder-hour">
					{#each Array.from({ length: 24 }, (_, h) => h) as h (h)}
						<option value={h}>{String(h).padStart(2, '0')}:00</option>
					{/each}
				</select>
			</label>
			<form
				bind:this={sender}
				method="POST"
				action="?/subscribe"
				use:enhance={() => async ({ result, update }) => {
					if (result.type === 'success') enabled = true;
					else message = result.type === 'failure' ? String(result.data?.message ?? 'Не получилось.') : 'Не получилось. Попробуй ещё раз.';
					await update({ reset: false, invalidateAll: true });
				}}
			>
				<input type="hidden" name="endpoint" value={endpoint} />
				<input type="hidden" name="timezone" value={zone} />
				<input type="hidden" name="hour" value={hour} />
				{#if enabled}
					<div class="flex flex-wrap gap-2">
						<button type="submit" disabled={busy} class="h-11 rounded-md border px-4 text-sm font-medium" data-testid="reminder-save">Сохранить час</button>
					</div>
				{:else}
					<button type="button" onclick={turnOn} disabled={busy} class="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60" data-testid="reminder-on">{busy ? 'Включаю…' : 'Включить напоминания'}</button>
				{/if}
			</form>
			{#if enabled}
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="?/test" use:enhance={() => async ({ result, update }) => { message = result.type === 'success' ? 'Отправлено. Уведомление придёт через несколько секунд.' : result.type === 'failure' ? String(result.data?.message ?? 'Не получилось.') : 'Не получилось.'; await update({ reset: false }); }}>
						<button type="submit" class="h-11 rounded-md border px-4 text-sm font-medium" data-testid="reminder-test">Прислать пробное уведомление</button>
					</form>
					<form method="POST" action="?/unsubscribe" use:enhance={() => async ({ update }) => { await turnOff(); enabled = false; message = 'Напоминания выключены на этом устройстве.'; await update({ reset: false }); }}>
						<input type="hidden" name="endpoint" value={endpoint} />
						<button type="submit" class="h-11 rounded-md border px-4 text-sm font-medium" data-testid="reminder-off">Выключить</button>
					</form>
				</div>
			{/if}
			{#if message}<p role="status" class="text-sm">{message}</p>{/if}
		{/if}
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
