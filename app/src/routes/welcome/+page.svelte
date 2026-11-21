<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import Illustration from '$lib/components/Illustration.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';

	let { data } = $props();

	const STEPS = [
		['1', 'Поставь цель и срок', 'Например: сдать экзамен или выучить язык к определённой дате.'],
		['2', 'Получи план по дням', 'ИИ разложит цель на этапы и задачи до самого срока. Можно добавлять и свои.'],
		['3', 'Отмечай сделанное', 'Прогресс считается честно: только по твоим отметкам, без самообмана.']
	];
	const FEATURES = [
		['🗓️', 'План на каждый день', 'Сегодняшние задачи на главной, весь план в календаре. Учебные дни недели настраиваются.'],
		['📈', 'Честный процент', 'Видно, успеваешь ли ты к сроку. Отстала: одна кнопка пересчитает план.'],
		['🔥', 'Серия и поздравления', 'Дни подряд, график недели и небольшой праздник на важных отметках до срока.'],
		['📝', 'Пробники и тетрадь ошибок', 'Записывай результаты и ошибки: сайт покажет, какие темы повторяются.'],
		['🤖', 'ИИ-помощник', 'Строит план, отвечает в чате, комментирует неделю. У каждого свой дневной лимит.'],
		['🎨', 'Твой вид', 'Цвет и значок у каждой цели, тёмная тема, акцентный цвет и размер текста.']
	];
</script>

<svelte:head>
	<title>Northstart. Большие цели по шагам</title>
	<meta name="description" content="Northstart: поставь цель и срок, получи план по дням, отмечай задачи и смотри честный прогресс. Бесплатно." />
</svelte:head>

<div class="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-6 sm:py-10">
	<header class="flex items-center justify-between gap-3">
		<a href="/welcome" class="flex items-center gap-2.5 text-xl font-semibold tracking-tight"><Logo size={34} /> Northstart</a>
		<a href="/auth/google" class="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:border-primary hover:text-primary">Войти</a>
	</header>

	<section class="grid items-center gap-10 md:grid-cols-2" aria-labelledby="hero-h">
		<div class="flex flex-col gap-5">
			<h1 id="hero-h" class="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Большая цель.<br />Маленькие шаги.<br /><span class="text-primary">Честный процент.</span></h1>
			<p class="max-w-md text-lg text-muted-foreground">Northstart помогает дойти до цели к сроку: раскладывает её на задачи по дням и честно показывает, где ты сейчас.</p>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
				<a href="/auth/google" class="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-medium text-primary-foreground transition-transform hover:scale-[1.03]" data-testid="welcome-cta">Войти через Google</a>
				<a href="#how" class="inline-flex h-12 items-center justify-center rounded-md border px-6 font-medium hover:border-primary hover:text-primary">Как это работает</a>
			</div>
			<p class="text-sm text-muted-foreground">
				Бесплатно. {data.open ? 'Вход через Google, пароль придумывать не нужно.' : 'Сайт пока работает по приглашениям.'}
			</p>
		</div>

		<!-- A picture of the app, not real data. -->
		<div class="rise flex flex-col gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-lg" aria-hidden="true">
			<div class="flex items-center gap-4">
				<ProgressRing percent={64} size={104} label="Пример" />
				<div class="flex flex-col gap-1">
					<span class="text-sm text-muted-foreground">Сдать ОГЭ на 100 баллов</span>
					<span class="font-medium">Успеваешь</span>
					<span class="text-sm">🔥 Серия: 6 дней подряд</span>
				</div>
			</div>
			{#each [['Разобрать задание 12', true], ['Повторить формулы', true], ['Решить вариант 3', false]] as [title, done]}
				<div class="goal-violet flex items-center gap-3 rounded-xl border border-l-4 border-l-[var(--goal)] bg-card p-3">
					<span class="flex size-8 items-center justify-center rounded-md border-2 {done ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}">{done ? '✓' : ''}</span>
					<span class={done ? 'text-muted-foreground line-through' : ''}>{title}</span>
				</div>
			{/each}
		</div>
	</section>

	<section id="how" class="flex flex-col gap-6" aria-labelledby="how-h">
		<div class="flex flex-col items-center gap-2 text-center">
			<Illustration kind="start" size={150} />
			<h2 id="how-h" class="text-3xl font-semibold tracking-tight">Как это работает</h2>
		</div>
		<ol class="grid gap-4 md:grid-cols-3">
			{#each STEPS as [n, title, text], i (n)}
				<li class="rise flex gap-4 rounded-xl border bg-card p-5 shadow-sm" style:--i={i}>
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{n}</span>
					<span class="flex flex-col gap-1"><span class="font-medium">{title}</span><span class="text-sm text-muted-foreground">{text}</span></span>
				</li>
			{/each}
		</ol>
	</section>

	<section class="flex flex-col gap-6" aria-labelledby="feat-h">
		<h2 id="feat-h" class="text-center text-3xl font-semibold tracking-tight">Что внутри</h2>
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each FEATURES as [icon, title, text], i (title)}
				<li class="rise flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-sm" style:--i={i}>
					<span class="text-2xl" aria-hidden="true">{icon}</span>
					<span class="font-medium">{title}</span>
					<span class="text-sm text-muted-foreground">{text}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="flex flex-col gap-3 rounded-2xl border bg-primary/10 p-6" aria-labelledby="honest-h">
		<h2 id="honest-h" class="text-2xl font-semibold tracking-tight">Честно о главном</h2>
		<ul class="list-disc pl-5 text-sm leading-relaxed sm:text-base">
			<li>Процент растёт только от твоих отметок. Сайт не гарантирует результат экзамена или цели, он помогает не терять путь.</li>
			<li>ИИ может ошибаться, поэтому важное проверяй. Его запросы ограничены на каждый день.</li>
			<li>Твои цели видишь только ты. Всё, что хранит сайт, можно скачать и удалить вместе с аккаунтом.</li>
			<li>Реклам нет, данные не продаются.</li>
		</ul>
	</section>

	<section class="flex flex-col items-center gap-4 pb-4 text-center" aria-label="Начать">
		<h2 class="text-3xl font-semibold tracking-tight">Начни с одной цели</h2>
		<a href="/auth/google" class="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 font-medium text-primary-foreground transition-transform hover:scale-[1.03]">Войти через Google</a>
		<p class="text-xs text-muted-foreground">Входя, ты соглашаешься с <a href="/terms" class="underline underline-offset-2">условиями</a> и <a href="/privacy" class="underline underline-offset-2">правилами хранения данных</a>.</p>
	</section>

	<footer class="flex flex-wrap justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
		<span>© Northstart</span>
		<span class="flex flex-wrap gap-4">
			<a href="/privacy" class="underline underline-offset-2">Конфиденциальность</a>
			<a href="/terms" class="underline underline-offset-2">Условия</a>
			<a href="mailto:northstart.help@gmail.com" class="underline underline-offset-2">northstart.help@gmail.com</a>
		</span>
	</footer>
</div>
