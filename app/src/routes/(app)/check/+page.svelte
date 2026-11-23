<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();

	let goalId = $state('');
	$effect(() => {
		if (!goalId && data.goals.length > 0) goalId = data.goals[0].id;
	});
	const goal = $derived(data.goals.find((g) => g.id === goalId));

	let asking = $state(false);
	let message = $state('');
	let quiz = $state<{ goalId: string; topic: string; questions: { question: string; answer: string }[] } | null>(null);
	// How each question went: remembered, or sent to the notebook.
	let verdict = $state<Record<number, 'known' | 'missed'>>({});
	let failedMiss = $state('');

	const remembered = $derived(Object.values(verdict).filter((v) => v === 'known').length);
	const forgotten = $derived(Object.values(verdict).filter((v) => v === 'missed').length);
	const finished = $derived(quiz !== null && Object.keys(verdict).length === quiz.questions.length);
</script>

<svelte:head><title>Проверь себя. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 pb-24">
	<div>
		<h1 class="text-3xl font-semibold">Проверь себя</h1>
		<p class="mt-1 text-muted-foreground">ИИ задаст несколько коротких вопросов по теме. Ответь про себя, посмотри ответ и честно отметь, помнишь ли ты. Что не вспомнилось, попадёт в тетрадь ошибок.</p>
	</div>

	{#if data.goals.length === 0}
		<p class="rounded-xl border border-dashed bg-card p-6 text-center text-muted-foreground">Сначала добавь цель на странице «Мои цели».</p>
	{:else}
		<form
			method="POST"
			action="?/ask"
			class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm"
			use:enhance={() => {
				asking = true;
				message = '';
				return async ({ result }) => {
					asking = false;
					if (result.type === 'success' && result.data) {
						quiz = { goalId: String(result.data.goalId), topic: String(result.data.topic), questions: result.data.questions as { question: string; answer: string }[] };
						verdict = {};
						failedMiss = '';
					} else if (result.type === 'failure') {
						message = String(result.data?.message ?? 'Не получилось. Попробуй ещё раз.');
					} else {
						message = 'Не получилось. Попробуй ещё раз.';
					}
				};
			}}
		>
			<label class="flex flex-col gap-1 text-sm">
				Цель
				<select name="goalId" bind:value={goalId} class="h-11 rounded-md border bg-background px-3">
					{#each data.goals as g (g.id)}
						<option value={g.id}>{g.title}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Тема (необязательно)
				<input name="topic" maxlength="80" list="recent-topics" placeholder="Например: дроби. Пусто: вся цель и недавние задачи" class="h-11 rounded-md border bg-background px-3" />
				<datalist id="recent-topics">
					{#each goal?.recent ?? [] as t (t)}
						<option value={t}></option>
					{/each}
				</datalist>
			</label>
			<button type="submit" disabled={asking} class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
				{asking ? 'ИИ придумывает вопросы…' : quiz ? 'Другие вопросы' : 'Задать вопросы'}
			</button>
			{#if message}
				<p role="alert" class="text-sm text-destructive">{message}</p>
			{/if}
		</form>

		{#if quiz}
			{@const current = quiz}
			<ol class="flex flex-col gap-3" data-testid="quiz">
				{#each current.questions as q, i (i)}
					<li class="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
						<p class="font-medium">{i + 1}. {q.question}</p>
						<details class="text-sm">
							<summary class="inline-flex h-10 cursor-pointer items-center rounded-md border px-3">Показать ответ</summary>
							<p class="mt-2 rounded-md bg-muted p-3">{q.answer}</p>
						</details>
						{#if verdict[i] === 'known'}
							<p class="text-sm text-muted-foreground">Отмечено: помню.</p>
						{:else if verdict[i] === 'missed'}
							<p class="text-sm text-muted-foreground">Записано в тетрадь ошибок.</p>
						{:else}
							<div class="flex flex-wrap gap-2">
								<button type="button" class="h-10 rounded-md border px-3 text-sm" onclick={() => (verdict[i] = 'known')}>Помню</button>
								<form
									method="POST"
									action="?/miss"
									use:enhance={() => async ({ result }) => {
										if (result.type === 'success') verdict[i] = 'missed';
										else failedMiss = String((result.type === 'failure' && result.data?.message) || 'Не удалось записать. Попробуй ещё раз.');
									}}
								>
									<input type="hidden" name="goalId" value={current.goalId} />
									<input type="hidden" name="topic" value={current.topic.slice(0, 80)} />
									<input type="hidden" name="question" value={`${q.question} Ответ: ${q.answer}`.slice(0, 500)} />
									<button type="submit" class="h-10 rounded-md border px-3 text-sm">Не помню, в тетрадь</button>
								</form>
							</div>
						{/if}
					</li>
				{/each}
			</ol>
			{#if failedMiss}
				<p role="alert" class="text-sm text-destructive">{failedMiss}</p>
			{/if}
			{#if finished}
				<p class="rounded-xl bg-muted p-4 text-sm" data-testid="quiz-result">
					Готово: помнишь {remembered} из {current.questions.length}.
					{forgotten > 0 ? ' Остальное в тетради ошибок: вернись к этим темам.' : ' Так держать.'}
					{#if forgotten > 0}<a href="/mistakes" class="text-primary underline underline-offset-2">Открыть тетрадь</a>{/if}
				</p>
			{/if}
		{/if}
	{/if}
</main>
