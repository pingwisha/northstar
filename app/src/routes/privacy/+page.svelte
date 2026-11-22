<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import LangSwitch from '$lib/components/LangSwitch.svelte';

	let { data } = $props();
	$effect(() => {
		document.documentElement.lang = data.lang;
	});
	const link = 'text-primary underline underline-offset-2';
</script>

<svelte:head><title>{data.lang === 'ru' ? 'Конфиденциальность. Northstart' : 'Privacy. Northstart'}</title></svelte:head>
<SeoHead path="/privacy" lang={data.lang} title={data.lang === 'ru' ? 'Конфиденциальность. Northstart' : 'Privacy. Northstart'} description={data.lang === 'ru' ? 'Какие данные Northstart хранит о тебе, где они лежат и как их скачать или удалить.' : 'What data Northstart keeps about you, where it is stored, and how to download or delete it.'} />

<main class="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10 leading-relaxed">
	<LangSwitch lang={data.lang} />
	{#if data.lang === 'ru'}
		<h1 class="text-3xl font-semibold">Конфиденциальность</h1>
		<p class="text-muted-foreground">Northstart помогает вести большие цели: срок, этапы, задачи на каждый день и честный процент.</p>

		<h2 class="text-xl font-semibold">Что сайт хранит</h2>
		<ul class="list-disc pl-5">
			<li>Почту твоего Google-аккаунта: по ней сайт узнаёт тебя при входе. Пароля у сайта нет.</li>
			<li>Всё, что ты записала сама: цели, сроки, задачи, заметки, ссылки, результаты пробников, ошибки, переписку с ИИ.</li>
			<li>Часовой пояс твоего браузера, чтобы правильно считать «сегодня».</li>
			<li>В браузере хранятся: cookie входа (чтобы ты оставалась в аккаунте), cookie часового пояса и настройки оформления.</li>
		</ul>

		<h2 class="text-xl font-semibold">Где это хранится</h2>
		<p>Данные лежат в базе на платформе Cloudflare, сайт работает там же. Вход выполняется через Google.</p>

		<h2 class="text-xl font-semibold">Чего сайт не делает</h2>
		<ul class="list-disc pl-5">
			<li>Не показывает рекламу и не продаёт данные.</li>
			<li>Не показывает твои данные другим людям. Каждый видит только своё.</li>
			<li>Не хранит файлы, только ссылки на них.</li>
		</ul>

		<h2 class="text-xl font-semibold">ИИ</h2>
		<p>Любой вошедший человек может пользоваться помощником ИИ: просить составить план для цели, писать в чате и просить комментарий к недельному отчёту. Тогда сервису Google Gemini отправляются название цели, описание и срок, а в чате и отчёте ещё часть твоего плана (цели, ближайшие задачи, заметки и ссылки) и твои сообщения. У каждого есть дневной лимит запросов, поэтому иногда ИИ может быть недоступен до завтра. ИИ может ошибаться, важное проверяй.</p>

		<h2 class="text-xl font-semibold">Твои права</h2>
		<p>После входа на странице «Мои данные» можно скачать всё, что хранит сайт, и удалить аккаунт вместе со всеми данными насовсем.</p>

		<h2 class="text-xl font-semibold">Связаться</h2>
		<p>Вопросы, просьбы и сообщения об ошибках: <a href="mailto:northstart.help@gmail.com" class={link}>northstart.help@gmail.com</a></p>

		<p><a href="/welcome?lang=ru" class={link}>О сайте</a> · <a href="/terms?lang=ru" class={link}>Условия</a></p>
	{:else}
		<h1 class="text-3xl font-semibold">Privacy</h1>
		<p class="text-muted-foreground">Northstart helps you reach big goals: a deadline, stages, daily tasks and an honest percentage.</p>

		<h2 class="text-xl font-semibold">What the site stores</h2>
		<ul class="list-disc pl-5">
			<li>The email of your Google account, so the site recognises you when you sign in. The site has no password.</li>
			<li>Everything you write yourself: goals, deadlines, tasks, notes, links, practice test results, mistakes and your chats with the AI.</li>
			<li>Your browser's time zone, to count "today" correctly.</li>
			<li>In your browser: a sign-in cookie (so you stay signed in), a time-zone cookie and your appearance settings.</li>
		</ul>

		<h2 class="text-xl font-semibold">Where it is kept</h2>
		<p>Data lives in a database on the Cloudflare platform, where the site also runs. Sign-in is done through Google.</p>

		<h2 class="text-xl font-semibold">What the site does not do</h2>
		<ul class="list-disc pl-5">
			<li>It shows no ads and does not sell data.</li>
			<li>It does not show your data to other people. Everyone sees only their own.</li>
			<li>It does not store files, only links to them.</li>
		</ul>

		<h2 class="text-xl font-semibold">AI</h2>
		<p>Every signed-in person can use the AI helper: ask it to build a plan for a goal, chat, and ask for a comment on the weekly report. Then Google Gemini receives the goal's title, description and deadline, and, in the chat and the report, part of your plan (goals, nearest tasks, notes and links) and your messages. Everyone has a daily limit of requests, so the AI may sometimes be unavailable until tomorrow. The AI can make mistakes: check anything important.</p>

		<h2 class="text-xl font-semibold">Your rights</h2>
		<p>After signing in, the "My data" page lets you download everything the site stores and delete your account with all its data for good.</p>

		<h2 class="text-xl font-semibold">Contact</h2>
		<p>Questions, requests and bug reports: <a href="mailto:northstart.help@gmail.com" class={link}>northstart.help@gmail.com</a></p>

		<p><a href="/welcome?lang=en" class={link}>About the site</a> · <a href="/terms?lang=en" class={link}>Terms</a></p>
	{/if}
</main>
