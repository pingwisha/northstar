<script lang="ts">
	import { formatDate } from '$lib/goals';

	let { data } = $props();
	const s = $derived(data.stats);
	const share = (r: { count: number; of: number }) => (r.of === 0 ? '—' : `${r.count} из ${r.of}`);
	const tiles = $derived([
		{ id: 'plan-accept', value: share(s.planAccept), title: 'Цели с принятым планом', text: 'Из целей, созданных после начала окна, у скольких есть задачи.' },
		{ id: 'first-3-days', value: share(s.firstThreeDays), title: 'Отметили задачу за первые 3 дня', text: 'Из людей, пришедших в окне.' },
		{ id: 'day-7', value: share(s.daySevenReturn), title: 'Вернулись на 7–10 день', text: 'Из людей, пришедших в окне не меньше 7 дней назад.' },
		{ id: 'midpoint', value: s.midpoint.percent === null ? '—' : `${s.midpoint.percent}%`, title: 'Честный процент на середине срока', text: `Средний по ${s.midpoint.goals} целям, у которых прошла половина срока. Справочное число.` }
	]);
</script>

<svelte:head><title>Статистика. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<h1 class="text-3xl font-semibold">Статистика</h1>
	<p class="text-muted-foreground">Четыре числа из брифа «Назвал цель и срок, получил план». Считаются с {formatDate(s.since)}, без твоих целей и тестовых аккаунтов. При малом числе людей один человек сильно двигает число, поэтому смотри и на размер выборки.</p>

	<section class="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="stats">
		{#each tiles as t (t.id)}
			<div class="rounded-xl border bg-card p-4 shadow-sm" data-testid="stat-{t.id}">
				<p class="text-3xl font-semibold tabular-nums">{t.value}</p>
				<p class="font-medium">{t.title}</p>
				<p class="text-sm text-muted-foreground">{t.text}</p>
			</div>
		{/each}
	</section>
	<p class="text-xs text-muted-foreground">Только числа: имена, почты и тексты целей здесь не показываются.</p>
</main>
