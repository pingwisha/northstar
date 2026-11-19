<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let sending = $state(false);
	let text = $state('');
	// After a failed send the person's words come back, so nothing has to be retyped.
	$effect(() => {
		if (form && 'text' in form && typeof form.text === 'string') text = form.text;
	});
</script>

<svelte:head><title>Чат. Northstar</title></svelte:head>

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
		<p class="rounded-lg border bg-card p-6 text-muted-foreground" data-testid="chat-closed">ИИ пока доступен только владельцу сайта. Для остальных он появится позже.</p>
	{:else}
		<ul class="flex flex-col gap-3" data-testid="messages">
			{#each data.messages as m (m.id)}
				<li class="max-w-[90%] whitespace-pre-wrap rounded-lg p-3 text-sm {m.role === 'user' ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-muted'}" data-role={m.role}>{m.content}</li>
			{:else}
				<li class="text-sm text-muted-foreground">Спроси что угодно по своим целям. ИИ видит твои цели и прогресс.</li>
			{/each}
			{#if sending}
				<li class="self-start rounded-lg bg-muted p-3 text-sm text-muted-foreground">ИИ думает…</li>
			{/if}
		</ul>

		{#if data.messages.length === 0}
			<form method="POST" action="?/send" use:enhance={() => { sending = true; return async ({ update }) => { await update(); sending = false; }; }}>
				<input type="hidden" name="text" value="Что мне делать сегодня?" />
				<button type="submit" disabled={sending} class="h-11 rounded-md border px-4 text-sm">Что мне делать сегодня?</button>
			</form>
		{/if}

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
				<textarea name="text" bind:value={text} rows="3" maxlength="2000" required class="rounded-md border bg-background px-3 py-2"></textarea>
			</label>
			{#if form && 'message' in form && form.message}
				<p role="alert" class="text-sm text-destructive">{form.message}</p>
			{/if}
			<button type="submit" disabled={sending} class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">Отправить</button>
		</form>
	{/if}
</main>
