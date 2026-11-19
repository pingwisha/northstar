<script lang="ts">
	// A ring that fills to the given percent. The number is always printed in the middle,
	// so the percent never depends on reading the arc.
	import { onMount } from 'svelte';

	let { percent, size = 96, label = 'Прогресс' }: { percent: number; size?: number; label?: string } = $props();

	// The arc starts empty and grows to the percent once the page is shown; the number in the
	// middle is always the real value.
	let mounted = $state(false);
	onMount(() => requestAnimationFrame(() => (mounted = true)));

	const stroke = $derived(Math.max(6, Math.round(size / 10)));
	const radius = $derived((size - stroke) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const offset = $derived(circumference * (1 - (mounted ? Math.min(100, Math.max(0, percent)) : 0) / 100));
</script>

<div class="relative inline-flex items-center justify-center" style:width="{size}px" style:height="{size}px" role="img" aria-label={`${label}: ${percent}%`}>
	<svg width={size} height={size} viewBox="0 0 {size} {size}" class="-rotate-90">
		<circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" stroke-width={stroke} class="text-muted" />
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="currentColor"
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
			class="text-primary transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
		/>
	</svg>
	<span class="absolute font-semibold tabular-nums" style:font-size="{Math.round(size / 4)}px">{percent}%</span>
</div>
