<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head><title>Подружиться. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-xl flex-col gap-4 px-4 py-8">
	<h1 class="text-3xl font-semibold">Подружиться</h1>
	<p class="text-sm text-muted-foreground">Тебя позвали дружить на Northstart. Друг будет видеть только прозвище, которое ты напишешь, и то, что ты сама разрешишь. Почта, имя в Google и твои записи ему не видны.</p>
	<form method="POST" action="?/accept" use:enhance class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" data-testid="join-form">
		<label class="flex flex-col gap-1 text-sm">
			Твоё прозвище для друга
			<input name="nickname" required maxlength="30" placeholder="Например: Аня" class="h-11 rounded-md border bg-background px-3" />
		</label>
		{#if form?.message}<p role="alert" class="text-sm text-destructive">{form.message}</p>{/if}
		<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Подружиться</button>
	</form>
</main>
