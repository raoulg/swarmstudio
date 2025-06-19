<script lang="ts">
	// src/routes/overview/[sessionId]/+page.svelte
	import { sessionState } from '$lib/stores/sessionStore';
	import { connectAdminWebSocket } from '$lib/api/client';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	// Get session ID from URL params if provided
	$: sessionId = $page.params.sessionId;

	// Get session state
	$: session = $sessionState;
	$: participants = session.participants || [];
	$: config = session.config;
	$: gridSize = config?.grid_size || 25;

	// Sort participants by fitness (best first)
	$: sortedParticipants = participants
		.filter(p => p.fitness !== null && p.fitness !== undefined)
		.sort((a, b) => (a.fitness || 999) - (b.fitness || 999));

	onMount(() => {
		// If sessionId is provided in URL, connect to that session
		if (sessionId) {
			console.log('Overview connecting to session:', sessionId);
			connectAdminWebSocket(sessionId);
		}

		// Auto-refresh every few seconds to stay current
		const interval = setInterval(() => {
			// Could trigger data refresh here if needed
		}, 2000);

		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>SwarmCraft Overview</title>
</svelte:head>

<main class="w-full h-screen bg-gray-900 text-white p-6 grid grid-cols-3 gap-8">
	<!-- Main Grid Display (2/3 width) -->
	<div class="col-span-2 flex flex-col">
		<h1 class="text-4xl font-bold text-center mb-6 text-blue-400">
			{#if session.code}
				Session: {session.code}
			{:else}
				SwarmCraft Overview
			{/if}
		</h1>

		{#if config}
			<div class="flex-1 flex items-center justify-center">
				<div
					class="grid border-4 border-blue-500 bg-gray-800 rounded-lg overflow-hidden shadow-2xl"
					style="grid-template-columns: repeat({gridSize}, 1fr); width: 90%; max-width: 700px; aspect-ratio: 1 / 1;"
				>
					{#each Array(gridSize * gridSize) as _, i}
						{@const row = Math.floor(i / gridSize)}
						{@const col = i % gridSize}
						{@const participant = participants.find(p => p.position && p.position[0] === row && p.position[1] === col)}
						
						<div class="relative w-full h-full border border-gray-600/30 bg-gray-800">
							{#if participant}
								<div
									class="absolute inset-0 m-auto w-4/5 h-4/5 rounded-full border-2 border-white/80 transition-all duration-500 shadow-lg"
									style="background-color: {participant.color || '#888'};"
									title="{participant.name} - Fitness: {participant.fitness?.toFixed(2) || 'N/A'}"
								></div>
								<!-- Add participant name overlay for close-up viewing -->
								<div class="absolute bottom-0 left-0 right-0 text-xs text-center text-white/60 truncate px-1">
									{participant.name}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Iteration Info -->
			<div class="text-center mt-4">
				<p class="text-xl text-gray-300">
					Iteration: <span class="font-bold text-blue-400">{session.iteration || 0}</span>
					| Participants: <span class="font-bold text-green-400">{participants.length}</span>
				</p>
			</div>
		{:else}
			<div class="flex-1 flex items-center justify-center">
				<div class="text-center text-gray-400">
					<h2 class="text-2xl mb-4">No Active Session</h2>
					<p>Waiting for session to be created...</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Leaderboard (1/3 width) -->
	<div class="col-span-1 flex flex-col">
		<h2 class="text-2xl font-bold mb-4 text-green-400">Leaderboard</h2>
		<!-- QR Code Section -->
		{#if session.code}
			<div class="mb-6 text-center">
				<img 
					src="/qr.png" 
					alt="Join Session QR Code" 
					class="mx-auto mb-2 rounded-lg shadow-lg border-2 border-gray-600"
					style="width: 180px; height: 180px;"
				/>
				<p class="text-sm text-gray-400">Scan to join session</p>
			</div>
		{/if}
		
		{#if sortedParticipants.length > 0}
			<div class="flex-1 overflow-y-auto space-y-2">
				{#each sortedParticipants as participant, index (participant.id)}
					<div class="bg-gray-800 rounded-lg p-3 border-l-4" style="border-left-color: {participant.color || '#888'};">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<!-- Rank (only show during revealing phase) -->
								{#if session.currentPhase === 'revealing'}
									<div class="text-2xl font-bold text-yellow-400 w-8">
										{#if index === 0}🥇
										{:else if index === 1}🥈
										{:else if index === 2}🥉
										{:else}{index + 1}
										{/if}
									</div>
								{:else}
									<div class="text-2xl font-bold text-gray-500 w-8">
										•
									</div>
								{/if}
								
								<!-- Participant Info -->
								<div>
									<div class="font-semibold text-lg">{participant.name}</div>
									<div class="text-sm text-gray-400">
										Position: [{participant.position ? participant.position.join(', ') : 'N/A'}]
									</div>
								</div>
							</div>
							
							<!-- Fitness Score - only show during revealing phase -->
							<div class="text-right">
								{#if session.currentPhase === 'revealing'}
									<div class="text-xl font-bold text-white">
										{participant.fitness?.toFixed(2) || 'N/A'}
									</div>
								{:else}
									<div class="text-xl font-bold text-gray-500">
										???
									</div>
								{/if}
								
								{#if participant.velocity_magnitude}
									<div class="text-sm text-gray-400">
										Speed: {participant.velocity_magnitude.toFixed(1)}
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex-1 flex items-center justify-center text-gray-400">
				<div class="text-center">
					<p>No participants yet</p>
					<p class="text-sm mt-2">Waiting for people to join...</p>
				</div>
			</div>
		{/if}

		<!-- Session Stats - also hide fitness during walking phase -->
		{#if participants.length > 0}
			<div class="mt-6 bg-gray-800 rounded-lg p-4">
				<h3 class="font-bold mb-2 text-blue-400">Session Stats</h3>
				<div class="space-y-1 text-sm">
					{#if session.currentPhase === 'revealing'}
						<div class="flex justify-between">
							<span>Best Score:</span>
							<span class="font-mono">{sortedParticipants[0]?.fitness?.toFixed(2) || 'N/A'}</span>
						</div>
						<div class="flex justify-between">
							<span>Worst Score:</span>
							<span class="font-mono">{sortedParticipants[sortedParticipants.length - 1]?.fitness?.toFixed(2) || 'N/A'}</span>
						</div>
						<div class="flex justify-between">
							<span>Average:</span>
							<span class="font-mono">
								{sortedParticipants.length > 0 
									? (sortedParticipants.reduce((sum, p) => sum + (p.fitness || 0), 0) / sortedParticipants.length).toFixed(2)
									: 'N/A'}
							</span>
						</div>
					{:else}
						<div class="flex justify-between">
							<span>Phase:</span>
							<span class="font-mono capitalize">{session.currentPhase || 'waiting'}</span>
						</div>
						<div class="flex justify-between">
							<span>Iteration:</span>
							<span class="font-mono">{session.iteration || 0}</span>
						</div>
						<div class="text-center text-gray-400 mt-2">
							<span class="text-xs">Fitness scores hidden during movement</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

</main>
