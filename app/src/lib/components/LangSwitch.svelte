<script lang="ts">
	import type { Lang } from '$lib/lang';

	let { lang }: { lang: Lang } = $props();
	const other = $derived(lang === 'ru' ? 'en' : 'ru');
</script>

<a href="?lang={other}" hreflang={other} class="self-end text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground" data-testid="lang-switch">{lang === 'ru' ? 'English' : 'Русский'}</a>
