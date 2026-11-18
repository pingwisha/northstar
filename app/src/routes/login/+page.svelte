<script lang="ts">
	import { page } from '$app/state';

	// Failure reasons from the sign-in route, mapped to texts.
	const messages: Record<string, string> = {
		cancelled: 'Вход отменён. Можно попробовать ещё раз.',
		state: 'Вход не получился: сессия входа устарела. Попробуй ещё раз.',
		not_allowed: 'Этот аккаунт не в списке приглашённых. Попроси владельца сайта добавить твою почту.',
		unverified: 'Google не подтвердил эту почту. Выбери другой аккаунт.',
		exchange: 'Не удалось войти через Google. Попробуй ещё раз позже.',
		id_token: 'Не удалось войти через Google. Попробуй ещё раз позже.'
	};
	const problem = $derived(messages[page.url.searchParams.get('error') ?? '']);
</script>

<svelte:head><title>Вход. Northstar</title></svelte:head>

<main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-8">
	<h1 class="text-2xl font-semibold">Northstar</h1>
	<p class="text-muted-foreground">Войди через Google. Сайт работает по приглашениям.</p>
	{#if problem}
		<p role="alert" class="rounded-md border border-destructive/50 px-3 py-2 text-sm">{problem}</p>
	{/if}
	<a
		href="/auth/google"
		class="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
	>
		Войти через Google
	</a>
</main>
