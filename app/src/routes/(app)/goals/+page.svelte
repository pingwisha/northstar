<script lang="ts">
	import { enhance } from '$app/forms';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import { formatDate } from '$lib/goals';

	let { data, form } = $props();

	const active = $derived(data.cards.filter((c) => c.status === 'active'));
	const finished = $derived(data.cards.filter((c) => c.status !== 'active'));
	let adding = $state(false);
	let editing = $state<string | null>(null);
	let planning = $state<string | null>(null);

	const paceClass = { on_track: 'text-foreground', ahead: 'text-foreground', behind: 'text-destructive' } as const;
</script>

<svelte:head><title>Мои цели. Northstar</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-3xl font-semibold" data-testid="goals-title">Мои цели</h1>
		<button
			type="button"
			class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
			onclick={() => (adding = !adding)}
			aria-expanded={adding}
		>
			Добавить цель
		</button>
	</div>

	{#if adding || (form?.action === 'add' && form.message)}
		<form method="POST" action="?/add" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') adding = false; }} class="flex flex-col gap-3 rounded-lg border p-4">
			<label class="flex flex-col gap-1 text-sm">
				Что хочешь получить в итоге
				<input name="title" required maxlength="120" value={form?.values?.title ?? ''} placeholder="Например: сдать ОГЭ на 100 баллов" class="h-11 rounded-md border bg-background px-3" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Подробнее (необязательно)
				<textarea name="description" maxlength="500" rows="2" class="rounded-md border bg-background px-3 py-2">{form?.values?.description ?? ''}</textarea>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				К какому числу
				<input name="deadline" type="date" required min={data.today} value={form?.values?.deadline ?? ''} class="h-11 rounded-md border bg-background px-3" />
			</label>
			{#if form?.action === 'add' && form.message}
				<p role="alert" class="text-sm text-destructive">{form.message}</p>
			{/if}
			<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Сохранить цель</button>
		</form>
	{/if}

	<ul class="flex flex-col gap-4" data-testid="goal-list">
		{#each active as card (card.id)}
			<li class="flex flex-col gap-4 rounded-lg border p-4" data-testid="goal-card">
				<div class="flex items-center gap-4">
					<ProgressRing percent={card.percent} label={card.title} />
					<div class="flex min-w-0 flex-col gap-1">
						<h2 class="text-lg font-semibold">{card.title}</h2>
						<p class="text-sm text-muted-foreground">До {formatDate(card.deadline)}, {card.daysLabel}</p>
						<p class="text-sm font-medium {paceClass[card.pace.state]}">{card.pace.label[0].toUpperCase() + card.pace.label.slice(1)}</p>
					</div>
				</div>
				<p class="text-sm">
					<span class="text-muted-foreground">Следующий шаг:</span>
					{#if card.nextStep}
						{card.nextStep.title} ({formatDate(card.nextStep.plannedFor)})
					{:else if card.taskCount === 0}
						плана пока нет, он появится, когда ИИ его построит
					{:else}
						все задачи сделаны
					{/if}
				</p>

				{#if editing === card.id}
					<form method="POST" action="?/deadline" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') editing = null; }} class="flex flex-col gap-2 sm:flex-row">
						<input type="hidden" name="id" value={card.id} />
						<input name="deadline" type="date" required min={data.today} value={card.deadline} aria-label="Новый срок" class="h-11 flex-1 rounded-md border bg-background px-3" />
						<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Сохранить срок</button>
					</form>
					{#if form?.action === 'deadline' && form.goalId === card.id && form.message}
						<p role="alert" class="text-sm text-destructive">{form.message}</p>
					{/if}
				{/if}

				{#if card.taskCount === 0}
					<form
						method="POST"
						action="?/plan"
						use:enhance={() => {
							planning = card.id;
							return async ({ update }) => {
								await update();
								planning = null;
							};
						}}
					>
						<input type="hidden" name="id" value={card.id} />
						<button type="submit" disabled={planning !== null} class="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
							{planning === card.id ? 'ИИ строит план, это займёт до минуты…' : 'Построить план'}
						</button>
					</form>
					{#if form?.action === 'plan' && form.goalId === card.id && form.message}
						<p role="alert" class="text-sm text-destructive">{form.message}</p>
					{/if}
				{/if}

				<div class="flex flex-wrap gap-2">
					<button type="button" class="h-10 rounded-md border px-3 text-sm" onclick={() => (editing = editing === card.id ? null : card.id)}>Изменить срок</button>
					<form method="POST" action="?/finish" use:enhance>
						<input type="hidden" name="id" value={card.id} />
						<button type="submit" class="h-10 rounded-md border px-3 text-sm">Завершить</button>
					</form>
				</div>
			</li>
		{:else}
			<li class="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Пока нет активных целей. Нажми «Добавить цель».</li>
		{/each}
	</ul>

	{#if finished.length > 0}
		<section class="flex flex-col gap-2">
			<h2 class="text-lg font-semibold">Завершённые</h2>
			<ul class="flex flex-col gap-2">
				{#each finished as card (card.id)}
					<li class="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
						<span>{card.title}</span>
						<span class="text-muted-foreground">{card.percent}%</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
