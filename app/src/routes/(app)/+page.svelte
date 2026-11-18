<script lang="ts">
	import { enhance } from '$app/forms';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import { formatDate } from '$lib/goals';

	let { data, form } = $props();
	const home = $derived(data.home);
	const OVERDUE_SHOWN = 5;
	const paceClass = { on_track: 'text-foreground', ahead: 'text-foreground', behind: 'text-destructive' } as const;
</script>

{#snippet row(task: (typeof home.today)[number])}
	<li class="flex items-center gap-3 rounded-lg border p-3" data-testid="task">
		<form method="POST" action="?/check" use:enhance class="contents">
			<input type="hidden" name="id" value={task.id} />
			<input type="hidden" name="done" value={task.done ? '0' : '1'} />
			<button
				type="submit"
				role="checkbox"
				aria-checked={task.done}
				aria-label={task.done ? `Снять отметку: ${task.title}` : `Отметить: ${task.title}`}
				class="flex size-11 shrink-0 items-center justify-center rounded-md border-2 {task.done ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}"
			>
				{#if task.done}✓{/if}
			</button>
		</form>
		<div class="flex min-w-0 flex-col">
			<span class={task.done ? 'text-muted-foreground line-through' : ''}>{task.title}</span>
			<span class="text-xs text-muted-foreground">{task.goalTitle}</span>
		</div>
	</li>
{/snippet}

<svelte:head><title>Сегодня. Northstar</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<h1 class="text-3xl font-semibold">Сегодня</h1>

	{#if home.activeGoals === 0}
		<div class="flex flex-col gap-3 rounded-lg border p-6" data-testid="home-empty">
			<p>Целей пока нет. Добавь первую, и здесь появятся задачи на каждый день.</p>
			<a href="/goals" class="inline-flex h-11 items-center self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Добавить цель</a>
		</div>
	{:else}
		<section class="flex items-center gap-5 rounded-lg border p-4" aria-label="Общий прогресс">
			<ProgressRing percent={home.overall} size={128} label="Общий прогресс" />
			<div class="flex min-w-0 flex-col gap-1">
				<p class="text-sm text-muted-foreground">Общий прогресс</p>
				{#if home.week}
					<p class="font-medium {paceClass[home.week.state]}" data-testid="week">{home.week.label[0].toUpperCase() + home.week.label.slice(1)}</p>
				{:else}
					<p class="text-sm text-muted-foreground" data-testid="week">Плана пока нет, оценить темп не по чему.</p>
				{/if}
				{#if home.nearest}
					<p class="text-sm" data-testid="nearest">
						Ближайший срок: {home.nearest.goalTitle}, {formatDate(home.nearest.deadline)}, {home.nearest.daysLabel}
					</p>
				{/if}
			</div>
		</section>

		{#if form && 'message' in form && form.message}
			<p role="alert" class="text-sm text-destructive">{form.message}</p>
		{/if}

		<section class="flex flex-col gap-3" aria-labelledby="today-title">
			<h2 id="today-title" class="text-xl font-semibold">Задачи на сегодня</h2>
			{#if home.today.length}
				<ul class="flex flex-col gap-2" data-testid="today-list">
					{#each home.today as task (task.id)}{@render row(task)}{/each}
				</ul>
			{:else}
				<p class="text-sm text-muted-foreground" data-testid="today-empty">На сегодня задач нет.</p>
			{/if}
		</section>

		{#if home.overdue.length}
			<section class="flex flex-col gap-3" aria-labelledby="overdue-title">
				<h2 id="overdue-title" class="text-xl font-semibold text-destructive">Не сделано раньше</h2>
				<ul class="flex flex-col gap-2" data-testid="overdue-list">
					{#each home.overdue.slice(0, OVERDUE_SHOWN) as task (task.id)}{@render row(task)}{/each}
				</ul>
				<a href="/goals" class="text-sm underline">Отстаёшь? Пересчитай план на странице целей.</a>
				{#if home.overdue.length > OVERDUE_SHOWN}
					<p class="text-sm text-muted-foreground">И ещё {home.overdue.length - OVERDUE_SHOWN} из прошлых дней.</p>
				{/if}
			</section>
		{/if}
	{/if}
</main>
