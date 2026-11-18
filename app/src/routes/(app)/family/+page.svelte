<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<svelte:head><title>Семья и доступ. Northstar</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<h1 class="text-3xl font-semibold">Семья и доступ</h1>
	<p class="text-muted-foreground">
		Войти на сайт могут только приглашённые. Впиши Google-почту человека, и он сможет войти. Если убрать почту, доступ закроется сразу.
	</p>

	<form method="POST" action="?/add" use:enhance class="flex flex-col gap-2 sm:flex-row">
		<input
			name="email"
			type="email"
			required
			placeholder="name@gmail.com"
			aria-label="Google-почта"
			class="h-11 flex-1 rounded-md border bg-background px-3 text-sm"
		/>
		<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Пригласить</button>
	</form>
	{#if form?.message}
		<p role="alert" class="text-sm text-destructive">{form.message}</p>
	{/if}

	<ul class="flex flex-col gap-2">
		{#each data.invites as invite (invite.email)}
			<li class="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
				<span>{invite.email}</span>
				<form method="POST" action="?/remove" use:enhance>
					<input type="hidden" name="email" value={invite.email} />
					<button type="submit" class="text-sm underline-offset-4 hover:underline" aria-label={`Убрать ${invite.email}`}>Убрать</button>
				</form>
			</li>
		{:else}
			<li class="text-muted-foreground">Пока никого не приглашено.</li>
		{/each}
	</ul>
</main>
