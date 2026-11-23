<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import LangSwitch from '$lib/components/LangSwitch.svelte';

	let { data } = $props();
	$effect(() => {
		document.documentElement.lang = data.lang;
	});
	const link = 'text-primary underline underline-offset-2';
</script>

<svelte:head><title>{data.lang === 'ru' ? 'Условия использования. Northstart' : 'Terms of use. Northstart'}</title></svelte:head>
<SeoHead path="/terms" lang={data.lang} title={data.lang === 'ru' ? 'Условия использования. Northstart' : 'Terms of use. Northstart'} description={data.lang === 'ru' ? 'Условия использования Northstart: как пользоваться сайтом, без гарантий, твои данные.' : 'Northstart terms of use: how you may use the site, no guarantees, your data.'} />

<main class="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10 leading-relaxed">
	<LangSwitch lang={data.lang} />
	{#if data.lang === 'ru'}
		<h1 class="text-3xl font-semibold">Условия использования</h1>
		<p class="text-muted-foreground">Northstart помогает вести большие цели: срок, этапы, задачи на каждый день и честный процент. Пользуясь сайтом, ты соглашаешься с этими условиями.</p>

		<h2 class="text-xl font-semibold">Как можно пользоваться</h2>
		<ul class="list-disc pl-5">
			<li>Сайт для личных целей и учёбы. Бесплатный.</li>
			<li>Сайт для людей от 14 лет; младше 14 только с согласия родителя, подробнее в Конфиденциальности.</li>
				<li>Вход только через твой Google-аккаунт. За свой аккаунт отвечаешь ты.</li>
			<li>Нельзя пытаться получить чужие данные, ломать сайт или перегружать его запросами. Такие аккаунты могут быть закрыты.</li>
			<li>Нельзя хранить на сайте то, что запрещено законом, и чужие личные данные.</li>
		</ul>

		<h2 class="text-xl font-semibold">Без гарантий</h2>
		<p>Сайт работает «как есть». Я стараюсь, чтобы он работал без сбоев, но не обещаю, что он будет доступен всегда, и не отвечаю за результат твоих экзаменов, целей и решений. Прогресс на сайте считается только по твоим отметкам и не предсказывает итог.</p>
		<p>Ссылки и материалы на сайте ведут на чужие сайты. Их содержание проверяй сама, за него отвечают их авторы.</p>

		<h2 class="text-xl font-semibold">Твои данные</h2>
		<p>Всё, что ты записала, принадлежит тебе. Ты можешь скачать это и удалить аккаунт со всеми данными на странице «Мои данные». Подробнее в <a href="/privacy?lang=ru" class={link}>Конфиденциальности</a>.</p>

		<h2 class="text-xl font-semibold">Изменения</h2>
		<p>Условия могут меняться вместе с сайтом. Актуальная версия всегда на этой странице.</p>

		<h2 class="text-xl font-semibold">Связаться</h2>
		<p>Вопросы, просьбы и сообщения об ошибках: <a href="mailto:northstart.help@gmail.com" class={link}>northstart.help@gmail.com</a></p>

		<p><a href="/welcome?lang=ru" class={link}>О сайте</a> · <a href="/privacy?lang=ru" class={link}>Конфиденциальность</a></p>
	{:else}
		<h1 class="text-3xl font-semibold">Terms of use</h1>
		<p class="text-muted-foreground">Northstart helps you reach big goals: a deadline, stages, daily tasks and an honest percentage. By using the site you agree to these terms.</p>

		<h2 class="text-xl font-semibold">How you may use it</h2>
		<ul class="list-disc pl-5">
			<li>The site is for personal goals and study. It is free.</li>
			<li>The site is for people aged 14 and over; under 14 only with a parent's consent, see Privacy.</li>
				<li>You sign in only with your own Google account, and you are responsible for it.</li>
			<li>Do not try to get other people's data, break the site or overload it with requests. Such accounts may be closed.</li>
			<li>Do not store anything on the site that is forbidden by law, or other people's personal data.</li>
		</ul>

		<h2 class="text-xl font-semibold">No guarantees</h2>
		<p>The site is provided "as is". I try to keep it running without failures, but I do not promise it will always be available, and I am not responsible for the result of your exams, goals or decisions. Progress on the site is counted only from your own ticks and does not predict the outcome.</p>
		<p>Links and materials on the site lead to other people's sites. Check their content yourself: their authors are responsible for it.</p>

		<h2 class="text-xl font-semibold">Your data</h2>
		<p>Everything you write belongs to you. You can download it and delete your account with all its data on the "My data" page. More in the <a href="/privacy?lang=en" class={link}>Privacy</a> notice.</p>

		<h2 class="text-xl font-semibold">Changes</h2>
		<p>These terms may change together with the site. The current version is always on this page.</p>

		<h2 class="text-xl font-semibold">Contact</h2>
		<p>Questions, requests and bug reports: <a href="mailto:northstart.help@gmail.com" class={link}>northstart.help@gmail.com</a></p>

		<p><a href="/welcome?lang=en" class={link}>About the site</a> · <a href="/privacy?lang=en" class={link}>Privacy</a></p>
	{/if}
</main>
