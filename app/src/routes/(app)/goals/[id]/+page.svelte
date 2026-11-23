<script lang="ts">
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import TaskRow from '$lib/components/TaskRow.svelte';
	import { formatDate } from '$lib/goals';

	let { data } = $props();
	const card = $derived(data.card);
	const paceClass = { on_track: 'text-foreground', ahead: 'text-foreground', behind: 'text-destructive' } as const;
</script>

<svelte:head><title>{card.title}. Northstart</title></svelte:head>

<main class="goal-{card.color} mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<a href="/goals" class="text-sm text-primary underline underline-offset-2">← Все цели</a>

	<header class="flex items-center gap-4 rounded-xl border border-l-4 border-l-[var(--goal)] bg-card p-4 shadow-sm">
		<ProgressRing percent={card.percent} label={card.title} color="var(--goal)" />
		<div class="flex min-w-0 flex-col gap-1">
			<h1 class="text-2xl font-semibold" data-testid="goal-title"><span aria-hidden="true">{card.icon}</span> {card.title}</h1>
			<p class="text-sm text-muted-foreground">До {formatDate(card.deadline)}, {card.daysLabel}</p>
			<p class="text-sm font-medium {paceClass[card.pace.state]}">{card.pace.label[0].toUpperCase() + card.pace.label.slice(1)}</p>
		</div>
	</header>

	{#if card.description}
		<p class="whitespace-pre-line rounded-md bg-muted px-3 py-2 text-sm" data-testid="goal-description">{card.description}</p>
	{/if}

	{#if card.taskCount === 0}
		<p class="rounded-xl border border-dashed bg-card p-6 text-center text-muted-foreground">У этой цели пока нет задач. Построй план на странице «Цели».</p>
	{/if}

	{#each data.stages as stage, i (stage.id)}
		<section class="flex flex-col gap-3" data-testid="goal-stage">
			<details open={stage.done < stage.total}>
				<summary class="flex cursor-pointer flex-col gap-1">
					<span class="flex flex-wrap items-baseline justify-between gap-x-3">
						<span class="font-semibold">{i + 1}. {stage.title}</span>
						<span class="text-sm text-muted-foreground">{stage.percent}%, {stage.done} из {stage.total}{stage.dueDate ? `, до ${formatDate(stage.dueDate)}` : ''}</span>
					</span>
					<span class="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Этап {stage.title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow={stage.percent}>
						<span class="block h-full rounded-full bg-[var(--goal)]" style="width: {stage.percent}%"></span>
					</span>
				</summary>
				<ul class="mt-3 flex flex-col gap-3">
					{#each stage.tasks as task (task.id)}
						<TaskRow {task} today={data.today} />
					{/each}
				</ul>
			</details>
		</section>
	{/each}

	{#if data.own.length > 0}
		<section class="flex flex-col gap-3" data-testid="goal-own-tasks">
			<h2 class="font-semibold">Мои задачи</h2>
			<ul class="flex flex-col gap-3">
				{#each data.own as task (task.id)}
					<TaskRow {task} today={data.today} />
				{/each}
			</ul>
		</section>
	{/if}

	<p class="text-sm text-muted-foreground">Нажми на карандаш у задачи: там можно написать заметку, добавить свой материал (ссылку или несколько слов), переименовать, перенести и удалить задачу.</p>
</main>
