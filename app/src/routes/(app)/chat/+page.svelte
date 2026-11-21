<script lang="ts">
	import { enhance } from '$app/forms';
	import { splitLinks } from '$lib/ai-text';

	let { data, form } = $props();
	let sending = $state(false);
	let text = $state('');
	// Ready-made questions; the text is what is sent to the AI.
	const QUICK = [
		{ label: 'Что делать сегодня?', text: 'Что мне делать сегодня?' },
		{ label: 'План на неделю', text: 'Дай план на ближайшую неделю по моим задачам: по дням, коротко.' },
		{ label: 'Проверь меня', text: 'Задай мне три коротких вопроса, чтобы проверить, что я усвоила ближайшую задачу. По одному, жди моего ответа.' },
		{ label: 'Объясни проще', text: 'Объясни свой последний ответ проще, короткими фразами и на примере.', needsHistory: true },
		{ label: 'Итог недели', text: 'Подведи итог моей недели по цифрам из моих целей и скажи, на что обратить внимание.' }
	] as { label: string; text: string; needsHistory?: boolean }[];

	// Enter sends the message; Shift and Enter make a new line. Not while a word is being composed.
	function sendOnEnter(e: KeyboardEvent) {
		if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
		e.preventDefault();
		if (text.trim() && !sending) (e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
	}
	// After a failed send the person's words come back, so nothing has to be retyped.
	$effect(() => {
		if (form && 'text' in form && typeof form.text === 'string') text = form.text;
	});
</script>

<svelte:head><title>Чат. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-3xl font-semibold">Чат с ИИ</h1>
		{#if data.canChat}
			<form method="POST" action="?/fresh" use:enhance>
				<button type="submit" class="h-10 rounded-md border px-3 text-sm">Новая беседа</button>
			</form>
		{/if}
	</div>

	{#if !data.canChat}
		<p class="rounded-xl border bg-card shadow-sm p-6 text-muted-foreground" data-testid="chat-closed">ИИ сейчас недоступен.</p>
	{:else}
		<ul class="flex flex-col gap-3" data-testid="messages">
			{#each data.messages as m (m.id)}
				<li class="max-w-[90%] whitespace-pre-wrap rounded-lg p-3 text-sm {m.role === 'user' ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-muted'}" data-role={m.role}>{#each splitLinks(m.content) as part}{#if part.href}<a href={part.href} target="_blank" rel="noopener noreferrer" class="break-all underline underline-offset-2">{part.text}</a>{:else}{part.text}{/if}{/each}</li>
			{:else}
				<li class="text-sm text-muted-foreground">Спроси что угодно по своим целям. ИИ видит твои цели и прогресс.</li>
			{/each}
			{#if sending}
				<li class="self-start rounded-lg bg-muted p-3 text-sm text-muted-foreground">ИИ думает…</li>
			{/if}
		</ul>

		<div class="flex flex-wrap gap-2" role="group" aria-label="Быстрые команды" data-testid="quick">
			{#each QUICK.filter((q) => !q.needsHistory || data.messages.length > 0) as q (q.label)}
				<form method="POST" action="?/send" use:enhance={() => { sending = true; return async ({ update }) => { await update(); sending = false; }; }}>
					<input type="hidden" name="text" value={q.text} />
					<button type="submit" disabled={sending} class="h-10 rounded-full border px-4 text-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-60">{q.label}</button>
				</form>
			{/each}
		</div>

		<form
			method="POST"
			action="?/send"
			class="flex flex-col gap-2"
			use:enhance={() => {
				sending = true;
				return async ({ update, result }) => {
					await update({ reset: false });
					sending = false;
					if (result.type === 'success') text = '';
				};
			}}
		>
			<label class="flex flex-col gap-1 text-sm">
				Сообщение
				<textarea
					name="text"
					bind:value={text}
					rows="3"
					maxlength="2000"
					required
					onkeydown={sendOnEnter}
					class="rounded-md border bg-background px-3 py-2"
				></textarea>
				<span class="text-xs text-muted-foreground">Enter отправляет, Shift и Enter вместе делают новую строку.</span>
			</label>
			{#if form && 'message' in form && form.message}
				<p role="alert" class="text-sm text-destructive">{form.message}</p>
			{/if}
			<button type="submit" disabled={sending} class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">Отправить</button>
		</form>
	{/if}
</main>
