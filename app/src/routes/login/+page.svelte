<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import { page } from '$app/state';

	// Failure reasons from the sign-in route, mapped to texts.
	const messages: Record<string, string> = {
		cancelled: 'Вход отменён. Можно попробовать ещё раз.',
		state: 'Вход не получился: сессия входа устарела. Попробуй ещё раз.',
		not_allowed: 'Этот аккаунт не в списке приглашённых. Попроси владельца сайта добавить твою почту.',
		signups_full: 'Сегодня новых регистраций уже много. Попробуй завтра.',
		unverified: 'Google не подтвердил эту почту. Выбери другой аккаунт.',
		exchange: 'Не удалось войти через Google. Попробуй ещё раз позже.',
		id_token: 'Не удалось войти через Google. Попробуй ещё раз позже.'
	};
	const deleted = $derived(page.url.searchParams.get('deleted') === '1');
	let { data } = $props();
	const problem = $derived(messages[page.url.searchParams.get('error') ?? '']);
</script>

<svelte:head><title>Вход. Northstart</title></svelte:head>

<main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-8">
	<h1 class="flex items-center gap-3 text-2xl font-semibold"><Logo size={36} /> Northstart</h1>
	<p class="text-muted-foreground">
		Большие цели по шагам: срок, задачи на каждый день и честный процент прогресса.
		{data.open ? 'Войди через Google.' : 'Войди через Google. Сайт пока работает по приглашениям.'}
	</p>
	{#if deleted}
		<p role="status" class="rounded-md border px-3 py-2 text-sm">Аккаунт и все данные удалены.</p>
	{/if}
	{#if problem}
		<p role="alert" class="rounded-md border border-destructive/50 px-3 py-2 text-sm">{problem}</p>
	{/if}
	<a
		href="/auth/google"
		class="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
	>
		Войти через Google
	</a>
	<p class="text-sm text-muted-foreground">Входя, ты соглашаешься с <a href="/terms" class="underline underline-offset-2">условиями использования</a> и <a href="/privacy" class="underline underline-offset-2">правилами хранения данных</a>.</p>
</main>
