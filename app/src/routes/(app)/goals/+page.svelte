<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import { WEEKDAYS, formatDate } from '$lib/goals';
	import { GOAL_COLORS, GOAL_COLOR_NAMES, GOAL_ICONS, GOAL_ICON_KEYS, GOAL_ICON_NAMES } from '$lib/goal-look';
	import Illustration from '$lib/components/Illustration.svelte';

	let { data, form } = $props();

	const active = $derived(data.cards.filter((c) => c.status === 'active'));
	const finished = $derived(data.cards.filter((c) => c.status === 'done'));
	const archived = $derived(data.cards.filter((c) => c.status === 'archived'));
	let adding = $state(page.url.searchParams.has('add'));
	let creating = $state(false);
	let editing = $state<string | null>(null);
	let planning = $state<string | null>(null);

	// Step two of the plan: materials, one stage at a time, started by the page itself.
	let filling = $state(false);
	let gaveUp = $state(false);
	const stuck = new Set<string>();
	const hasPending = $derived(Object.values(data.pending).some((l) => l.length > 0));
	$effect(() => {
		if (filling) return;
		const next = Object.entries(data.pending).flatMap(([goalId, list]) => list.map((stage) => [goalId, stage] as const)).find(([g, i]) => !stuck.has(`${g}:${i}`));
		if (!next) return;
		filling = true;
		const [goalId, stage] = next;
		const body = new FormData();
		body.set('id', goalId);
		body.set('stage', String(stage));
		void (async () => {
			try {
				const res = await fetch('?/materials', { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
				const result = deserialize(await res.text());
				if (result.type !== 'success') { stuck.add(`${goalId}:${stage}`); gaveUp = true; }
			} catch {
				stuck.add(`${goalId}:${stage}`);
				gaveUp = true;
			}
			await invalidateAll();
			filling = false;
		})();
	});

	const paceClass = { on_track: 'text-foreground', ahead: 'text-foreground', behind: 'text-destructive' } as const;
</script>

<svelte:head><title>Мои цели. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-3xl font-semibold" data-testid="goals-title">Мои цели</h1>
		<button
			type="button"
			class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
			onclick={() => (adding = !adding)}
			aria-expanded={adding}
		>
			Добавить цель
		</button>
	</div>

	{#if hasPending && !gaveUp}
		<p class="text-sm text-muted-foreground" role="status" data-testid="materials-status">Подбираю материалы к задачам…</p>
	{/if}

	{#if adding || (form?.action === 'add' && form.message)}
		<form method="POST" action="?/add" use:enhance={() => {
				creating = true;
				return async ({ update, result }) => {
					await update();
					creating = false;
					if (result.type === 'success') adding = false;
				};
			}} class="flex flex-col gap-3 rounded-xl border bg-card shadow-sm p-4">
			<label class="flex flex-col gap-1 text-sm">
				Что хочешь получить в итоге
				<input name="title" required maxlength="120" value={form?.values?.title ?? ''} placeholder="Например: сдать ОГЭ на 100 баллов" class="h-11 rounded-md border bg-background px-3" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Особые условия (необязательно)
				<textarea name="description" maxlength="500" rows="3" placeholder="Например: занимаюсь по часу после школы, математика слабая, физику ещё не начинала" class="rounded-md border bg-background px-3 py-2">{form?.values?.description ?? ''}</textarea>
				<span class="text-muted-foreground">Если условия обычные, оставь пустым. ИИ сам составит этапы и задачи на каждый день.</span>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				К какому числу
				<input name="deadline" type="date" required min={data.today} value={form?.values?.deadline ?? ''} class="h-11 rounded-md border bg-background px-3" />
			</label>
			<details class="flex flex-col gap-3 text-sm">
				<summary class="inline-flex h-10 cursor-pointer items-center rounded-md border px-3">Дополнительно: цвет, значок, дни недели</summary>
				<div class="mt-3 flex flex-col gap-3">
			{@render lookPicker('add', GOAL_COLORS[data.cards.length % GOAL_COLORS.length], 'target')}
			<fieldset class="flex flex-col gap-2 text-sm">
				<input type="hidden" name="days_form" value="1" />
				<legend class="mb-1">В какие дни недели учишься</legend>
				<div class="flex flex-wrap gap-2">
					{#each WEEKDAYS as day (day.bit)}
						<label class="flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-md border px-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary">
							<input type="checkbox" name="days" value={day.bit} checked class="sr-only" aria-label={day.name} />
							{day.short}
						</label>
					{/each}
				</div>
			</fieldset>
				</div>
			</details>
			{#if form?.action === 'add' && form.message}
				<p role="alert" class="text-sm text-destructive">{form.message}</p>
			{/if}
			<button type="submit" disabled={creating} class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">{creating ? 'Создаю цель, ИИ строит план: это займёт 2-3 минуты, не закрывай страницу…' : 'Создать цель и план'}</button>
		</form>
	{/if}

	{#if form?.action === 'add' && form.ok && form.planMessage}
		<p role="status" class="rounded-md bg-muted p-3 text-sm" data-testid="plan-note">Цель добавлена, но план пока не построился. {form.planMessage} Нажми «Построить план» у цели, когда сможешь.</p>
	{/if}

	<ul class="flex flex-col gap-4" data-testid="goal-list">
		{#each active as card (card.id)}
			<li class="goal-{card.color} rise flex flex-col gap-4 rounded-xl border border-l-4 border-l-[var(--goal)] bg-card shadow-sm p-4" data-testid="goal-card">
				<div class="flex items-center gap-4">
					<ProgressRing percent={card.percent} label={card.title} color="var(--goal)" />
					<div class="flex min-w-0 flex-col gap-1">
						<h2 class="text-lg font-semibold"><a href="/goals/{card.id}" class="hover:underline" data-testid="goal-link"><span aria-hidden="true">{card.icon}</span> {card.title}</a></h2>
						<p class="text-sm text-muted-foreground">До {formatDate(card.deadline)}, {card.daysLabel}</p>
						<p class="text-sm font-medium {paceClass[card.pace.state]}">{card.pace.label[0].toUpperCase() + card.pace.label.slice(1)}</p>
					</div>
				</div>
				<p class="text-sm">
					<span class="text-muted-foreground">Следующий шаг:</span>
					{#if card.nextStep}
						{card.nextStep.title} ({formatDate(card.nextStep.plannedFor)})
					{:else if card.taskCount === 0}
						плана пока нет, он появится, когда ИИ его построит
					{:else}
						все задачи сделаны
					{/if}
				</p>

				{#if card.taskCount > 0}
					<div class="flex flex-wrap gap-2">
						<a href="/goals/{card.id}" class="inline-flex h-10 items-center rounded-md border px-3 text-sm" data-testid="open-goal">Все задачи цели ({card.taskCount})</a>
						<a href="/goals/{card.id}#edit-plan" class="inline-flex h-10 items-center rounded-md border px-3 text-sm" data-testid="edit-plan-link">Изменить план</a>
					</div>
				{/if}

				{#if editing === card.id}
					<form method="POST" action="?/deadline" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') editing = null; }} class="flex flex-col gap-2 sm:flex-row">
						<input type="hidden" name="id" value={card.id} />
						<input name="deadline" type="date" required min={data.today} value={card.deadline} aria-label="Новый срок" class="h-11 flex-1 rounded-md border bg-background px-3" />
						<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Сохранить срок</button>
					</form>
					{#if form?.action === 'deadline' && form.goalId === card.id && form.message}
						<p role="alert" class="text-sm text-destructive">{form.message}</p>
					{/if}
				{/if}

				{#if (data.stagesByGoal[card.id] ?? []).length > 0}
					<details class="text-sm" data-testid="stages">
						<summary class="inline-flex h-10 cursor-pointer items-center rounded-md border px-3">Этапы: {data.stagesByGoal[card.id].length}</summary>
						<ol class="mt-2 flex flex-col gap-3">
							{#each data.stagesByGoal[card.id] as stage, i (stage.id)}
								<li class="flex flex-col gap-1" data-testid="stage">
									<div class="flex flex-wrap items-baseline justify-between gap-x-3">
										<span class="min-w-0 font-medium">{i + 1}. {stage.title}</span>
										<span class="text-muted-foreground">{stage.percent}%, {stage.done} из {stage.total}{stage.dueDate ? `, до ${formatDate(stage.dueDate)}` : ''}</span>
									</div>
									<div class="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Этап {stage.title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow={stage.percent}>
										<div class="h-full rounded-full bg-[var(--goal)]" style="width: {stage.percent}%"></div>
									</div>
								</li>
							{/each}
						</ol>
					</details>
				{/if}

				{#if editing === card.id}
					<form method="POST" action="?/look" use:enhance class="flex flex-col gap-2">
						<input type="hidden" name="id" value={card.id} />
						{@render lookPicker(`look-${card.id}`, card.color, card.iconKey)}
						<button type="submit" class="h-11 rounded-md border px-4 text-sm font-medium">Сохранить цвет и значок</button>
					</form>
					<form method="POST" action="?/days" use:enhance class="flex flex-col gap-2">
						<input type="hidden" name="id" value={card.id} />
						<fieldset class="flex flex-col gap-2 text-sm">
							<legend class="mb-1">Учебные дни (задачи разложатся только по ним)</legend>
							<div class="flex flex-wrap gap-2">
								{#each WEEKDAYS as day (day.bit)}
									<label class="flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-md border px-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary">
										<input type="checkbox" name="days" value={day.bit} checked={(card.studyDays & day.bit) !== 0} class="sr-only" aria-label={day.name} />
										{day.short}
									</label>
								{/each}
							</div>
						</fieldset>
						<button type="submit" class="h-11 rounded-md border px-4 text-sm font-medium">Сохранить дни и разложить план заново</button>
					</form>
					{#if form?.action === 'days' && form.goalId === card.id}
						{#if 'summary' in form && form.summary}
							<p class="rounded-md bg-muted p-3 text-sm" data-testid="days-summary">{form.summary}</p>
						{:else if 'message' in form && form.message}
							<p role="alert" class="text-sm text-destructive">{form.message}</p>
						{/if}
					{/if}
				{/if}

				{#if card.taskCount === 0}
					{@const proposal = data.proposals.find((p) => p.goalId === card.id)}
					{#if proposal}
						{@render proposalView(card.id, proposal)}
					{/if}
					<form
						method="POST"
						action="?/plan"
						use:enhance={() => {
							planning = card.id;
							return async ({ update }) => {
								await update();
								planning = null;
							};
						}}
					>
						<input type="hidden" name="id" value={card.id} />
						<button
							type="submit"
							disabled={planning !== null}
							class="h-11 w-full rounded-md px-4 text-sm font-medium disabled:opacity-60 {proposal ? 'border' : 'bg-primary text-primary-foreground'}"
						>
							{planning === card.id ? 'ИИ строит план, это займёт около минуты…' : proposal ? 'Предложить другой план (ещё один запрос к ИИ)' : 'Построить план'}
						</button>
					</form>
					{#if form?.action === 'plan' && form.goalId === card.id && 'message' in form && form.message}
						<p role="alert" class="text-sm text-destructive">{form.message}</p>
					{/if}
				{/if}

				{#if card.pace.state === 'behind'}
					<form method="POST" action="?/behind" use:enhance>
						<input type="hidden" name="id" value={card.id} />
						<button type="submit" class="h-11 w-full rounded-md border-2 border-destructive px-4 text-sm font-medium text-destructive">Я отстаю: пересчитать план</button>
					</form>
				{/if}
				{#if form?.action === 'behind' && form.goalId === card.id}
					{#if 'changes' in form}
						<div class="flex flex-col gap-2 rounded-md bg-muted p-3 text-sm" data-testid="replan-preview">
							<p class="font-medium">Вот что изменится. Пока ничего не сохранено.</p>
							<p>{form.summary}</p>
							{#if form.changed}
								<ul class="flex flex-col gap-1">
									{#each form.changes as c, i (i)}
										<li class="flex flex-wrap justify-between gap-x-3">
											<span class="min-w-0">{c.title}</span>
											<span class="text-muted-foreground">{formatDate(c.from)} → {formatDate(c.to)}</span>
										</li>
									{/each}
								</ul>
								{#if form.total > form.changes.length}
									<p class="text-muted-foreground">…и ещё {form.total - form.changes.length}</p>
								{/if}
								<div class="flex flex-wrap gap-2">
									<form method="POST" action="?/behindApply" use:enhance>
										<input type="hidden" name="id" value={card.id} />
										<button type="submit" class="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Применить</button>
									</form>
								</div>
							{/if}
						</div>
					{:else if 'message' in form && form.message}
						<p role="alert" class="text-sm text-destructive">{form.message}</p>
					{/if}
				{/if}
				{#if form?.action === 'behindApply' && form.goalId === card.id && 'summary' in form}
					<p class="rounded-md bg-muted p-3 text-sm" data-testid="replan-summary">{form.summary}</p>
				{/if}

				<div class="flex flex-wrap gap-2">
					<button type="button" class="h-10 rounded-md border px-3 text-sm" onclick={() => (editing = editing === card.id ? null : card.id)}>Изменить срок</button>
					<form method="POST" action="?/finish" use:enhance>
						<input type="hidden" name="id" value={card.id} />
						<button type="submit" class="h-10 rounded-md border px-3 text-sm">Завершить</button>
					</form>
					<form method="POST" action="?/archive" use:enhance>
						<input type="hidden" name="id" value={card.id} />
						<button type="submit" class="h-10 rounded-md border px-3 text-sm">В архив (пауза)</button>
					</form>
				</div>
			</li>
		{:else}
			<li class="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card p-6 text-center text-muted-foreground">
				<Illustration kind="goals" size={120} />
				Пока нет активных целей. Нажми «Добавить цель»: назови цель и срок, остальное сделает ИИ.
			</li>
		{/each}
	</ul>

	{#if archived.length > 0}
		<section class="flex flex-col gap-2" data-testid="archive">
			<h2 class="text-lg font-semibold">Архив</h2>
			<p class="text-sm text-muted-foreground">Цели на паузе: их задач нет на главной и в календаре, а прогресс сохранён.</p>
			<ul class="flex flex-col gap-2">
				{#each archived as card (card.id)}
					<li class="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm" data-testid="archived-goal">
						<span class="min-w-0">{card.icon} {card.title} <span class="text-muted-foreground">({card.percent}%)</span></span>
						<form method="POST" action="?/restore" use:enhance>
							<input type="hidden" name="id" value={card.id} />
							<button type="submit" class="h-10 rounded-md border px-3">Вернуть</button>
						</form>
					</li>
					{#if form?.action === 'restore' && form.goalId === card.id && form.message}
						<li role="alert" class="text-sm text-destructive">{form.message}</li>
					{/if}
				{/each}
			</ul>
		</section>
	{/if}

	{#if finished.length > 0}
		<section class="flex flex-col gap-2">
			<h2 class="text-lg font-semibold">Завершённые</h2>
			<ul class="flex flex-col gap-2">
				{#each finished as card (card.id)}
					<li class="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
						<span>{card.title}</span>
						<span class="text-muted-foreground">{card.percent}%</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
	<p class="text-sm text-muted-foreground">Хочешь понять, что уже усвоено? <a href="/check" class="text-primary underline underline-offset-2">Проверь себя вопросами от ИИ</a>.</p>
</main>

{#snippet proposalView(goalId: string, proposal: (typeof data.proposals)[number])}
	{@const count = proposal.stages.reduce((n, s) => n + s.tasks.length, 0)}
	<div class="flex flex-col gap-3 rounded-lg border-2 border-primary/40 p-3" data-testid="plan-proposal">
		<div>
			<p class="font-medium">Черновик плана от ИИ</p>
			<p class="text-sm text-muted-foreground">Пока это только предложение: ничего не сохранено. Сними галочку у лишней задачи, а потом нажми «Принять план». Даты разложатся заново по оставшимся задачам.</p>
		</div>
		<form method="POST" action="?/acceptPlan" use:enhance class="flex flex-col gap-3">
			<input type="hidden" name="id" value={goalId} />
			{#each proposal.stages as stage, i (i)}
				<fieldset class="flex flex-col gap-1">
					<legend class="text-sm font-semibold">{i + 1}. {stage.title} <span class="font-normal text-muted-foreground">до {formatDate(stage.dueDate)}</span></legend>
					{#each stage.tasks as task (task.n)}
						<label class="flex items-start gap-2 text-sm">
							<input type="checkbox" checked onchange={(e) => { /* an unticked task is sent as skip */ const box = e.currentTarget; const hidden = box.nextElementSibling as HTMLInputElement; hidden.disabled = box.checked; }} class="mt-1 size-4" aria-label={task.title} />
							<input type="hidden" name="skip" value={task.n} disabled />
							<span class="min-w-0 flex-1">{task.title}</span>
							<span class="shrink-0 text-muted-foreground">{formatDate(task.plannedFor)}{task.materials ? ` · ${task.materials} мат.` : ''}</span>
						</label>
					{/each}
				</fieldset>
			{/each}
			<p class="text-sm text-muted-foreground">Всего задач: {count}.{proposal.missing > 0 ? ` К ${proposal.missing} эт. материалы не подобрались, их можно добавить вручную.` : ''}</p>
			<div class="flex flex-wrap gap-2">
				<button type="submit" class="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Принять план</button>
			</div>
		</form>
		<form method="POST" action="?/discardPlan" use:enhance>
			<input type="hidden" name="id" value={goalId} />
			<button type="submit" class="h-10 rounded-md border px-3 text-sm">Отклонить черновик</button>
		</form>
		{#if (form?.action === 'acceptPlan' || form?.action === 'discardPlan') && form.goalId === goalId && 'message' in form && form.message}
			<p role="alert" class="text-sm text-destructive">{form.message}</p>
		{/if}
	</div>
{/snippet}

{#snippet lookPicker(id: string, color: string, icon: string)}
	<fieldset class="flex flex-col gap-2 text-sm">
		<legend class="mb-1">Цвет и значок</legend>
		<div class="flex flex-wrap gap-2">
			{#each GOAL_COLORS as c (c)}
				<label class="goal-{c} flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-transparent has-[:checked]:border-foreground" title={GOAL_COLOR_NAMES[c]}>
					<input type="radio" name="color" value={c} checked={c === color} class="sr-only" aria-label={GOAL_COLOR_NAMES[c]} />
					<span class="size-6 rounded-full bg-[var(--goal)]"></span>
				</label>
			{/each}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each GOAL_ICON_KEYS as k (k)}
				<label class="flex size-10 cursor-pointer items-center justify-center rounded-md border text-lg has-[:checked]:border-primary has-[:checked]:bg-primary/10" title={GOAL_ICON_NAMES[k]}>
					<input type="radio" name="icon" value={k} checked={k === icon} class="sr-only" aria-label={GOAL_ICON_NAMES[k]} />
					{GOAL_ICONS[k]}
				</label>
			{/each}
		</div>
	</fieldset>
{/snippet}
