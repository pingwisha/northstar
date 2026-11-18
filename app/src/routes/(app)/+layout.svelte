<script lang="ts">
	let { data, children } = $props();
</script>

<header class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
	<a href="/" class="text-lg font-semibold">Northstar</a>
	<nav class="flex items-center gap-4 text-sm">
		{#if data.role === 'owner'}
			<a href="/family" class="underline-offset-4 hover:underline">Семья и доступ</a>
		{/if}
		<span class="text-muted-foreground">{data.email}</span>
		<form method="POST" action="/auth/logout">
			<button type="submit" class="underline-offset-4 hover:underline">Выйти</button>
		</form>
	</nav>
</header>

{@render children()}
