<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { HomeTask } from '$lib/home-view';

	// One task with its checkbox and materials, and a menu to rename, move or delete it.
	// Every form posts to the actions of the page it sits on (see lib/server/task-actions.ts).
	let { task, today }: { task: HomeTask; today: string } = $props();
	const KIND: Record<string, string> = { article: 'Статья', video: 'Видео', trainer: 'Тренажёр', checklist: 'Чек-лист', other: 'Материал' };
	let editing = $state(false);
	let confirmDelete = $state(false);
	// Keep ?month and ?day in the address so the page stays where the person was.
	const act = (name: string) => `${page.url.search}${page.url.search ? '&' : '?'}/${name}`;
</script>

<li class="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm" data-testid="task">
	<div class="flex items-center gap-3">
		<form method="POST" action={act('check')} use:enhance class="contents">
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
		<div class="flex min-w-0 flex-1 flex-col">
			<span class={task.done ? 'text-muted-foreground line-through' : ''}>{task.title}</span>
			<span class="text-xs text-muted-foreground">{task.goalTitle}</span>
			{#if task.note}
				<p class="mt-2 whitespace-pre-line rounded-md bg-muted px-3 py-2 text-sm" data-testid="note">{task.note}</p>
			{/if}
			{#if task.materials.length}
				<ul class="mt-2 flex flex-col gap-1" data-testid="materials">
					{#each task.materials as m}
						<li class="text-sm">
							<span class="text-muted-foreground">{KIND[m.kind]}:</span>
							{#if m.url}
								<a href={m.url} target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2">{m.title}</a>{#if m.own}<span class="text-muted-foreground"> (моя)</span>{/if}
							{:else}
								{m.title}{#if m.hint}<span class="text-muted-foreground">. Где искать: {m.hint}</span>{/if}
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<button
			type="button"
			class="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
			aria-label={`Изменить задачу: ${task.title}`}
			aria-expanded={editing}
			onclick={() => {
				editing = !editing;
				confirmDelete = false;
			}}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
		</button>
	</div>

	{#if editing}
		<div class="flex flex-col gap-3 border-t pt-3">
			<form method="POST" action={act('editTask')} use:enhance={() => async ({ update, result }) => { await update({ reset: false }); if (result.type === 'success') editing = false; }} class="flex flex-col gap-2">
				<input type="hidden" name="id" value={task.id} />
				<label class="flex flex-col gap-1 text-sm">
					Название
					<input name="title" required maxlength="160" value={task.title} class="h-11 rounded-md border bg-background px-3" />
				</label>
				<label class="flex flex-col gap-1 text-sm">
					День
					<input name="day" type="date" required min={task.plannedFor < today ? task.plannedFor : today} value={task.plannedFor} class="h-11 rounded-md border bg-background px-3" />
				</label>
				<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Сохранить</button>
			</form>

			<form method="POST" action={act('saveNote')} use:enhance={() => async ({ update }) => { await update({ reset: false }); }} class="flex flex-col gap-2 border-t pt-3">
				<input type="hidden" name="id" value={task.id} />
				<label class="flex flex-col gap-1 text-sm">
					Моя заметка
					<textarea name="note" rows="3" maxlength="1000" class="rounded-md border bg-background px-3 py-2">{task.note ?? ''}</textarea>
				</label>
				<button type="submit" class="h-11 rounded-md border px-4 text-sm font-medium">Сохранить заметку</button>
			</form>

			<div class="flex flex-col gap-2 border-t pt-3" data-testid="own-materials">
				<p class="text-sm font-medium">Мои ссылки</p>
				{#each task.materials.filter((m) => m.own) as m (m.id)}
					<form method="POST" action={act('deleteMaterial')} use:enhance class="flex items-center gap-2 text-sm">
						<input type="hidden" name="materialId" value={m.id} />
						<span class="min-w-0 flex-1 truncate">{m.title}</span>
						<button type="submit" class="h-11 shrink-0 rounded-md border px-3 text-destructive" aria-label={`Убрать ссылку: ${m.title}`}>Убрать</button>
					</form>
				{/each}
				<form method="POST" action={act('addMaterial')} use:enhance class="flex flex-col gap-2">
					<input type="hidden" name="id" value={task.id} />
					<label class="flex flex-col gap-1 text-sm">
						Ссылка (https://…)
						<input name="url" type="url" required inputmode="url" class="h-11 rounded-md border bg-background px-3" />
					</label>
					<label class="flex flex-col gap-1 text-sm">
						Подпись ссылки (можно пропустить)
						<input name="title" maxlength="120" class="h-11 rounded-md border bg-background px-3" />
					</label>
					<button type="submit" class="h-11 rounded-md border px-4 text-sm font-medium">Добавить ссылку</button>
				</form>
				<p class="text-xs text-muted-foreground">Заметку и свои ссылки видит и ИИ в чате. Ссылки от ИИ здесь менять нельзя.</p>
			</div>

			{#if confirmDelete}
				<form method="POST" action={act('deleteTask')} use:enhance class="flex flex-col gap-2">
					<input type="hidden" name="id" value={task.id} />
					<p class="text-sm">Удалить задачу насовсем? Процент цели пересчитается.</p>
					<div class="flex gap-2">
						<button type="submit" class="h-11 flex-1 rounded-md bg-destructive px-4 text-sm font-medium text-white">Да, удалить</button>
						<button type="button" class="h-11 flex-1 rounded-md border px-4 text-sm" onclick={() => (confirmDelete = false)}>Не удалять</button>
					</div>
				</form>
			{:else}
				<button type="button" class="h-11 rounded-md border border-destructive px-4 text-sm text-destructive" onclick={() => (confirmDelete = true)}>Удалить задачу</button>
			{/if}
		</div>
	{/if}
</li>
