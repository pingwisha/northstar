<script lang="ts">
	import { enhance } from '$app/forms';
	import type { HomeTask } from '$lib/home-view';

	// One task with its checkbox and materials. The checkbox posts to the "check" action of the page it sits on.
	let { task }: { task: HomeTask } = $props();
	const KIND: Record<string, string> = { article: 'Статья', video: 'Видео', trainer: 'Тренажёр', checklist: 'Чек-лист', other: 'Материал' };
</script>

	<li class="flex items-center gap-3 rounded-xl border bg-card shadow-sm p-3" data-testid="task">
	<form method="POST" action="?/check" use:enhance class="contents">
		<input type="hidden" name="id" value={task.id} />
		<input type="hidden" name="done" value={task.done ? '0' : '1'} />
		<button
			type="submit"
			role="checkbox"
			aria-checked={task.done}
			aria-label={task.done ? `Снять отметку: ${task.title}` : `Отметить: ${task.title}`}
			class="flex size-11 shrink-0 items-center justify-center rounded-md border-2 {task.done ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}"
		>
			{#if task.done}✓{/if}
		</button>
	</form>
	<div class="flex min-w-0 flex-col">
		<span class={task.done ? 'text-muted-foreground line-through' : ''}>{task.title}</span>
		<span class="text-xs text-muted-foreground">{task.goalTitle}</span>
		{#if task.materials.length}
			<ul class="mt-2 flex flex-col gap-1" data-testid="materials">
				{#each task.materials as m}
					<li class="text-sm">
						<span class="text-muted-foreground">{KIND[m.kind]}:</span>
						{#if m.url}
							<a href={m.url} target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2">{m.title}</a>
						{:else}
							{m.title}{#if m.hint}<span class="text-muted-foreground">. Где искать: {m.hint}</span>{/if}
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</li>
