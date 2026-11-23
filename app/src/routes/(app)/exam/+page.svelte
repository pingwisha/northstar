<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/goals';

	let { data, form } = $props();
	const exam = $derived(data.goals.filter((g) => g.exam));
	const later = $derived(data.goals.filter((g) => !g.exam));
</script>

<svelte:head><title>Режим экзамена. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<div>
		<h1 class="text-3xl font-semibold">Режим экзамена</h1>
		<p class="mt-1 text-sm text-muted-foreground">Включается у цели, когда до срока осталось не больше 60 дней.</p>
	</div>

	{#if form?.message}
		<p role="alert" class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if data.goals.length === 0}
		<p class="rounded-xl border bg-card p-4 text-sm text-muted-foreground" data-testid="exam-empty">Активных целей нет. Добавь цель на странице «Мои цели».</p>
	{:else if exam.length === 0}
		<p class="rounded-xl border bg-card p-4 text-sm text-muted-foreground" data-testid="exam-none">Пока ни до одного срока не осталось 60 дней. Когда срок приблизится, здесь появится отсчёт.</p>
	{/if}

	{#each exam as g (g.id)}
		<section class="flex flex-col gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm" aria-label={`Экзамен: ${g.title}`} data-testid="exam-goal">
			<h2 class="text-lg font-medium">{g.title}</h2>
			<p class="flex items-baseline gap-2">
				<span class="text-5xl font-semibold tabular-nums" data-testid="countdown">{g.daysLeft}</span>
				<span class="text-sm text-muted-foreground">{g.daysLabel}, срок {formatDate(g.deadline)}</span>
			</p>
			<p class="text-sm" data-testid="exam-load">
				Не сделано задач: {g.open}{#if g.overdue}, из них с прошлых дней {g.overdue}{/if}.
				{#if g.perDay !== null && g.open > 0}Чтобы успеть, нужно в среднем {g.perDay} в день.{/if}
			</p>

			{#if g.weeks.length}
				<div>
					<h3 class="text-sm font-medium">Последние недели</h3>
					<ul class="mt-1 flex flex-col divide-y text-sm" data-testid="exam-weeks">
						{#each g.weeks as w}
							<li class="flex items-center justify-between gap-3 py-2">
								<span>{w.label}<span class="block text-xs text-muted-foreground">{formatDate(w.from)} – {formatDate(w.to)}</span></span>
								<span class="shrink-0">{w.done} из {w.planned}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div data-testid="exam-review">
				<h3 class="text-sm font-medium">Повторение слабых тем</h3>
				{#if g.reviewing.length}
					<p class="text-sm text-muted-foreground">Уже в плане: {g.reviewing.join(', ')}.</p>
				{/if}
				{#if g.toReview.length}
					<p class="text-sm">Ещё без повторения: {g.toReview.join(', ')}.</p>
					<form method="POST" action="?/addReviews" use:enhance class="mt-2 flex flex-col gap-2">
						<input type="hidden" name="goalId" value={g.id} />
						<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Добавить повторение в план</button>
						<p class="text-xs text-muted-foreground">Это новые задачи, поэтому процент цели немного снизится. Так он остаётся честным.</p>
					</form>
				{:else if !g.reviewing.length}
					<p class="text-sm text-muted-foreground">Слабых тем пока нет. Их берут из результатов на странице «Пробники».</p>
				{/if}
				{#if form?.ok && form.goalId === g.id}
					<p class="mt-2 text-sm" data-testid="review-added">Добавлено задач на повторение: {form.added}.</p>
				{/if}
			</div>
		</section>
	{/each}

	{#if later.length}
		<section class="rounded-xl border bg-card p-4 shadow-sm" aria-label="Сроки подальше">
			<h2 class="font-medium">Сроки подальше</h2>
			<ul class="mt-1 text-sm text-muted-foreground">
				{#each later as g}<li>{g.title}: {formatDate(g.deadline)}, {g.daysLabel}</li>{/each}
			</ul>
		</section>
	{/if}
</main>
