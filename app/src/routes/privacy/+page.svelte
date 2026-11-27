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
<SeoHead path="/privacy" lang={data.lang} title={data.lang === 'ru' ? 'Конфиденциальность. Northstart' : 'Privacy. Northstart'} description={data.lang === 'ru' ? 'Какие данные Northstart хранит о пользователе, где они лежат и как их скачать или удалить.' : 'What data Northstart keeps about you, where it is stored, and how to download or delete it.'} />

<main class="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10 leading-relaxed">
	<LangSwitch lang={data.lang} />
	{#if data.lang === 'ru'}
		<h1 class="text-3xl font-semibold">Конфиденциальность</h1>
		<p class="text-muted-foreground">Northstart помогает вести большие цели: срок, этапы, задачи на каждый день и честный процент прогресса.</p>

		<h2 class="text-xl font-semibold">Что сайт хранит</h2>
		<ul class="list-disc pl-5">
			<li>Почту Google-аккаунта: по ней сайт узнаёт человека при входе. Пароля у сайта нет.</li>
			<li>Всё, что пользователь записал сам: цели, сроки, задачи, заметки, ссылки, результаты пробников и тестов, ошибки, переписку с ИИ.</li>
			<li>Часовой пояс браузера, чтобы правильно считать «сегодня».</li>
			<li>Если включены напоминания: служебный адрес уведомлений браузера, выбранный час и часовой пояс. Выключить и стереть это можно в настройках.</li>
			<li>В браузере хранятся: cookie входа (чтобы человек оставался в аккаунте), cookie часового пояса и настройки оформления.</li>
		</ul>

		<h2 class="text-xl font-semibold">Где это хранится</h2>
		<p>Данные лежат в базе на платформе Cloudflare, сайт работает там же. Вход выполняется через Google. Cloudflare, как любой хостинг, видит технические данные запросов (адрес, время). Адреса для уведомлений обслуживают сервисы браузера пользователя (Google, Apple, Mozilla или Microsoft).</p>

		<h2 class="text-xl font-semibold">Чего сайт не делает</h2>
		<ul class="list-disc pl-5">
			<li>Не показывает рекламу и не продаёт данные.</li>
			<li>Не показывает данные одного человека другим без его решения. Каждый видит только своё, а друзьям можно разрешить показывать отдельные цели и задачи (см. «Друзья» ниже).</li>
			<li>Не хранит файлы, только ссылки на них.</li>
			<li>Не смотрит цели и переписку: с ними работает только их владелец. Создатель сайта видит лишь список приглашённых адресов почты и может закрыть доступ человеку.</li>
		</ul>

		<h2 class="text-xl font-semibold">Друзья</h2>
		<p>Дружить на сайте можно по ссылке-приглашению: она действует 7 дней и один раз, в базе хранится только её отпечаток. Друзья видят друг друга только под прозвищами, которые сами себе выбрали; почта, имя в Google и номер аккаунта друзьям не показываются. Ни одна цель и ни одна задача не видна другу, пока владелец сам не разрешит это для каждой цели и каждой задачи отдельно. Заметки, материалы, тетрадь ошибок, пробники и чаты друзьям не показываются никогда. Закончить дружбу можно в любой момент, доступ пропадает сразу.</p>

		<h2 class="text-xl font-semibold">ИИ</h2>
		<p>Любой вошедший человек может пользоваться помощником ИИ: просить составить план для цели, писать в чате и просить комментарий к недельному отчёту. Тогда сервису Google Gemini отправляются название цели, описание и срок, а в чате и отчёте ещё часть плана (цели, ближайшие задачи, заметки и ссылки) и сообщения пользователя. У каждого есть дневной лимит запросов, поэтому иногда ИИ может быть недоступен до завтра. Вопросы для самопроверки тоже строятся ИИ: ему уходит тема, которую назвал пользователь. Сервис Google Gemini обрабатывает эти тексты по своим правилам, поэтому не стоит писать в ИИ пароли, номера документов и чужие личные данные. Удалить уже отправленное у Google сайт не может. ИИ может ошибаться, важное стоит проверять.</p>

		<h2 class="text-xl font-semibold">Сколько хранится</h2>
		<p>Пока пользователь не удалил аккаунт. После удаления данные стираются из базы сразу, копии в резервных архивах могут существовать до нескольких недель.</p>

		<h2 class="text-xl font-semibold">Возраст</h2>
		<p>Сайт предназначен для людей от 14 лет. Если пользователю меньше 14, пользоваться сайтом можно только с согласия родителя или законного представителя, который отвечает за аккаунт. Возраст сайт не проверяет: это обязанность пользователя и его родителей. Если станет известно, что аккаунт ведёт ребёнок младше 14 без такого согласия, аккаунт может быть закрыт, а данные удалены.</p>

		<h2 class="text-xl font-semibold">Основание обработки</h2>
		<p>Данные обрабатываются, чтобы сайт работал: входил в аккаунт, хранил планы и отправлял напоминания, если они включены. Основание: согласие пользователя, которое он даёт, входя через Google и создавая записи. Согласие можно отозвать в любой момент, удалив аккаунт. Данные не используются ни для чего другого.</p>

		<h2 class="text-xl font-semibold">Кто ещё обрабатывает данные</h2>
		<ul class="list-disc pl-5">
			<li>Cloudflare: хостинг сайта и база данных.</li>
			<li>Google: вход в аккаунт и ИИ-помощник Gemini (получает только то, что описано в разделе «ИИ»).</li>
			<li>Сервис уведомлений браузера (Google, Apple, Mozilla или Microsoft): получает служебный адрес и сигнал, если включены напоминания.</li>
		</ul>
		<p>Других получателей у данных нет. Каждый из этих сервисов работает по собственным правилам, которые можно прочитать на его сайте.</p>

		<h2 class="text-xl font-semibold">Права пользователя</h2>
		<p>После входа на странице «Мои данные» можно скачать всё, что хранит сайт, и удалить аккаунт вместе со всеми данными насовсем. Исправить записи можно прямо на сайте. Если войти нельзя или нужна помощь, напишите на адрес ниже: запрос на выгрузку, исправление или удаление будет выполнен в течение 30 дней. Жаловаться на обработку данных можно и в надзорный орган своей страны.</p>

		<h2 class="text-xl font-semibold">Связаться</h2>
		<p>Вопросы, просьбы и сообщения об ошибках: <a href="mailto:northstart.help@gmail.com" class={link}>northstart.help@gmail.com</a></p>

		<p><a href="/welcome?lang=ru" class={link}>О сайте</a> · <a href="/terms?lang=ru" class={link}>Условия</a></p>
	{:else}
		<h1 class="text-3xl font-semibold">Privacy</h1>
		<p class="text-muted-foreground">Northstart helps you reach big goals: a deadline, stages, daily tasks and an honest progress percentage.</p>

		<h2 class="text-xl font-semibold">What the site stores</h2>
		<ul class="list-disc pl-5">
			<li>The email of your Google account, so the site recognises you when you sign in. The site has no password.</li>
			<li>Everything you write yourself: goals, deadlines, tasks, notes, links, practice test and quiz results, mistakes and your chats with the AI.</li>
			<li>Your browser's time zone, to count "today" correctly.</li>
			<li>If you turn reminders on: the notification address your browser gives, the hour you chose and your time zone. You can turn this off, and erase it, in the settings.</li>
			<li>In your browser: a sign-in cookie (so you stay signed in), a time-zone cookie and your appearance settings.</li>
		</ul>

		<h2 class="text-xl font-semibold">Where it is kept</h2>
		<p>Data lives in a database on the Cloudflare platform, where the site also runs. Sign-in is done through Google. Cloudflare, like any host, sees technical request data (address, time). Notification addresses are served by your browser's push service (Google, Apple, Mozilla or Microsoft).</p>

		<h2 class="text-xl font-semibold">What the site does not do</h2>
		<ul class="list-disc pl-5">
			<li>It shows no ads and does not sell data.</li>
			<li>It does not show your data to other people. Everyone sees only their own.</li>
			<li>It does not store files, only links to them.</li>
			<li>It does not read your goals or chats: only you work with them. The site's creator sees only the list of invited email addresses and can close a person's access.</li>
		</ul>

		<h2 class="text-xl font-semibold">AI</h2>
		<p>Every signed-in person can use the AI helper: ask it to build a plan for a goal, chat, and ask for a comment on the weekly report. Then Google Gemini receives the goal's title, description and deadline, and, in the chat and the report, part of your plan (goals, nearest tasks, notes and links) and your messages. Everyone has a daily limit of requests, so the AI may sometimes be unavailable until tomorrow. Self-check questions are also built by the AI: it receives the topic you name. Google Gemini processes these texts under its own rules, so do not type passwords, document numbers or other people's personal data into the AI. The site cannot delete what was already sent to Google. The AI can make mistakes: check anything important.</p>

		<h2 class="text-xl font-semibold">How long it is kept</h2>
		<p>Until you delete your account. After deletion the data is erased from the database at once; copies in backups may exist for up to a few weeks.</p>

		<h2 class="text-xl font-semibold">Age</h2>
		<p>The site is meant for people aged 14 and over. A user under 14 may use it only with the consent of a parent or legal guardian, who is responsible for the account. The site does not verify age: that is up to the user and their parents. If it becomes known that a child under 14 runs an account without such consent, the account may be closed and its data deleted.</p>

		<h2 class="text-xl font-semibold">Why data is processed</h2>
		<p>Data is processed to make the site work: signing in, keeping plans and sending reminders if they are on. The basis is the user's consent, given by signing in with Google and creating records. Consent can be withdrawn at any time by deleting the account. The data is not used for anything else.</p>

		<h2 class="text-xl font-semibold">Who else processes data</h2>
		<ul class="list-disc pl-5">
			<li>Cloudflare: site hosting and the database.</li>
			<li>Google: sign-in and the Gemini AI helper (it receives only what the "AI" section describes).</li>
			<li>The browser's push service (Google, Apple, Mozilla or Microsoft): receives the notification address and a signal if reminders are on.</li>
		</ul>
		<p>Nobody else receives the data. Each of these services works under its own rules, which are on its website.</p>

		<h2 class="text-xl font-semibold">Your rights</h2>
		<p>After signing in, the "My data" page lets you download everything the site stores and delete your account with all its data for good. Records can be corrected right on the site. If you cannot sign in or need help, write to the address below: a request to export, correct or delete data will be handled within 30 days. You may also complain to the data protection authority of your country.</p>

		<h2 class="text-xl font-semibold">Contact</h2>
		<p>Questions, requests and bug reports: <a href="mailto:northstart.help@gmail.com" class={link}>northstart.help@gmail.com</a></p>

		<p><a href="/welcome?lang=en" class={link}>About the site</a> · <a href="/terms?lang=en" class={link}>Terms</a></p>
	{/if}
</main>
