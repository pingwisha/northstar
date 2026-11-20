<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/goals';

	let { data, form } = $props();
	const w = $derived(data.weekly);
	let waiting = $state(false);
</script>

<svelte:head><title>Недельный отчёт. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<div>
		<h1 class="text-3xl font-semibold">Недельный отчёт</h1>
		<p class="mt-1 text-sm text-muted-foreground" data-testid="report-range">{formatDate(w.from)} – {formatDate(w.to)}, последние семь дней</p>
	</div>

	{#if w.goals.length === 0}
		<p class="rounded-xl border bg-card p-4 text-sm text-muted-foreground" data-testid="report-empty">Активных целей нет, отчёт пока пустой. Добавь цель на странице «Мои цели».</p>
	{:else}
		<section class="grid grid-cols-3 gap-3 text-center" aria-label="Итоги недели" data-testid="report-totals">
			<div class="rounded-xl border bg-card p-3 shadow-sm"><p class="text-2xl font-semibold">{w.doneInWeek}</p><p class="text-xs text-muted-foreground">сделано за неделю</p></div>
			<div class="rounded-xl border bg-card p-3 shadow-sm"><p class="text-2xl font-semibold">{w.plannedDone} из {w.planned}</p><p class="text-xs text-muted-foreground">задач недели сделано</p></div>
			<div class="rounded-xl border bg-card p-3 shadow-sm"><p class="text-2xl font-semibold" class:text-destructive={w.overdue > 0}>{w.overdue}</p><p class="text-xs text-muted-foreground">просрочено</p></div>
		</section>

		<section class="flex flex-col gap-3" aria-label="По целям">
			{#each w.goals as g}
				<div class="rounded-xl border bg-card p-4 shadow-sm" data-testid="report-goal">
					<h2 class="font-medium">{g.title}</h2>
					<p class="text-sm text-muted-foreground">Прогресс {g.percent}%, {g.paceLabel}. Срок {formatDate(g.deadline)}, {g.daysLabel}.</p>
					<p class="mt-1 text-sm">За неделю сделано: {g.doneInWeek}. Просрочено: {g.overdue}.</p>
				</div>
			{/each}
		</section>

		{#if w.trials.length || w.weak.length}
			<section class="rounded-xl border bg-card p-4 shadow-sm" aria-label="Пробники">
				<h2 class="font-medium">Пробники</h2>
				{#each w.trials as t}<p class="text-sm">{formatDate(t.takenOn)}: {t.title}, {t.percent}%</p>{/each}
				{#if w.weak.length}<p class="mt-1 text-sm text-muted-foreground">Чаще всего слабые темы: {w.weak.map((x) => x.topic).join(', ')}.</p>{/if}
			</section>
		{/if}

		<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" aria-label="Комментарий ИИ">
			<h2 class="font-medium">Комментарий ИИ</h2>
			{#if data.canAi}
				<p class="text-sm text-muted-foreground">ИИ пишет только по цифрам отчёта выше. Если он назовёт число, которого там нет, текст не показывается.</p>
				{#if form?.comment}
					<p class="whitespace-pre-line text-sm" data-testid="ai-comment">{form.comment}</p>
				{/if}
				{#if form?.message}
					<p role="alert" class="text-sm text-destructive">{form.message}</p>
				{/if}
				<form method="POST" action="?/comment" use:enhance={() => { waiting = true; return async ({ update }) => { await update(); waiting = false; }; }}>
					<button type="submit" disabled={waiting} class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">{waiting ? 'ИИ думает…' : form?.comment ? 'Написать заново' : 'Написать итог'}</button>
				</form>
			{:else}
				<p class="text-sm text-muted-foreground">Комментарий ИИ пока доступен только владельцу сайта. Цифры выше доступны всем.</p>
			{/if}
		</section>
	{/if}
</main>
