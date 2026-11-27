<script lang="ts">
	import { enhance } from '$app/forms';
	import AddTask from '$lib/components/AddTask.svelte';
	import TaskRow from '$lib/components/TaskRow.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import { formatDate } from '$lib/goals';
	import { streakLabel } from '$lib/streak';
	import Milestone from '$lib/components/Milestone.svelte';
	import Illustration from '$lib/components/Illustration.svelte';
	import { weekTotal } from '$lib/activity';

	let { data, form } = $props();
	const home = $derived(data.home);
	const OVERDUE_SHOWN = 5;
	const total7 = $derived(weekTotal(home.week7));
	const maxDay = $derived(Math.max(1, ...home.week7.map((d) => d.count)));
	const doneToday = $derived(home.today.filter((t) => t.done).length);
	const STEPS = [
		['1', 'Поставь цель и срок', 'Например: сдать экзамен к определённой дате.'],
		['2', 'Получи план по дням', 'ИИ разложит цель на этапы и задачи до самого срока.'],
		['3', 'Отмечай сделанное', 'Прогресс считается честно: только по твоим отметкам.']
	];
	const paceClass = { on_track: 'text-foreground', ahead: 'text-foreground', behind: 'text-destructive' } as const;
</script>



<svelte:head><title>Сегодня. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<h1 class="text-3xl font-semibold">Сегодня</h1>

	{#if home.activeGoals === 0}
		<div class="flex flex-col gap-6 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm" data-testid="home-empty">
			<div class="flex flex-col items-center gap-3 text-center">
				<Illustration kind="start" size={170} />
				<h2 class="text-2xl font-semibold">Добро пожаловать в Northstart</h2>
				<p class="max-w-md text-muted-foreground">Целей пока нет. Добавь первую, и здесь появятся задачи на каждый день, серия и честный процент.</p>
				<a href="/goals?add=1" class="inline-flex h-12 items-center rounded-md bg-primary px-6 font-medium text-primary-foreground transition-transform hover:scale-[1.03]">Добавить цель</a>
			</div>
			<ol class="grid gap-3 sm:grid-cols-3" aria-label="Как это работает">
				{#each STEPS as [n, title, text], i (n)}
					<li class="rise flex gap-3 rounded-xl border bg-card p-4" style:--i={i}>
						<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{n}</span>
						<span class="flex flex-col gap-0.5"><span class="font-medium">{title}</span><span class="text-sm text-muted-foreground">{text}</span></span>
					</li>
				{/each}
			</ol>
		</div>
	{:else}
		<Milestone goals={home.goals} today={data.today} />

		<section class="flex items-center gap-5 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm" aria-label="Общий прогресс">
			<ProgressRing percent={home.overall} size={128} label="Общий прогресс" />
			<div class="flex min-w-0 flex-col gap-1">
				<p class="text-sm text-muted-foreground">Общий прогресс</p>
				{#if home.week}
					<p class="font-medium {paceClass[home.week.state]}" data-testid="week">{home.week.label[0].toUpperCase() + home.week.label.slice(1)}</p>
				{:else}
					<p class="text-sm text-muted-foreground" data-testid="week">Плана пока нет, оценить темп не по чему.</p>
				{/if}
				<p class="text-sm" data-testid="streak">
					{#if home.streak > 0}🔥 Серия: {streakLabel(home.streak)}{:else}Серия: отметь задачу сегодня, чтобы начать{/if}
				</p>
				{#if home.nearest}
					<p class="text-sm" data-testid="nearest">
						Ближайший срок: {home.nearest.goalTitle}, {formatDate(home.nearest.deadline)}, {home.nearest.daysLabel}
					</p>
				{/if}
			</div>
		</section>

		<div class="grid grid-cols-2 gap-3" data-testid="tiles">
			<div class="rise rounded-xl border bg-card p-4 shadow-sm" style:--i={0}>
				<p class="text-3xl font-semibold tabular-nums" data-testid="tile-week">{total7}</p>
				<p class="text-sm text-muted-foreground">задач сделано за 7 дней</p>
			</div>
			<div class="rise rounded-xl border bg-card p-4 shadow-sm" style:--i={1}>
				<p class="text-3xl font-semibold tabular-nums" data-testid="tile-today">{doneToday}<span class="text-lg text-muted-foreground"> из {home.today.length}</span></p>
				<p class="text-sm text-muted-foreground">задач на сегодня</p>
			</div>
		</div>

		<section class="rounded-xl border bg-card p-4 shadow-sm" aria-labelledby="chart-title">
			<h2 id="chart-title" class="mb-3 text-base font-semibold">Активность за неделю</h2>
			<div class="flex h-28 items-end gap-2" role="img" aria-label={`Задач сделано по дням: ${home.week7.map((d) => `${d.weekday} ${d.count}`).join(', ')}`} data-testid="week-chart">
				{#each home.week7 as d, i (d.date)}
					<div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
						<span class="text-xs tabular-nums text-muted-foreground">{d.count || ''}</span>
						<div class="bar-grow w-full max-w-9 rounded-t-md {d.today ? 'bg-primary' : 'bg-primary/35'}" style:height="{d.count ? Math.max(8, Math.round((d.count / maxDay) * 64)) : 4}px" style:--i={i} class:opacity-40={d.count === 0}></div>
						<span class="text-xs {d.today ? 'font-semibold text-foreground' : 'text-muted-foreground'}">{d.weekday}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="goals-title">
			<div class="flex items-baseline justify-between">
				<h2 id="goals-title" class="text-xl font-semibold">Мои цели</h2>
				<a href="/goals" class="text-sm text-primary underline underline-offset-2">Все цели</a>
			</div>
			<ul class="grid gap-3 sm:grid-cols-2">
				{#each home.goals as g, i (g.id)}
					<li class="goal-{g.color} rise flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm" style:--i={i} data-testid="goal-chip">
						<div class="flex items-center gap-2"><span class="text-xl" aria-hidden="true">{g.icon}</span><span class="min-w-0 truncate font-medium">{g.title}</span></div>
						<div class="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${g.title}: ${g.percent}%`}>
							<div class="sweep h-full rounded-full bg-[var(--goal)]" style:width="{g.percent}%" style:--i={i}></div>
						</div>
						<p class="text-xs text-muted-foreground">{g.percent}%, {g.daysLabel}</p>
					</li>
				{/each}
			</ul>
		</section>

		<div class="-mt-2 flex gap-4 text-sm">
			<a href="/report" class="text-primary underline underline-offset-2">Недельный отчёт</a>
			<a href="/exam" class="text-primary underline underline-offset-2">Режим экзамена</a>
			<a href="/mistakes" class="text-primary underline underline-offset-2">Тетрадь ошибок</a>
		</div>

		{#if data.reviews.length}
			<section class="flex flex-col gap-3 rounded-xl border bg-primary/10 p-4" aria-labelledby="review-title" data-testid="reviews">
				<h2 id="review-title" class="text-xl font-semibold">Повторить сегодня</h2>
				<p class="text-sm text-muted-foreground">Ошибки из тетради возвращаются через 1, 3 и 7 дней. Вспомни, как правильно, и отметь.</p>
				<ul class="flex flex-col gap-2">
					{#each data.reviews as r (r.id)}
						<li class="flex flex-col gap-2 rounded-lg border bg-card p-3" data-testid="review">
							<div class="flex flex-col">
								<span class="font-medium">{r.topic}</span>
								<span class="text-xs text-muted-foreground">{r.goalTitle}</span>
								{#if r.note}<p class="mt-1 whitespace-pre-line text-sm">{r.note}</p>{/if}
							</div>
							<form method="POST" action="?/review" use:enhance class="flex gap-2">
								<input type="hidden" name="id" value={r.id} />
								<button type="submit" name="remembered" value="1" class="h-11 flex-1 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Вспомнил</button>
								<button type="submit" name="remembered" value="0" class="h-11 flex-1 rounded-md border px-4 text-sm font-medium">Не вспомнил</button>
							</form>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if form && 'message' in form && form.message && form.action !== 'addTask'}
			<p role="alert" class="text-sm text-destructive">{form.message}</p>
		{/if}

		<AddTask goals={home.goals} today={data.today} {form} />

		<section class="flex flex-col gap-3" aria-labelledby="today-title">
			<h2 id="today-title" class="text-xl font-semibold">Задачи на сегодня</h2>
			{#if home.today.length}
				<ul class="flex flex-col gap-2" data-testid="today-list">
					{#each home.today as task (task.id)}<TaskRow {task} today={data.today} />{/each}
				</ul>
			{:else}
				<div class="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center" data-testid="today-empty">
					<Illustration kind="tasks" size={110} />
					<p class="text-sm text-muted-foreground">На сегодня задач нет. Отдыхай или добавь свою.</p>
				</div>
			{/if}
		</section>

		{#if home.overdue.length}
			<section class="flex flex-col gap-3" aria-labelledby="overdue-title">
				<h2 id="overdue-title" class="text-xl font-semibold text-destructive">Не сделано раньше</h2>
				<ul class="flex flex-col gap-2" data-testid="overdue-list">
					{#each home.overdue.slice(0, OVERDUE_SHOWN) as task (task.id)}<TaskRow {task} today={data.today} />{/each}
				</ul>
				<a href="/goals" class="text-sm underline">Отстаёшь? Пересчитай план на странице целей.</a>
				{#if home.overdue.length > OVERDUE_SHOWN}
					<p class="text-sm text-muted-foreground">И ещё {home.overdue.length - OVERDUE_SHOWN} из прошлых дней.</p>
				{/if}
			</section>
		{/if}
	{/if}
</main>
