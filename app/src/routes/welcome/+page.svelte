<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import Illustration from '$lib/components/Illustration.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';

	let { data } = $props();

	// Both languages live here; the visitor's browser language picks one, and the switch overrides it.
	const TEXT = {
		ru: {
			title: 'Northstart. Большие цели по шагам',
			description: 'Northstart: поставь цель и срок, получи план по дням, отмечай задачи и смотри честный прогресс. Бесплатно.',
			signIn: 'Войти',
			cta: 'Войти через Google',
			how: 'Как это работает',
			h1: ['Большая цель.', 'Маленькие шаги.', 'Честный процент.'],
			lead: 'Northstart помогает дойти до цели к сроку: раскладывает её на задачи по дням и честно показывает, где ты сейчас.',
			free: 'Бесплатно.',
			openNote: 'Вход через Google, пароль придумывать не нужно.',
			invitedNote: 'Сайт пока работает по приглашениям.',
			demoGoal: 'Сдать ОГЭ на 100 баллов',
			demoPace: 'Успеваешь',
			demoStreak: '🔥 Серия: 6 дней подряд',
			demoTasks: ['Разобрать задание 12', 'Повторить формулы', 'Решить вариант 3'],
			steps: [
				['1', 'Поставь цель и срок', 'Например: сдать экзамен или выучить язык к определённой дате.'],
				['2', 'Получи план по дням', 'ИИ разложит цель на этапы и задачи до самого срока. Можно добавлять и свои.'],
				['3', 'Отмечай сделанное', 'Прогресс считается честно: только по твоим отметкам, без самообмана.']
			],
			insideTitle: 'Что внутри',
			features: [
				['🗓️', 'План на каждый день', 'Сегодняшние задачи на главной, весь план в календаре. Учебные дни недели настраиваются.'],
				['📈', 'Честный процент', 'Видно, успеваешь ли ты к сроку. Отстала: одна кнопка пересчитает план.'],
				['🔥', 'Серия и поздравления', 'Дни подряд, график недели и небольшой праздник на важных отметках до срока.'],
				['📝', 'Пробники и тетрадь ошибок', 'Записывай результаты и ошибки: сайт покажет, какие темы повторяются.'],
				['🤖', 'ИИ-помощник', 'Строит план, отвечает в чате, комментирует неделю. У каждого свой дневной лимит.'],
				['🎨', 'Твой вид', 'Цвет и значок у каждой цели, тёмная тема, акцентный цвет и размер текста.']
			],
			startTitle: 'Начни с одной цели',
			agree: 'Входя, ты соглашаешься с',
			terms: 'условиями',
			and: 'и',
			privacy: 'правилами хранения данных',
			footPrivacy: 'Конфиденциальность',
			footTerms: 'Условия',
			other: 'English',
			otherLang: 'en'
		},
		en: {
			title: 'Northstart. Big goals, step by step',
			description: 'Northstart: set a goal and a deadline, get a day-by-day plan, tick off tasks and see your honest progress. Free.',
			signIn: 'Sign in',
			cta: 'Sign in with Google',
			how: 'How it works',
			h1: ['Big goal.', 'Small steps.', 'Honest progress.'],
			lead: 'Northstart helps you reach a goal by its deadline: it splits the goal into daily tasks and shows, truthfully, where you stand.',
			free: 'Free.',
			openNote: 'Sign in with Google, no password to invent.',
			invitedNote: 'The site is invitation-only for now.',
			demoGoal: 'Pass the exam with top marks',
			demoPace: 'On track',
			demoStreak: '🔥 Streak: 6 days in a row',
			demoTasks: ['Work through task 12', 'Review the formulas', 'Solve practice test 3'],
			steps: [
				['1', 'Set a goal and a deadline', 'For example: pass an exam or learn a language by a given date.'],
				['2', 'Get a day-by-day plan', 'The AI splits the goal into stages and tasks up to the deadline. You can add your own too.'],
				['3', 'Tick off what you did', 'Progress is counted honestly: only from your own ticks, no self-deception.']
			],
			insideTitle: "What's inside",
			features: [
				['🗓️', 'A plan for every day', "Today's tasks on the home page, the whole plan in the calendar. Study days of the week are adjustable."],
				['📈', 'Honest percentage', 'See whether you are on time for the deadline. Fell behind? One button recalculates the plan.'],
				['🔥', 'Streaks and cheers', 'Days in a row, a week chart and a small celebration at key marks before the deadline.'],
				['📝', 'Practice tests and mistake notebook', 'Record results and mistakes: the site shows which topics keep coming back.'],
				['🤖', 'AI helper', 'Builds a plan, answers in a chat, comments on your week. Everyone has a daily limit.'],
				['🎨', 'Your look', 'A colour and icon for each goal, dark theme, accent colour and text size.']
			],
			startTitle: 'Start with one goal',
			agree: 'By signing in you agree to the',
			terms: 'terms of use',
			and: 'and the',
			privacy: 'privacy notice',
			footPrivacy: 'Privacy',
			footTerms: 'Terms',
			other: 'Русский',
			otherLang: 'ru'
		}
	} as const;

	const t = $derived(TEXT[data.lang]);
	$effect(() => {
		document.documentElement.lang = data.lang;
	});
</script>

<svelte:head>
	<title>{t.title}</title>
</svelte:head>
<SeoHead path="/welcome" lang={data.lang} title={t.title} description={t.description} />

<div class="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-6 sm:py-10">
	<header class="flex items-center justify-between gap-3">
		<a href="/welcome?lang={data.lang}" class="flex items-center gap-2.5 text-xl font-semibold tracking-tight"><Logo size={34} /> Northstart</a>
		<div class="flex items-center gap-2">
			<a href="/welcome?lang={t.otherLang}" class="inline-flex h-10 items-center rounded-md px-3 text-sm text-muted-foreground hover:text-foreground" hreflang={t.otherLang} data-testid="lang-switch">{t.other}</a>
			<a href="/auth/google" class="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:border-primary hover:text-primary">{t.signIn}</a>
		</div>
	</header>

	<section class="grid items-center gap-10 md:grid-cols-2" aria-labelledby="hero-h">
		<div class="flex flex-col gap-5">
			<h1 id="hero-h" class="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t.h1[0]}<br />{t.h1[1]}<br /><span class="text-primary">{t.h1[2]}</span></h1>
			<p class="max-w-md text-lg text-muted-foreground">{t.lead}</p>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
				<a href="/auth/google" class="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-medium text-primary-foreground transition-transform hover:scale-[1.03]" data-testid="welcome-cta">{t.cta}</a>
				<a href="#how" class="inline-flex h-12 items-center justify-center rounded-md border px-6 font-medium hover:border-primary hover:text-primary">{t.how}</a>
			</div>
			<p class="text-sm text-muted-foreground">{t.free} {data.open ? t.openNote : t.invitedNote}</p>
		</div>

		<!-- A picture of the app, not real data. -->
		<div class="rise flex flex-col gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-lg" aria-hidden="true">
			<div class="flex items-center gap-4">
				<ProgressRing percent={64} size={104} label="Demo" />
				<div class="flex flex-col gap-1">
					<span class="text-sm text-muted-foreground">{t.demoGoal}</span>
					<span class="font-medium">{t.demoPace}</span>
					<span class="text-sm">{t.demoStreak}</span>
				</div>
			</div>
			{#each t.demoTasks as title, i}
				{@const done = i < 2}
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
			<h2 id="how-h" class="text-3xl font-semibold tracking-tight">{t.how}</h2>
		</div>
		<ol class="grid gap-4 md:grid-cols-3">
			{#each t.steps as [n, title, text], i (n)}
				<li class="rise flex gap-4 rounded-xl border bg-card p-5 shadow-sm" style:--i={i}>
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{n}</span>
					<span class="flex flex-col gap-1"><span class="font-medium">{title}</span><span class="text-sm text-muted-foreground">{text}</span></span>
				</li>
			{/each}
		</ol>
	</section>

	<section class="flex flex-col gap-6" aria-labelledby="feat-h">
		<h2 id="feat-h" class="text-center text-3xl font-semibold tracking-tight">{t.insideTitle}</h2>
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each t.features as [icon, title, text], i (title)}
				<li class="rise flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-sm" style:--i={i}>
					<span class="text-2xl" aria-hidden="true">{icon}</span>
					<span class="font-medium">{title}</span>
					<span class="text-sm text-muted-foreground">{text}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="flex flex-col items-center gap-4 pb-4 text-center" aria-label={t.startTitle}>
		<h2 class="text-3xl font-semibold tracking-tight">{t.startTitle}</h2>
		<a href="/auth/google" class="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 font-medium text-primary-foreground transition-transform hover:scale-[1.03]">{t.cta}</a>
		<p class="text-xs text-muted-foreground">{t.agree} <a href="/terms?lang={data.lang}" class="underline underline-offset-2">{t.terms}</a> {t.and} <a href="/privacy?lang={data.lang}" class="underline underline-offset-2">{t.privacy}</a>.</p>
	</section>

	<footer class="flex flex-wrap justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
		<span>© Northstart</span>
		<span class="flex flex-wrap gap-4">
			<a href="/privacy?lang={data.lang}" class="underline underline-offset-2">{t.footPrivacy}</a>
			<a href="/terms?lang={data.lang}" class="underline underline-offset-2">{t.footTerms}</a>
			<a href="mailto:northstart.help@gmail.com" class="underline underline-offset-2">northstart.help@gmail.com</a>
		</span>
	</footer>
</div>
