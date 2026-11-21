<script lang="ts">
	import { enhance } from '$app/forms';
	import Illustration from '$lib/components/Illustration.svelte';

	let { data, form } = $props();
	let adding = $state(false);
	let showFixed = $state(false);
</script>

<svelte:head><title>Тетрадь ошибок. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-3xl font-semibold">Тетрадь ошибок</h1>
		<button type="button" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" onclick={() => (adding = !adding)} aria-expanded={adding}>Записать ошибку</button>
	</div>
	<p class="text-sm text-muted-foreground">Записывай, где ошиблась, и отмечай исправленное. Повторяющиеся темы покажут, куда смотреть в первую очередь.</p>

	{#if adding || (form?.action === 'add' && form.message)}
		{#if data.goals.length === 0}
			<p class="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Сначала добавь цель на странице «Мои цели».</p>
		{:else}
			<form method="POST" action="?/add" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') adding = false; }} class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
				<label class="flex min-w-0 flex-col gap-1 text-sm">
					Цель
					<select name="goalId" class="h-11 min-w-0 rounded-md border bg-background px-3">
						{#each data.goals as g (g.id)}<option value={g.id} selected={form?.values?.goalId === g.id}>{g.title}</option>{/each}
					</select>
				</label>
				<label class="flex min-w-0 flex-col gap-1 text-sm">
					Тема
					<input name="topic" required maxlength="80" value={form?.values?.topic ?? ''} placeholder="Например: дроби" class="h-11 min-w-0 rounded-md border bg-background px-3" />
				</label>
				<label class="flex min-w-0 flex-col gap-1 text-sm">
					Что пошло не так (необязательно)
					<textarea name="note" maxlength="500" rows="2" class="min-w-0 rounded-md border bg-background px-3 py-2">{form?.values?.note ?? ''}</textarea>
				</label>
				{#if form?.action === 'add' && form.message}<p role="alert" class="text-sm text-destructive">{form.message}</p>{/if}
				<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Сохранить</button>
			</form>
		{/if}
	{/if}

	{#if data.frequent.length}
		<section class="rounded-xl border bg-primary/10 p-4" aria-label="Что повторяется" data-testid="frequent">
			<h2 class="font-medium">Чаще всего повторяется</h2>
			<p class="mt-1 text-sm">{data.frequent.map((f) => `${f.topic} (${f.count})`).join(', ')}</p>
		</section>
	{/if}

	<section class="flex flex-col gap-3" aria-labelledby="open-h">
		<h2 id="open-h" class="text-xl font-semibold">Ещё не исправлено ({data.open.length})</h2>
		{#if data.open.length}
			<ul class="flex flex-col gap-2" data-testid="open-list">
				{#each data.open as m, i (m.id)}
					<li class="rise flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm" style:--i={i} data-testid="mistake">
						<form method="POST" action="?/fix" use:enhance class="contents">
							<input type="hidden" name="id" value={m.id} />
							<input type="hidden" name="fixed" value="1" />
							<button type="submit" role="checkbox" aria-checked="false" aria-label={`Отметить исправленным: ${m.topic}`} class="flex size-11 shrink-0 items-center justify-center rounded-md border-2 border-muted-foreground"></button>
						</form>
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="font-medium">{m.topic}</span>
							<span class="text-xs text-muted-foreground">{m.goalTitle}</span>
							{#if m.note}<p class="mt-1 whitespace-pre-line text-sm">{m.note}</p>{/if}
						</div>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={m.id} />
							<button type="submit" class="h-11 rounded-md px-3 text-sm text-muted-foreground hover:text-destructive" aria-label={`Удалить: ${m.topic}`}>Удалить</button>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center" data-testid="mistakes-empty">
				<Illustration kind="tasks" size={110} />
				<p class="text-sm text-muted-foreground">Записей нет. Ошибки после пробников и задач удобно складывать сюда.</p>
			</div>
		{/if}
	</section>

	{#if data.fixed.length}
		<section class="flex flex-col gap-2">
			<button type="button" class="self-start text-sm text-primary underline underline-offset-2" onclick={() => (showFixed = !showFixed)} aria-expanded={showFixed}>
				{showFixed ? 'Скрыть исправленные' : `Показать исправленные (${data.fixed.length})`}
			</button>
			{#if showFixed}
				<ul class="flex flex-col gap-2" data-testid="fixed-list">
					{#each data.fixed as m (m.id)}
						<li class="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
							<form method="POST" action="?/fix" use:enhance class="contents">
								<input type="hidden" name="id" value={m.id} />
								<input type="hidden" name="fixed" value="0" />
								<button type="submit" role="checkbox" aria-checked="true" aria-label={`Вернуть в работу: ${m.topic}`} class="flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-primary bg-primary text-primary-foreground">✓</button>
							</form>
							<span class="min-w-0 flex-1 text-muted-foreground line-through">{m.topic}</span>
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={m.id} />
								<button type="submit" class="h-9 px-2 text-muted-foreground hover:text-destructive" aria-label={`Удалить: ${m.topic}`}>Удалить</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</main>
