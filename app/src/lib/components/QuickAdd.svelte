<script lang="ts">
	import { enhance } from '$app/forms';

	// One line with the day in the text. Posts to the "quickAdd" action of the page.
	let {
		goals,
		form
	}: {
		goals: { id: string; title: string }[];
		form?: { action?: string; message?: string; values?: { goalId: string; text?: string } } | null;
	} = $props();
	const failed = $derived(form?.action === 'quickAdd' && form.message ? form : null);
</script>

{#if goals.length}
	<form method="POST" action="?/quickAdd" use:enhance class="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm" data-testid="quick-add">
		<label class="flex flex-col gap-1 text-sm">
			Быстрая задача
			<input name="text" required maxlength="200" value={failed?.values?.text ?? ''} placeholder="завтра в 18:00 решить варианты" class="h-11 min-w-0 rounded-md border bg-background px-3" />
		</label>
		<div class="flex gap-2">
			{#if goals.length > 1}
				<select name="goalId" aria-label="К какой цели" class="h-11 min-w-0 flex-1 rounded-md border bg-background px-3">
					{#each goals as g (g.id)}<option value={g.id} selected={g.id === failed?.values?.goalId}>{g.title}</option>{/each}
				</select>
			{:else}
				<input type="hidden" name="goalId" value={goals[0].id} />
			{/if}
			<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Добавить</button>
		</div>
		<p class="text-xs text-muted-foreground">Без дня задача встанет на сегодня. Понимаю «завтра», «в пятницу», «через 3 дня», «27.11».</p>
		{#if failed}<p role="alert" class="text-sm text-destructive">{failed.message}</p>{/if}
	</form>
{/if}
