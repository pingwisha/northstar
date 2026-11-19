<script lang="ts">
	import AddTask from '$lib/components/AddTask.svelte';
	import TaskRow from '$lib/components/TaskRow.svelte';
	import { dayTitle, monthGrid, monthTitle, shiftMonth } from '$lib/calendar';

	let { data, form } = $props();
	const weeks = $derived(monthGrid(data.month));
	const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
	const link = (month: string, day?: string) => `?month=${month}${day ? `&day=${day}` : ''}`;
	const label = (date: string) => {
		const d = data.days[date];
		if (!d) return dayTitle(date);
		const parts = [d.total ? `задач ${d.total}, сделано ${d.done}` : '', d.overdue ? `не сделано ${d.overdue}` : '', d.deadlines.length ? `срок цели: ${d.deadlines.join(', ')}` : ''];
		return `${dayTitle(date)}: ${parts.filter(Boolean).join(', ')}`;
	};
</script>

<svelte:head><title>Календарь. Northstar</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
	<h1 class="text-3xl font-semibold">Календарь</h1>

	<div class="flex items-center justify-between gap-2">
		<a href={link(shiftMonth(data.month, -1))} class="flex size-11 items-center justify-center rounded-full border" aria-label="Прошлый месяц" data-sveltekit-noscroll>‹</a>
		<div class="flex flex-col items-center">
			<h2 class="text-lg font-semibold" data-testid="month-title">{monthTitle(data.month)}</h2>
			{#if !data.today.startsWith(data.month)}
				<a href={link(data.today.slice(0, 7), data.today)} class="text-sm text-primary underline underline-offset-2" data-sveltekit-noscroll>К сегодняшнему дню</a>
			{/if}
		</div>
		<a href={link(shiftMonth(data.month, 1))} class="flex size-11 items-center justify-center rounded-full border" aria-label="Следующий месяц" data-sveltekit-noscroll>›</a>
	</div>

	<div class="rounded-2xl border bg-card p-2 shadow-sm sm:p-3" data-testid="calendar">
		<div class="grid grid-cols-7 pb-1 text-center text-xs text-muted-foreground">
			{#each WEEKDAYS as w}<span>{w}</span>{/each}
		</div>
		<div class="grid grid-cols-7 gap-1">
			{#each weeks.flat() as cell (cell.date)}
				{@const d = data.days[cell.date]}
				<a
					href={link(data.month, cell.date)}
					data-sveltekit-noscroll
					data-testid="day"
					data-date={cell.date}
					aria-label={label(cell.date)}
					aria-current={cell.date === data.day ? 'date' : undefined}
					class="flex h-14 flex-col items-center justify-start gap-0.5 rounded-lg border p-1 text-sm transition-colors sm:h-16
						{cell.date === data.day ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}
						{cell.inMonth ? '' : 'opacity-40'}
						{cell.date === data.today ? 'font-bold text-primary' : ''}"
				>
					<span>{+cell.date.slice(8)}</span>
					{#if d?.total}
						<span
							class="rounded-full px-1.5 text-[11px] leading-4 tabular-nums {d.overdue ? 'bg-destructive/15 text-destructive' : d.done === d.total ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
						>{d.done === d.total ? '✓' : `${d.done}/${d.total}`}</span>
					{/if}
					{#if d?.deadlines.length}<span class="text-[11px] leading-3 text-primary" aria-hidden="true">★</span>{/if}
				</a>
			{/each}
		</div>
	</div>

	<p class="text-xs text-muted-foreground">Число в клетке: сделано из запланированного. Красным отмечены дни с несделанным. Звёздочка: срок цели.</p>

	{#if data.day}
		<section class="flex flex-col gap-3" aria-labelledby="day-title">
			<h2 id="day-title" class="text-xl font-semibold" data-testid="day-title">{dayTitle(data.day)}</h2>
			{#each data.dayDeadlines as title}
				<p class="rounded-lg bg-primary/10 px-3 py-2 text-sm">Срок цели: {title}</p>
			{/each}
			{#if form && 'message' in form && form.message && form.action !== 'addTask'}
				<p role="alert" class="text-sm text-destructive">{form.message}</p>
			{/if}
			<AddTask goals={data.goals} today={data.today} day={data.day >= data.today ? data.day : data.today} {form} />
			{#if data.dayTasks.length}
				<ul class="flex flex-col gap-2" data-testid="day-tasks">
					{#each data.dayTasks as task (task.id)}<TaskRow {task} today={data.today} />{/each}
				</ul>
			{:else}
				<p class="text-sm text-muted-foreground" data-testid="day-empty">{data.taskTotal ? 'На этот день задач нет.' : 'Задач пока нет: у целей ещё нет плана.'}</p>
			{/if}
		</section>
	{:else}
		<p class="text-sm text-muted-foreground">Выбери день, чтобы увидеть его задачи.</p>
	{/if}
</main>
