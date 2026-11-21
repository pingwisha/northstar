<script lang="ts">
	import { onMount } from 'svelte';
	import { daysUntil } from '$lib/progress';
	import { isMilestone, milestoneKey, milestoneMessage } from '$lib/milestones';

	let { goals, today }: { goals: { id: string; title: string; deadline: string }[]; today: string } = $props();

	// Remembered only in this browser: a congratulation seen once is not shown again.
	let seen = $state<Set<string>>(new Set());
	let ready = $state(false);
	onMount(() => {
		try {
			seen = new Set(JSON.parse(localStorage.getItem('milestones') ?? '[]'));
		} catch {
			seen = new Set();
		}
		ready = true;
	});

	const due = $derived(
		ready
			? goals
					.map((g) => ({ ...g, daysLeft: daysUntil(today, g.deadline) }))
					.filter((g) => isMilestone(g.daysLeft) && !seen.has(milestoneKey(g.id, g.deadline, g.daysLeft)))
			: []
	);

	function dismiss(key: string) {
		seen = new Set([...seen, key]);
		try {
			localStorage.setItem('milestones', JSON.stringify([...seen].slice(-200)));
		} catch {
			// Without storage it simply shows again next time.
		}
	}
	const pieces = Array.from({ length: 18 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 6) * 0.12, hue: (i * 47) % 360 }));
</script>

{#each due as g (g.id)}
	{@const key = milestoneKey(g.id, g.deadline, g.daysLeft)}
	<section class="relative overflow-hidden rounded-2xl border bg-primary/10 p-4" data-testid="milestone" aria-label="Поздравление">
		<div class="confetti" aria-hidden="true">
			{#each pieces as p}<i style="left:{p.left}%;animation-delay:{p.delay}s;background:hsl({p.hue} 80% 55%)"></i>{/each}
		</div>
		<p class="relative font-medium">🎉 {milestoneMessage(g.daysLeft, g.title)}</p>
		<button type="button" class="relative mt-2 h-10 rounded-md border bg-background px-3 text-sm" onclick={() => dismiss(key)}>Спасибо</button>
	</section>
{/each}

<style>
	.confetti {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.confetti i {
		position: absolute;
		top: -10px;
		width: 8px;
		height: 12px;
		border-radius: 2px;
		animation: fall 2.4s ease-in 1 both;
	}
	@keyframes fall {
		to {
			transform: translateY(160px) rotate(540deg);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.confetti {
			display: none;
		}
	}
</style>
