<script lang="ts">
	import { enhance } from '$app/forms';

	// A form to add one task, or several at once, one per line. Posts to the "addTask" action of the page.
	let {
		goals,
		today,
		day = today,
		form
	}: {
		goals: { id: string; title: string; deadline: string }[];
		today: string;
		day?: string;
		form?: { action?: string; message?: string; values?: { goalId: string; titles: string; day: string } } | null;
	} = $props();
	let open = $state(false);
	const failed = $derived(form?.action === 'addTask' && form.message ? form : null);
</script>

{#if goals.length}
	<div class="flex flex-col gap-3">
		<button type="button" class="h-11 self-start rounded-md border px-4 text-sm font-medium" aria-expanded={open || !!failed} onclick={() => (open = !open)}>
			Добавить задачу
		</button>
		{#if open || failed}
			<form
				method="POST"
				action="?/addTask"
				use:enhance={() => async ({ update, result }) => { await update({ reset: result.type === 'success' }); if (result.type === 'success') open = false; }}
				class="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm"
				data-testid="add-task"
			>
				<label class="flex flex-col gap-1 text-sm">
					К какой цели
					<select name="goalId" required class="h-11 rounded-md border bg-background px-3">
						{#each goals as g (g.id)}
							<option value={g.id} selected={g.id === (failed?.values?.goalId ?? goals[0].id)}>{g.title}</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1 text-sm">
					Что сделать. Можно вставить список, по одной задаче на строку
					<textarea name="titles" rows="3" required class="rounded-md border bg-background px-3 py-2">{failed?.values?.titles ?? ''}</textarea>
				</label>
				<label class="flex flex-col gap-1 text-sm">
					На какой день
					<input name="day" type="date" required min={today} value={failed?.values?.day ?? day} class="h-11 rounded-md border bg-background px-3" />
				</label>
				{#if failed}<p role="alert" class="text-sm text-destructive">{failed.message}</p>{/if}
				<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Добавить</button>
			</form>
		{/if}
	</div>
{/if}
