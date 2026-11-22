<script lang="ts">
	import { SITE_URL } from '$lib/site';

	// Tags for search engines and link previews of a public page: one address per language,
	// so the Russian and the English version are not taken for copies of each other.
	let { path, lang, title, description }: { path: string; lang: 'ru' | 'en'; title: string; description: string } = $props();
	const url = (l: string) => `${SITE_URL}${path}?lang=${l}`;
</script>

<svelte:head>
	<meta name="description" content={description} />
	<link rel="canonical" href={url(lang)} />
	<link rel="alternate" hreflang="ru" href={url('ru')} />
	<link rel="alternate" hreflang="en" href={url('en')} />
	<link rel="alternate" hreflang="x-default" href={url('en')} />
	<meta property="og:site_name" content="Northstart" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url(lang)} />
	<meta property="og:image" content="{SITE_URL}/icon-512.png" />
	<meta property="og:locale" content={lang === 'ru' ? 'ru_RU' : 'en_US'} />
	<meta name="twitter:card" content="summary" />
</svelte:head>
