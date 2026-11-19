<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/goals';

	let { data, form } = $props();
	let adding = $state(false);
	let confirming = $state<string | null>(null);

	// The chart is drawn in a fixed box and scales to the screen width.
	const W = 320;
	const H = 140;
	const PAD = 24;
	const xy = (i: number, n: number, percent: number) => [n === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (n - 1), PAD + ((100 - percent) * (H - 2 * PAD)) / 100] as const;
</script>

<svelte:head><title>Пробники. Northstar</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-3xl font-semibold">Пробники</h1>
		{#if data.activeGoals.length}
			<button type="button" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" aria-expanded={adding} onclick={() => (adding = !adding)}>Записать результат</button>
		{/if}
	</div>

	{#if form?.action === 'delete' && form.message}
		<p role="alert" class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if adding || (form?.action === 'add' && form.message)}
		<form method="POST" action="?/add" use:enhance={() => async ({ update, result }) => { await update({ reset: false }); if (result.type === 'success') adding = false; }} class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" data-testid="trial-form">
			<label class="flex flex-col gap-1 text-sm">
				Цель
				<select name="goalId" class="h-11 rounded-md border bg-background px-3">
					{#each data.activeGoals as g}
						<option value={g.id} selected={form?.values?.goalId === g.id}>{g.title}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Название пробника
				<input name="title" required maxlength="120" value={form?.values?.title ?? ''} placeholder="Например: Пробник 3, вариант 12" class="h-11 rounded-md border bg-background px-3" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				День
				<input name="day" type="date" required max={data.today} value={form?.values?.day ?? data.today} class="h-11 rounded-md border bg-background px-3" />
			</label>
			<div class="flex gap-3">
				<label class="flex min-w-0 flex-1 flex-col gap-1 text-sm">
					Мои баллы
					<input name="score" required inputmode="decimal" value={form?.values?.score ?? ''} class="h-11 rounded-md border bg-background px-3" />
				</label>
				<label class="flex min-w-0 flex-1 flex-col gap-1 text-sm">
					Максимум
					<input name="maxScore" required inputmode="decimal" value={form?.values?.maxScore ?? ''} class="h-11 rounded-md border bg-background px-3" />
				</label>
			</div>
			<label class="flex flex-col gap-1 text-sm">
				Слабые темы (через запятую, необязательно)
				<textarea name="topics" rows="2" class="rounded-md border bg-background px-3 py-2">{form?.values?.topics ?? ''}</textarea>
			</label>
			{#if form?.action === 'add' && form.message}
				<p role="alert" class="text-sm text-destructive">{form.message}</p>
			{/if}
			<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Сохранить результат</button>
		</form>
	{/if}

	{#if data.blocks.length === 0}
		<p class="rounded-xl border bg-card p-4 text-sm text-muted-foreground" data-testid="trials-empty">Сначала добавь цель на странице «Мои цели». Потом сюда можно записывать результаты пробных работ.</p>
	{/if}

	{#each data.blocks as b (b.goalId)}
		<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" aria-label={`Пробники: ${b.goalTitle}`} data-testid="trial-block">
			<h2 class="text-lg font-medium">{b.goalTitle}</h2>
			{#if b.summary.points.length === 0}
				<p class="text-sm text-muted-foreground">Результатов пока нет.</p>
			{:else}
				<p class="text-sm" data-testid="trial-summary">
					Последний: <strong>{b.summary.last}%</strong>. Лучший: <strong>{b.summary.best}%</strong>.
					{#if b.summary.change !== null}
						{#if b.summary.change > 0}Рост с прошлого раза: +{b.summary.change}.{:else if b.summary.change < 0}Спад с прошлого раза: {b.summary.change}.{:else}Как в прошлый раз.{/if}
					{/if}
				</p>
				<svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label={`График результатов в процентах: ${b.summary.points.map((p) => `${p.percent}%`).join(', ')}`}>
					{#each [0, 50, 100] as g}
						<line x1={PAD} x2={W - PAD} y1={xy(0, 1, g)[1]} y2={xy(0, 1, g)[1]} stroke="currentColor" stroke-opacity="0.15" />
						<text x="2" y={xy(0, 1, g)[1] + 4} font-size="10" fill="currentColor" fill-opacity="0.6">{g}</text>
					{/each}
					{#if b.summary.points.length > 1}
						<polyline fill="none" stroke="var(--color-primary, currentColor)" stroke-width="2" points={b.summary.points.map((p, i) => xy(i, b.summary.points.length, p.percent).join(',')).join(' ')} />
					{/if}
					{#each b.summary.points as p, i}
						<circle cx={xy(i, b.summary.points.length, p.percent)[0]} cy={xy(i, b.summary.points.length, p.percent)[1]} r="4" fill="var(--color-primary, currentColor)" />
					{/each}
				</svg>
				{#if b.summary.weak.length}
					<div data-testid="weak-topics">
						<h3 class="text-sm font-medium">Слабые темы</h3>
						<ul class="mt-1 flex flex-col gap-1 text-sm">
							{#each b.summary.weak as w}
								<li>{w.topic}<span class="text-muted-foreground">, {w.count} {w.count === 1 ? 'раз' : 'раза и больше'}</span></li>
							{/each}
						</ul>
					</div>
				{/if}
				<ul class="flex flex-col divide-y text-sm" data-testid="trial-list">
					{#each b.list as t (t.id)}
						<li class="flex items-start justify-between gap-3 py-2">
							<div class="min-w-0">
								<p class="font-medium">{t.title}</p>
								<p class="text-muted-foreground">{formatDate(t.takenOn)}: {t.text}</p>
								{#if t.weakTopics}<p class="text-muted-foreground">Слабые темы: {t.weakTopics}</p>{/if}
							</div>
							{#if confirming === t.id}
								<form method="POST" action="?/delete" use:enhance={() => async ({ update }) => { await update(); confirming = null; }} class="flex shrink-0 gap-2">
									<input type="hidden" name="id" value={t.id} />
									<button type="submit" class="h-11 rounded-md bg-destructive px-3 text-white">Удалить</button>
									<button type="button" class="h-11 rounded-md border px-3" onclick={() => (confirming = null)}>Нет</button>
								</form>
							{:else}
								<button type="button" class="h-11 shrink-0 rounded-md border px-3 text-destructive" aria-label={`Удалить результат: ${t.title}`} onclick={() => (confirming = t.id)}>Удалить</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}
</main>
