<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let asking = $state(false);
</script>

<svelte:head><title>Мои данные. Northstar</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<h1 class="text-3xl font-semibold">Мои данные</h1>
	<p class="text-sm text-muted-foreground">Ты вошла как {data.email}. Целей: {data.goalCount}, задач: {data.taskCount}. Подробнее о том, что хранит сайт, на странице <a href="/privacy" class="text-primary underline underline-offset-2">«Конфиденциальность»</a>.</p>

	<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
		<h2 class="font-medium">Скачать всё</h2>
		<p class="text-sm text-muted-foreground">Один файл со всем, что ты записала на сайте: цели, задачи, заметки, ссылки, пробники и переписка с ИИ.</p>
		<a href="/account/export" class="inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium" data-testid="export-link" download>Скачать мои данные</a>
	</section>

	<section class="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-card p-4 shadow-sm">
		<h2 class="font-medium text-destructive">Удалить всё</h2>
		<p class="text-sm text-muted-foreground">Аккаунт и все твои данные удаляются насовсем, вернуть их нельзя. Сначала можно скачать их выше.</p>
		{#if asking || form?.message}
			<form method="POST" action="?/delete" use:enhance class="flex flex-col gap-2" data-testid="delete-form">
				<label class="flex flex-col gap-1 text-sm">
					Напиши слово {data.confirmWord}, чтобы подтвердить
					<input name="confirm" autocomplete="off" class="h-11 rounded-md border bg-background px-3" />
				</label>
				{#if form?.message}<p role="alert" class="text-sm text-destructive">{form.message}</p>{/if}
				<div class="flex gap-2">
					<button type="submit" class="h-11 flex-1 rounded-md bg-destructive px-4 text-sm font-medium text-white">Удалить насовсем</button>
					<button type="button" class="h-11 flex-1 rounded-md border px-4 text-sm" onclick={() => (asking = false)}>Не удалять</button>
				</div>
			</form>
		{:else}
			<button type="button" class="h-11 rounded-md border border-destructive px-4 text-sm text-destructive" onclick={() => (asking = true)}>Удалить аккаунт и данные</button>
		{/if}
	</section>
</main>
