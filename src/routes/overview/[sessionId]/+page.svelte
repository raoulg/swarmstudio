<script lang="ts">
	// src/routes/overview/[sessionId]/+page.svelte
	import { sessionState, tracingConfig } from '$lib/stores/sessionStore';
	import { connectAdminWebSocket, API_BASE_URL } from '$lib/api/client';
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import TraceOverlay from '$lib/components/TraceOverlay.svelte';

	// Get session ID from URL params if provided
	$: sessionId = $page.params.sessionId;

	// Get session state
	$: session = $sessionState;
	$: participants = session.participants || [];
	$: config = session.config;
	$: gridSize = config?.grid_size || 25;

	// Sort participants by fitness (best first), but include all participants
	// Participants with fitness come first (sorted by fitness), then those without
	$: sortedParticipants = [
		...participants
			.filter(p => p.fitness !== null && p.fitness !== undefined)
			.sort((a, b) => (a.fitness || 999) - (b.fitness || 999)),
		...participants
			.filter(p => p.fitness === null || p.fitness === undefined)
	];

	// Landscape Visualization Logic
	$: showLandscape = $tracingConfig.showLandscape;
	let landscapeCanvas: HTMLCanvasElement;
	let landscapeData: { values: number[], min_value: number, max_value: number, grid_size: number } | null = null;
	let loadingLandscape = false;
	let loadedSessionId: string | null = null;
	const VIZ_RESOLUTION = 400; // High resolution for canvas

	$: if (showLandscape && sessionId && (!landscapeData || loadedSessionId !== sessionId) && !loadingLandscape) {
		loadingLandscape = true;
		fetch(`${API_BASE_URL}/session/${sessionId}/landscape?resolution=${VIZ_RESOLUTION}`)
			.then(res => res.json())
			.then(data => {
				landscapeData = data;
				loadedSessionId = sessionId;
				loadingLandscape = false;
				console.log('High-res landscape data loaded:', data);
				renderLandscapeToCanvas();
			})
			.catch(err => {
				console.error('Failed to load landscape:', err);
				loadingLandscape = false;
			});
	}

	$: if (showLandscape && landscapeData && landscapeCanvas) {
		renderLandscapeToCanvas();
	}

	async function renderLandscapeToCanvas() {
		if (!landscapeCanvas || !landscapeData) return;
		
		// Ensure canvas is ready
		await tick();
		
		const ctx = landscapeCanvas.getContext('2d');
		if (!ctx) return;

		const { values, min_value, max_value, grid_size } = landscapeData;
		const width = landscapeCanvas.width;
		const height = landscapeCanvas.height;
		
		// Use ImageData for faster pixel manipulation
		const imgData = ctx.createImageData(width, height);
		const data = imgData.data;

		for (let i = 0; i < values.length; i++) {
			const value = values[i];
			// Normalize 0-1
			const normalized = Math.max(0, Math.min(1, (value - min_value) / (max_value - min_value)));
			
			// Color scale: Green (low loss/good) -> Yellow -> Red (high loss/bad)
			let r, g, b;
			if (normalized < 0.5) {
				// Green to Yellow
				r = Math.floor(255 * (normalized * 2));
				g = 255;
				b = 0;
			} else {
				// Yellow to Red
				r = 255;
				g = Math.floor(255 * (1 - (normalized - 0.5) * 2));
				b = 0;
			}

			// Set pixel color (i corresponds to the flat array from backend, which is row-major)
			// Index in ImageData is i * 4 (RGBA)
			const idx = i * 4;
			data[idx] = r;     // R
			data[idx + 1] = g; // G
			data[idx + 2] = b; // B
			data[idx + 3] = 50; // Alpha (0-255), ~0.2 opacity like before
		}

		ctx.putImageData(imgData, 0, 0);
	}

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
				<div class="flex items-center gap-6">
					<!-- The Grid with Trace Overlay and Axis Labels -->
					<div class="relative p-12" style="width: 60vh; max-width: 700px;">
						<!-- Y Axis Label -->
						<div class="absolute -left-12 top-0 h-full flex items-center justify-center">
							<span class="text-white/40 text-xs font-bold uppercase tracking-widest -rotate-90 whitespace-nowrap">Y Axis</span>
						</div>

						<!-- Y Axis Numbers -->
						<div class="absolute -left-6 top-12 bottom-12 w-6">
							{#each Array.from({ length: gridSize }, (_, i) => i) as i}
								{@const showEvery = gridSize > 15 ? 5 : 1}
								{#if i % showEvery === 0 || i === gridSize - 1}
									<div
										class="absolute right-1 text-[10px] font-mono text-white/60 font-bold -translate-y-1/2"
										style="bottom: {(i + 0.5) * (100 / gridSize)}%"
									>
										{i}
									</div>
								{/if}
							{/each}
						</div>

						<!-- X Axis Label -->
						<div class="absolute -bottom-12 left-0 w-full flex items-center justify-center">
							<span class="text-white/40 text-xs font-bold uppercase tracking-widest whitespace-nowrap">X Axis</span>
						</div>

						<!-- X Axis Numbers -->
						<div class="absolute -bottom-6 left-12 right-12 h-6">
							{#each Array.from({ length: gridSize }, (_, i) => i) as i}
								{@const showEvery = gridSize > 15 ? 5 : 1}
								{#if i % showEvery === 0 || i === gridSize - 1}
									<div
										class="absolute top-1 text-[10px] font-mono text-white/60 font-bold -translate-x-1/2"
										style="left: {(i + 0.5) * (100 / gridSize)}%"
									>
										{i}
									</div>
								{/if}
							{/each}
						</div>

						<div
							class="relative border-4 border-blue-500 bg-gray-800 rounded-lg overflow-hidden shadow-2xl aspect-square"
						>
							<!-- High-Res Landscape Canvas -->
							<canvas
								bind:this={landscapeCanvas}
								width={VIZ_RESOLUTION}
								height={VIZ_RESOLUTION}
								class="absolute inset-0 w-full h-full pointer-events-none"
								style="display: {showLandscape ? 'block' : 'none'}; z-index: 0;"
							/>

							<!-- Grid cells -->
							<div
								class="grid absolute inset-0"
								style="grid-template-columns: repeat({gridSize}, 1fr); z-index: 10;"
							>
								{#each Array(gridSize * gridSize) as _, i}
									{@const row = Math.floor(i / gridSize)}
									{@const col = i % gridSize}
									{@const participant = participants.find(p => p.position && p.position[0] === col && p.position[1] === (gridSize - 1 - row))}

									<div class="relative w-full h-full border border-gray-600/30">
										{#if participant}
											<div
												class="absolute inset-0 m-auto w-4/5 h-4/5 rounded-full border-2 border-white/80 transition-all duration-500 shadow-lg flex items-center justify-center"
												style="background-color: {participant.color || '#888'};"
												title="{participant.name} - Grid: [{participant.position?.join(', ')}] - Actual: ({participant.continuous_position?.[0]?.toFixed(2) || 'N/A'}, {participant.continuous_position?.[1]?.toFixed(2) || 'N/A'}) - Fitness: {participant.fitness?.toFixed(2) || 'N/A'}"
											>
												<span class="text-xs sm:text-sm pointer-events-none select-none filter drop-shadow-md">
													{participant.emojis ? participant.emojis.join('') : ''}
												</span>
											</div>
										{/if}
									</div>
								{/each}
							</div>

							<!-- Trace Overlay -->
							<TraceOverlay {gridSize} {participants} />
						</div>
					</div>

					<!-- Vertical Fitness Legend -->
					<div class="h-[60vh] flex flex-col justify-between py-2 bg-gray-800/50 rounded-lg px-3 border border-gray-700">
						<div class="text-xs text-green-400 font-bold text-center">
							<div>Best</div>
							<div>(0)</div>
						</div>
						
						<div class="w-4 flex-grow my-2 rounded-full bg-gradient-to-b from-green-500 via-yellow-500 to-red-500 border border-gray-600 relative mx-auto"></div>
						
						<div class="text-xs text-red-400 font-bold text-center">
							<div>Worst</div>
							<div>(50+)</div>
						</div>
					</div>
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
	<div class="col-span-1 flex flex-col h-full overflow-hidden">
		<h2 class="text-2xl font-bold mb-2 text-green-400">Leaderboard</h2>
		
		<!-- QR Code Section -->
		{#if session.code}
			<div class="mb-4 text-center">
				<img
					src="/qr.png"
					alt="Join Session QR Code"
					class="mx-auto mb-1 rounded-lg shadow-lg border-2 border-gray-600"
					style="width: 120px; height: 120px;"
				/>
				<p class="text-xs text-gray-400">Scan to join session</p>
			</div>
		{/if}

		{#if sortedParticipants.length > 0}
			<!-- Column Headers -->
			<div class="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center">
				<div class="w-12 text-center">Icon</div>
				<div class="flex-grow pl-2">Name</div>
				<div class="w-20 text-center">POS</div>
				<div class="w-16 text-right pr-2">f</div>
			</div>

			<div class="flex-1 overflow-y-auto pr-1 space-y-0.5">
				{#each sortedParticipants as participant (participant.id)}
					<div
						class="bg-gray-800/80 rounded p-1 border-l-4 transition-all hover:bg-gray-700"
						style="border-l-color: {participant.color || '#888'};"
						title="{participant.name} - Continuous: ({participant.continuous_position?.[0]?.toFixed(2) || 'N/A'}, {participant.continuous_position?.[1]?.toFixed(2) || 'N/A'})"
					>
						<div class="flex items-center text-sm">
							<!-- Emoji Icon -->
							<div class="w-12 text-lg flex-shrink-0 text-center whitespace-nowrap overflow-visible">
								{participant.emojis ? participant.emojis.join('') : ''}
							</div>

							<!-- Name -->
							<div class="flex-grow min-w-0 font-medium pl-2 truncate text-gray-200">
								{participant.name}
							</div>

							<!-- Grid Position with continuous position on hover -->
							<div class="w-20 text-xs text-gray-400 font-mono text-center">
								{#if participant.position}
									<div class="leading-tight">
										<div class="text-gray-300">[{participant.position[0]},{participant.position[1]}]</div>
										{#if participant.continuous_position}
											<div class="text-[9px] text-gray-500">
												({participant.continuous_position[0].toFixed(1)},{participant.continuous_position[1].toFixed(1)})
											</div>
										{/if}
									</div>
								{:else}
									<div>[-]</div>
								{/if}
							</div>

							<!-- Fitness Score -->
							<div class="w-16 text-right pr-2">
								{#if session.currentPhase === 'revealing'}
									<div class="font-bold text-green-400 font-mono">
										{participant.fitness?.toFixed(1) || 'N/A'}
									</div>
								{:else}
									<div class="font-bold text-gray-600 font-mono">
										???
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
