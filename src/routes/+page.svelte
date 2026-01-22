<script lang="ts">
	// src/routes/+page.svelte
	import { sessionState, participantId } from '$lib/stores/sessionStore';
	import { joinSession, sendPosition } from '$lib/api/client';

	let sessionCode = '';
	let errorMessage = '';
	let isLoading = false;
	let movementState = 'waiting'; // 'waiting', 'moving', 'revealing'

	// Coordinate input state
	let inputX = '';
	let inputY = '';
	let hasSubmittedPosition = false;
	let submissionError = '';
	let isSubmitting = false;

	// Reactive variables based on the session store
	$: session = $sessionState;
	$: participants = session.participants || [];
	$: config = session.config;
	const COORD_MAX = 100; // Fixed 0-100 coordinate system
	$: me = participants.find((p) => p.id === $participantId);

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

	function handleSubmitPosition() {
		submissionError = '';

		// Validate inputs
		const x = parseInt(inputX);
		const y = parseInt(inputY);

		if (isNaN(x) || isNaN(y)) {
			submissionError = 'Please enter valid numbers';
			return;
		}

		// Coordinate bounds validation (0-100)
		if (x < 0 || x > COORD_MAX || y < 0 || y > COORD_MAX) {
			submissionError = `Coordinates must be between 0 and ${COORD_MAX}`;
			return;
		}

		isSubmitting = true;
		try {
			sendPosition([x, y]);
			hasSubmittedPosition = true;
		} catch (error) {
			submissionError = 'Failed to submit position. Try again.';
			console.error('Position submission error:', error);
		} finally {
			isSubmitting = false;
		}
	}
	let previousPhase: string | undefined = undefined;
	$: {
		// Map session phase to local movement state
		if ($sessionState.currentPhase === 'walking') {
			movementState = 'moving';

			// Reset submission state when entering walk phase (new phase)
			if (previousPhase !== 'walking') {
				hasSubmittedPosition = false;
				submissionError = '';
				inputX = '';
				inputY = '';
			}
		} else if ($sessionState.currentPhase === 'revealing') {
			movementState = 'revealing';
		} else {
			movementState = 'waiting';
		}

		previousPhase = $sessionState.currentPhase;
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

	{:else if movementState === 'moving'}
		<!-- Movement Input Screen -->
		<div class="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 to-blue-900 text-white relative">
			<!-- Name in top corner -->
			<div class="relative top-4 left-4 text-sm opacity-75">
				{me?.name}
			</div>

			<div class="text-center space-y-8">
				{#if !hasSubmittedPosition}
					<!-- Coordinate Input Form -->
					<div class="space-y-6">
						<h1 class="text-3xl font-semibold text-gray-200">Enter Your Position</h1>
						<p class="text-gray-400">Choose coordinates from 0 to {COORD_MAX}</p>

						<div class="flex items-center justify-center gap-6">
							<div class="flex flex-col items-center">
								<label for="inputX" class="text-lg text-gray-400 mb-2">X</label>
								<input
									id="inputX"
									type="number"
									bind:value={inputX}
									min="0"
									max={COORD_MAX}
									class="w-28 h-20 text-4xl font-mono text-center bg-gray-800 border-2 border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
									placeholder="0"
								/>
							</div>
							<span class="text-5xl text-gray-500 mt-6">,</span>
							<div class="flex flex-col items-center">
								<label for="inputY" class="text-lg text-gray-400 mb-2">Y</label>
								<input
									id="inputY"
									type="number"
									bind:value={inputY}
									min="0"
									max={COORD_MAX}
									class="w-28 h-20 text-4xl font-mono text-center bg-gray-800 border-2 border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
									placeholder="0"
								/>
							</div>
						</div>

						{#if submissionError}
							<p class="text-red-400 text-sm">{submissionError}</p>
						{/if}

						<button
							on:click={handleSubmitPosition}
							disabled={isSubmitting}
							class="mt-4 px-10 py-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-2xl font-bold transition-colors"
						>
							{#if isSubmitting}
								Submitting...
							{:else}
								Submit Position
							{/if}
						</button>
					</div>
				{:else}
					<!-- Confirmation after submission -->
					<div class="space-y-6">
						<div class="text-8xl mb-4">✅</div>
						<h1 class="text-3xl font-semibold text-green-400">Position Submitted!</h1>
						<div class="text-5xl font-bold font-mono tracking-wider">
							[{inputX}, {inputY}]
						</div>
						<p class="text-xl text-gray-400">Waiting for reveal phase...</p>
					</div>
				{/if}

				<!-- No action button needed - auto-advances -->
			</div>
		</div>

	{:else if movementState === 'revealing'}
		<!-- Fitness Revelation Screen -->
		<div
			class="w-full h-screen flex flex-col items-center justify-center text-white relative"
			style="background: linear-gradient(135deg, {(me?.color || '#888')}, {(me?.color || '#888')}88);"
		>
			<!-- Name in top corner -->
			<div class="relative top-4 left-4 text-sm opacity-75">
				{me?.name}
			</div>

			<div class="text-center space-y-8">
				<!-- Position Display -->
				<div class="space-y-2">
					<h2 class="text-xl text-gray-200">Your Position</h2>
					<div class="text-4xl font-mono font-bold">
						[{me?.position ? me.position.join(', ') : 'N/A'}]
					</div>
				</div>

				<!-- Fitness Score -->
				<div class="space-y-2">
					<h2 class="text-xl text-gray-200">Fitness Score</h2>
					<div class="text-6xl font-bold animate-pulse">
						{me?.fitness ? me.fitness.toFixed(2) : '???'}
					</div>
				</div>

				<!-- Feedback Message with Image Border -->
				<div class="space-y-4">
					{#if me?.fitness}
						<!-- Placeholder for future feedback image -->
						<div class="w-32 h-32 border-4 border-white rounded-lg flex items-center justify-center bg-white/20 mx-auto">
							<div class="text-4xl">
								{me.fitness < 0.5 ? '🎯' : 
								 me.fitness < 1.0 ? '👍' : 
								 me.fitness < 2.0 ? '🔍' : 
								 '🚀'}
							</div>
						</div>
						<div class="text-xl font-semibold">
							{me.fitness < 0.5 ? 'Great position!' : 
							 me.fitness < 1.0 ? 'Good spot!' : 
							 me.fitness < 2.0 ? 'Keep exploring!' : 
							 'Keep searching!'}
						</div>
					{/if}
				</div>

				<!-- Speed Display (smaller) -->
				{#if me?.velocity_magnitude}
					<div class="space-y-1 opacity-75">
						<h2 class="text-sm text-gray-200">Speed</h2>
						<div class="text-lg">
							{me.velocity_magnitude.toFixed(2)}
						</div>
					</div>
				{/if}
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
					</div>
				</div>
			{/if}


			<div class="text-center text-gray-400">
				<p class="text-lg">Waiting for next instruction...</p>
			</div>
		</div>
	{/if}

	<!-- No test buttons - controlled by admin only -->
</main>
