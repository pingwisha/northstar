<script lang="ts">
	// Small drawings for empty places. They use the accent colour, so they follow the theme.
	let { kind, size = 140 }: { kind: 'start' | 'tasks' | 'goals' | 'chart'; size?: number } = $props();
</script>

<svg width={size} height={size * 0.75} viewBox="0 0 160 120" fill="none" aria-hidden="true" class="float text-primary">
	<ellipse cx="80" cy="108" rx="52" ry="7" fill="currentColor" opacity="0.1" />
	{#if kind === 'start'}
		<path d="M14 104l42-58 22 28 18-22 50 52z" fill="currentColor" opacity="0.18" />
		<path d="M56 46l22 28 18-22 50 52" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity="0.5" />
		<path d="M96 24v32" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
		<path d="M96 24l22 7-22 8z" fill="currentColor" />
		<path d="M38 22l2.2 5 5.4.5-4.1 3.6 1.2 5.3L38 33.6l-4.7 2.8 1.2-5.3-4.1-3.6 5.4-.5z" fill="currentColor" opacity="0.6" />
	{:else if kind === 'tasks'}
		<rect x="40" y="14" width="80" height="92" rx="10" fill="currentColor" opacity="0.12" />
		<rect x="40" y="14" width="80" height="92" rx="10" stroke="currentColor" stroke-width="3" opacity="0.5" />
		{#each [0, 1, 2] as i}
			<rect x="52" y={30 + i * 26} width="14" height="14" rx="4" stroke="currentColor" stroke-width="2.5" opacity={i === 0 ? 1 : 0.5} />
			<path d="M72 {37 + i * 26}h34" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.35" />
		{/each}
		<path d="M55 37l3.5 3.5 6-7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
	{:else if kind === 'goals'}
		<circle cx="80" cy="58" r="42" fill="currentColor" opacity="0.1" />
		<circle cx="80" cy="58" r="42" stroke="currentColor" stroke-width="3" opacity="0.4" />
		<circle cx="80" cy="58" r="26" stroke="currentColor" stroke-width="3" opacity="0.6" />
		<circle cx="80" cy="58" r="10" fill="currentColor" />
		<path d="M80 58l36-36M104 22l12-2-2 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
	{:else}
		<rect x="28" y="64" width="20" height="40" rx="5" fill="currentColor" opacity="0.3" />
		<rect x="58" y="44" width="20" height="60" rx="5" fill="currentColor" opacity="0.5" />
		<rect x="88" y="28" width="20" height="76" rx="5" fill="currentColor" opacity="0.75" />
		<rect x="118" y="12" width="20" height="92" rx="5" fill="currentColor" />
	{/if}
</svg>
