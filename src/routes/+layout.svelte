<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import '../app.css'; // This imports your global styles and TailwindCSS

	// Svelte 5 syntax for rendering child components (like +page.svelte)
	let { children } = $props();
</script>

<div class="app bg-background-dark text-text-color">
	<Header />

	<main>
		{@render children()}
	</main>

	<footer class="text-center p-4 text-sm text-text-color/50">
		<p>SwarmCraft - An Interactive Swarm Intelligence Experience</p>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		width: 100%;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center; /* Center content horizontally */
		justify-content: center; /* Center content vertically */
		padding: 1rem;
		width: 100%;
	}

	footer {
		width: 100%;
		background-color: var(--primary-dark);
		margin-top: auto; /* Pushes the footer to the bottom */
	}
</style>
