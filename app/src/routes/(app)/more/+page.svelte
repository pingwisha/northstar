<script lang="ts">
	let { data } = $props();

	// The sections that do not fit into the bottom bar of a phone.
	const sections = $derived([
		{ href: '/check', title: 'Проверь себя', text: 'Вопросы от ИИ по теме. Что не вспомнилось, попадёт в тетрадь ошибок.' },
		{ href: '/trials', title: 'Пробники', text: 'Результаты тренировочных работ и слабые темы.' },
		{ href: '/mistakes', title: 'Тетрадь ошибок', text: 'Где были ошибки и что уже исправлено.' },
		{ href: '/report', title: 'Недельный отчёт', text: 'Цифры за неделю, можно скопировать или сохранить в PDF.' },
		{ href: '/exam', title: 'Режим экзамена', text: 'Что осталось по неделям и повторение слабых тем.' },
		{ href: '/settings', title: 'Настройки', text: 'Тема, цвет, размер текста и напоминания.' },
		{ href: '/account', title: 'Мои данные', text: 'Скачать всё, что хранится, или удалить аккаунт.' },
		...(data.role === 'owner'
			? [
					{ href: '/family', title: 'Семья и доступ', text: 'Приглашения и сводка по сайту.' },
					{ href: '/stats', title: 'Статистика', text: 'Четыре числа брифа: план, первые дни, возвращение.' }
				]
			: []),
		{ href: 'mailto:northstart.help@gmail.com', title: 'Написать нам', text: 'Ошибка, вопрос или идея: northstart.help@gmail.com' }
	]);
</script>

<svelte:head><title>Ещё. Northstart</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
	<h1 class="text-3xl font-semibold">Ещё</h1>
	<ul class="flex flex-col gap-2" data-testid="more-list">
		{#each sections as s (s.href)}
			<li>
				<a href={s.href} class="flex flex-col gap-0.5 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary">
					<span class="font-medium">{s.title}</span>
					<span class="text-sm text-muted-foreground">{s.text}</span>
				</a>
			</li>
		{/each}
	</ul>
</main>
