<script lang="ts">
	import { sessionState, participantId } from '$lib/stores/sessionStore';
	import { joinSession } from '$lib/api/client';

	let sessionCode = '';
	let errorMessage = '';
	let isLoading = false;

	// Reactive variables based on the session store
	$: session = $sessionState;
	$: participants = session.participants || [];
	$: config = session.config;
	$: gridSize = config?.grid_size || 25;

	// Function to handle joining a session
	async function handleJoin() {
		if (!sessionCode) {
			errorMessage = 'Please enter a session code.';
			return;
		}
		isLoading = true;
		errorMessage = '';
		try {
			// The client.ts file handles the actual API call and WebSocket connection
			await joinSession(sessionCode.toUpperCase());
		} catch (error) {
			errorMessage = 'Failed to join session. Please check the code and try again.';
			console.error(error);
		} finally {
			isLoading = false;
		}
	}

	// Helper function to get the participant's own data
	$: me = participants.find((p) => p.id === $participantId);
</script>

<svelte:head>
	<title>SwarmCraft</title>
	<meta name="description" content="Join a SwarmCraft session" />
</svelte:head>

<main class="w-full max-w-4xl mx-auto p-4 flex flex-col items-center gap-8">
	{#if !$participantId}
		<div class="w-full max-w-md text-center">
			<h1 class="text-4xl font-bold text-accent-color mb-6">Join a Swarm</h1>
			<div class="flex items-stretch gap-2">
				<input
					type="text"
					bind:value={sessionCode}
					on:keydown={(e) => e.key === 'Enter' && handleJoin()}
					placeholder="ENTER SESSION CODE"
					class="flex-grow input bg-primary-dark border-secondary-dark rounded-md p-3 text-center tracking-widest font-bold"
					disabled={isLoading}
				/>
				<button on:click={handleJoin} class="btn bg-accent-color text-white rounded-md px-6" disabled={isLoading}>
					{#if isLoading}
						<span>Joining...</span>
					{:else}
						<span>Join</span>
					{/if}
				</button>
			</div>
			{#if errorMessage}
				<p class="text-red-400 mt-3">{errorMessage}</p>
			{/if}
		</div>
	{:else if config}
		<div class="w-full flex flex-col items-center gap-6">
			<header class="text-center">
				<h1 class="text-3xl font-bold">You are in Session: <span class="text-accent-color">{session.code}</span></h1>
				<p>Your name: <span class="font-bold">{me?.name || '...'}</span></p>
			</header>

			<div
				class="grid border-2 border-secondary-dark bg-primary-dark"
				style="grid-template-columns: repeat({gridSize}, 1fr); width: 100%; max-width: 600px; aspect-ratio: 1 / 1;"
			>
				{#each Array(gridSize * gridSize) as _, i}
					{@const row = Math.floor(i / gridSize)}
					{@const col = i % gridSize}
					{@const p = participants.find(part => part.position && part.position[0] === row && part.position[1] === col)}
					
					<div class="relative w-full h-full border border-secondary-dark/50">
						{#if p}
							<div
								class="absolute inset-0 m-auto w-3/4 h-3/4 rounded-full transition-colors duration-500"
								style="background-color: {p.color || '#888'};"
								title={p.name}
							></div>
						{/if}
					</div>
				{/each}
			</div>

			{#if me}
				<div class="card bg-secondary-dark p-4 rounded-lg w-full max-w-md">
					<h3 class="font-bold text-lg">{me.name} (You)</h3>
					<p>Position: [{me.position ? me.position.join(', ') : 'N/A'}]</p>
					<p>Fitness Score: {me.fitness ? me.fitness.toFixed(2) : 'N/A'}</p>
				</div>
			{/if}
		</div>
	{/if}
</main>

<style>
	/* You can add component-specific (non-Tailwind) styles here if needed */
</style>
