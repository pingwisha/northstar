<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/goals';

	let { data, form } = $props();
	let confirming = $state<string | null>(null);
	let copied = $state(false);
	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head><title>Друзья. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<h1 class="text-3xl font-semibold">Друзья</h1>
	<p class="text-sm text-muted-foreground">Друг видит только то, что ты сама разрешишь, и только под прозвищем. Пока вы только соединяетесь: что именно показывать, ты выберешь отдельно для каждой цели и задачи.</p>

	<section class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="invite-h">
		<h2 id="invite-h" class="text-lg font-semibold">Позвать друга</h2>
		<form method="POST" action="?/invite" use:enhance class="flex flex-col gap-3" data-testid="invite-form">
			<label class="flex flex-col gap-1 text-sm">
				Как друг будет тебя видеть (прозвище)
				<input name="nickname" required maxlength="30" placeholder="Например: Маша" class="h-11 rounded-md border bg-background px-3" />
			</label>
			{#if form?.action === 'invite' && form.message}<p role="alert" class="text-sm text-destructive">{form.message}</p>{/if}
			<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Создать ссылку</button>
		</form>
		{#if form?.action === 'invite' && form.link}
			<div class="flex flex-col gap-2 rounded-lg border bg-primary/10 p-3 text-sm" data-testid="invite-link">
				<p>Отправь эту ссылку другу. Она работает {data.inviteDays} дней и один раз. Я покажу её только сейчас.</p>
				<input readonly value={form.link} aria-label="Ссылка-приглашение" class="h-11 rounded-md border bg-background px-3 text-xs" onfocus={(e) => e.currentTarget.select()} />
				<button type="button" class="h-11 rounded-md border px-4" onclick={() => copy(form.link)}>{copied ? 'Скопировано' : 'Скопировать'}</button>
				<p class="text-xs text-muted-foreground">Если ссылка привела друга на вход, пусть войдёт и откроет её ещё раз.</p>
			</div>
		{/if}
		{#if data.invites.length}
			<ul class="flex flex-col divide-y text-sm" data-testid="invite-list">
				{#each data.invites as i (i.id)}
					<li class="flex items-center justify-between gap-3 py-2">
						<span>Приглашение как «{i.nickname}», до {formatDate(i.expiresAt.slice(0, 10))}</span>
						<form method="POST" action="?/dropInvite" use:enhance>
							<input type="hidden" name="id" value={i.id} />
							<button type="submit" class="h-11 rounded-md px-3 text-muted-foreground hover:text-destructive">Отозвать</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="friends-h">
		<h2 id="friends-h" class="text-xl font-semibold">Мои друзья ({data.friends.length} из {data.maxFriends})</h2>
		{#if form?.action === 'end' && form.message}<p role="alert" class="text-sm text-destructive">{form.message}</p>{/if}
		{#if data.friends.length}
			<ul class="flex flex-col gap-2" data-testid="friend-list">
				{#each data.friends as f (f.id)}
					<li class="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm" data-testid="friend">
						<span class="font-medium">{f.nickname}</span>
						{#if confirming === f.id}
							<form method="POST" action="?/end" use:enhance={() => async ({ update }) => { await update(); confirming = null; }} class="flex gap-2">
								<input type="hidden" name="id" value={f.id} />
								<button type="submit" class="h-11 rounded-md bg-destructive px-3 text-sm text-white">Перестать дружить</button>
								<button type="button" class="h-11 rounded-md border px-3 text-sm" onclick={() => (confirming = null)}>Нет</button>
							</form>
						{:else}
							<button type="button" class="h-11 rounded-md px-3 text-sm text-muted-foreground hover:text-destructive" onclick={() => (confirming = f.id)}>Перестать дружить</button>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground" data-testid="friends-empty">Друзей пока нет. Создай ссылку выше и отправь её.</p>
		{/if}
	</section>
</main>
