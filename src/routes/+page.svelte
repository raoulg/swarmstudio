<script lang="ts">
	// src/routes/+page.svelte
	import { onMount } from 'svelte';
	import { sessionState, participantId } from '$lib/stores/sessionStore';
	import { joinSession } from '$lib/api/client';
	import { loadParticipantSession, clearParticipantSession } from '$lib/api/localStorage';

	let sessionCode = '';
	let errorMessage = '';
	let isLoading = false;
	let movementState = 'waiting'; // 'waiting', 'moving', 'revealing'
	let targetPosition = null;

	// Reactive variables based on the session store
	$: session = $sessionState;
	$: participants = session.participants || [];
	$: config = session.config;
	$: gridSize = config?.grid_size || 25;
	$: me = participants.find((p) => p.id === $participantId);

	// Auto-reconnect on mount if saved session exists
	onMount(async () => {
		const savedSession = loadParticipantSession();
		if (savedSession) {
			console.log('Found saved session, attempting to reconnect:', savedSession);
			isLoading = true;
			errorMessage = 'Reconnecting to previous session...';

			try {
				const result = await joinSession(savedSession.sessionCode, savedSession.participantId);
				console.log('Successfully reconnected to saved session:', result);
				errorMessage = ''; // Clear reconnecting message
			} catch (error) {
				console.error('Failed to reconnect to saved session:', error);
				// Clear invalid saved session
				clearParticipantSession();
				participantId.set(null);
				sessionState.set({ participants: [] });
				errorMessage = 'Previous session no longer available. Please join a new session.';
			} finally {
				isLoading = false;
			}
		}
	});

	// Function to handle joining a session
	async function handleJoin() {
		if (!sessionCode) {
			errorMessage = 'Please enter a session code.';
			return;
		}
		isLoading = true;
		errorMessage = '';
		try {
			await joinSession(sessionCode.toUpperCase());
		} catch (error) {
			errorMessage = 'Failed to join session. Please check the code and try again.';
			console.error(error);
		} finally {
			isLoading = false;
		}
	}

	// Function to manually leave session (clear localStorage)
	function handleLeave() {
		clearParticipantSession();
		participantId.set(null);
		sessionState.set({ participants: [] });
		errorMessage = '';
		sessionCode = '';
	}
	$: {
		// Map session phase to local movement state
		if ($sessionState.currentPhase === 'walking') {
			movementState = 'moving'; // Template expects 'moving'
		} else if ($sessionState.currentPhase === 'revealing') {
			movementState = 'revealing';
		} else {
			movementState = 'waiting';
		}

		// Set target position when moving
		if (me && movementState === 'moving' && me.position) {
			targetPosition = me.position;
		}
	}

</script>

<svelte:head>
	<title>SwarmCraft</title>
	<meta name="description" content="Join a SwarmCraft session" />
</svelte:head>

<main class="w-full max-w-4xl mx-auto p-4 flex flex-col items-center gap-8">
	{#if !$participantId}
		<!-- Join Session Interface -->
		<div class="w-full max-w-md text-center">
			<div class="mb-8">
				<img 
					src="/src/lib/images/icon-192x192.png" 
					alt="SwarmCraft Logo" 
					class="w-48 h-48 mx-auto mb-4 rounded-lg shadow-lg"
				/>
			</div>
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

	{:else if movementState === 'moving' && targetPosition}
		<!-- Movement Instruction Screen - Simplified -->
		<div class="w-full h-screen flex flex-col bg-gradient-to-b from-purple-900 to-blue-900 text-white overflow-hidden">
			<!-- Name at top -->
			<div class="w-full text-center pt-6 pb-4">
				<div class="inline-block text-xl font-bold bg-black/30 px-6 py-3 rounded-lg shadow-lg">
					{me?.name}
				</div>
			</div>

			<div class="flex-1 flex items-center justify-center text-center space-y-12 px-4">
				<!-- Target Coordinates -->
				<div class="space-y-6">
					<h1 class="text-3xl font-semibold text-gray-300">Move to Position</h1>
					<div class="text-8xl font-bold font-mono tracking-wider">
						[{targetPosition[0]}, {targetPosition[1]}]
					</div>
				</div>
			</div>
		</div>

	{:else if movementState === 'revealing'}
		<!-- Fitness Revelation Screen - Simplified -->
		<div
			class="w-full h-screen flex flex-col text-white"
			style="background: linear-gradient(135deg, {me?.color || '#888'}, {me?.color || '#888'}88);"
		>
			<!-- Name at top -->
			<div class="w-full text-center pt-6 pb-4">
				<div class="inline-block text-xl font-bold bg-black/30 px-6 py-3 rounded-lg shadow-lg">
					{me?.name}
				</div>
			</div>

			<div class="flex-1 flex items-center justify-center text-center space-y-12 px-4">
				<div class="space-y-12">
					<!-- Position Display -->
					<div class="space-y-4">
						<h2 class="text-2xl text-gray-200">Position</h2>
						<div class="text-6xl font-mono font-bold">
							[{me?.position ? me.position.join(', ') : 'N/A'}]
						</div>
					</div>

					<!-- Fitness Score -->
					<div class="space-y-4">
						<h2 class="text-2xl text-gray-200">Fitness</h2>
						<div class="text-8xl font-bold animate-pulse">
							{me?.fitness ? me.fitness.toFixed(2) : '???'}
						</div>
					</div>
				</div>
			</div>
		</div>

	{:else if config}
		<!-- Default State: Show simple status, will be replaced by move/reveal screens -->
		<div class="w-full flex flex-col items-center gap-6">
			<header class="text-center">
				<h1 class="text-3xl font-bold">Session: <span class="text-accent-color">{session.code}</span></h1>
			</header>
			{#if me}
				<div class="card bg-secondary-dark p-6 rounded-lg w-full max-w-lg" style="border: 2px solid {me.color || 'var(--color-bg-2)'};">
					<h2 class="font-bold text-2xl mb-4 text-center">{me.name}</h2>
					<div class="space-y-4 text-lg">
						<div class="flex justify-between items-center">
							<span>Position:</span>
							<span class="font-mono text-xl">[{me.position ? me.position.join(', ') : 'Waiting...'}]</span>
						</div>
						<div class="flex justify-between items-center">
							<span>Fitness Score:</span>
							<span class="font-mono text-xl font-bold">???</span>
						</div>
						<div class="flex justify-between items-center text-sm opacity-50">
							<span>ID:</span>
							<span class="font-mono">{me.id}</span>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-gray-400">Loading participant data...</div>
			{/if}

			<div class="text-center text-gray-400">
				<p class="text-lg">Waiting for next instruction...</p>
			</div>

			<button
				on:click={handleLeave}
				class="btn bg-red-500 hover:bg-red-600 text-white rounded-md px-4 py-2 text-sm"
			>
				Leave Session
			</button>
		</div>
	{/if}

	<!-- No test buttons - controlled by admin only -->
</main>
