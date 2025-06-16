<script lang="ts">
	import logo from '$lib/images/svelte-logo.svg'; // Assuming you have a logo, or we can just use text
</script>

<header class="bg-primary-dark p-4 shadow-lg flex items-center justify-center">
	<a href="/" class="flex items-center gap-3">
		<img src={logo} alt="SwarmCraft Logo" class="h-8 w-8" />
		<span class="text-2xl font-bold text-text-color tracking-wider">
			Swarm<span class="text-accent-color">Craft</span>
		</span>
	</a>
</header>
