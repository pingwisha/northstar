<script lang="ts">
	// The Northstart mark: a four-pointed north star on a rounded tile in the accent colour.
	let { size = 28 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" class="shrink-0 drop-shadow-sm">
	<rect width="100" height="100" rx="24" fill="var(--primary)" />
	<rect width="100" height="100" rx="24" fill="url(#logo-shine)" />
	<defs>
		<linearGradient id="logo-shine" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#fff" stop-opacity="0.28" />
			<stop offset="1" stop-color="#000" stop-opacity="0.22" />
		</linearGradient>
	</defs>
	<path d="M50 14Q54.5 45.5 86 50Q54.5 54.5 50 86Q45.5 54.5 14 50Q45.5 45.5 50 14Z" fill="var(--primary-foreground)" />
	<circle cx="73" cy="27" r="4.5" fill="var(--primary-foreground)" opacity="0.75" />
	<circle cx="27" cy="74" r="3" fill="var(--primary-foreground)" opacity="0.55" />
</svg>
