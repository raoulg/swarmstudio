<script lang="ts">
	import { 
		createSession, 
		startSession, 
		triggerStep, 
		resetSession, 
		connectAdminWebSocket,
		listSessions,
		deleteSession as apiDeleteSession,
		reconnectToSession
	} from '$lib/api/client';
	import { sessionState, latestSession } from '$lib/stores/sessionStore';
	import { onMount } from 'svelte';

	let adminKey = '';
	let landscapeType = 'quadratic';
	let maxIterations = 20;
	let isLoading = false;
	let existingSessions = [];

	onMount(async () => {
		if (adminKey) {
			await loadExistingSessions();
		}
	});

	async function loadExistingSessions() {
		try {
			existingSessions = await listSessions(adminKey);
			console.log('Existing sessions:', existingSessions);
			
			// Auto-reconnection logic
			const activeSession = existingSessions.find(s => s.status === 'active');
			const latestSession = existingSessions
				.filter(s => s.participant_count > 0)
				.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
			
			const targetSession = activeSession || latestSession;
			
			if (targetSession) {
				await reconnectToSession(targetSession);
			}
		} catch (error) {
			console.log('Error loading sessions:', error);
		}
	}

	async function handleCreateSession() {
		isLoading = true;
		try {
			const data = await createSession(adminKey, landscapeType, maxIterations);
			console.log('=== ADMIN SESSION CREATION DEBUG ===');
			console.log('Session created:', data);
			console.log('Current sessionState store:', $sessionState);
			console.log('Current latestSession store:', $latestSession);
			
			latestSession.set({ code: data.session_code, id: data.session_id });
			
			sessionState.set({ 
				id: data.session_id, 
				code: data.session_code, 
				participants: [],
				status: 'waiting' 
			});
			
			connectAdminWebSocket(data.session_id);
		} catch (e) {
			alert(e.message);
		}
		isLoading = false;
	}

	async function handleAction(action: 'start' | 'step' | 'reset') {
		if (!$sessionState.id) {
			alert('No active session ID.');
			return;
		}
		isLoading = true;
		try {
			switch (action) {
				case 'start':
					await startSession(adminKey, $sessionState.id);
					break;
				case 'step':
					await triggerStep(adminKey, $sessionState.id);
					break;
				case 'reset':
					await resetSession(adminKey, $sessionState.id);
					break;
			}
		} catch (e) {
			alert(e.message);
		}
		isLoading = false;
	}

	async function handleDeleteSession(session) {
		if (!confirm(`Delete session ${session.session_code}? This will disconnect all participants.`)) {
			return;
		}
		
		try {
			await apiDeleteSession(adminKey, session.session_id);
			await loadExistingSessions();
			
			if ($sessionState.id === session.session_id) {
				sessionState.set({ participants: [] });
				latestSession.set(null);
			}
		} catch (error) {
			alert(`Error deleting session: ${error.message}`);
		}
	}
	async function handleStep() {
	if (!$sessionState.id) {
		alert('No active session');
		return;
	}

	// Determine next action based on current phase
	const nextAction = $sessionState.currentPhase === 'revealing' ? 'walk' : 'reveal';
	
	try {
		if (nextAction === 'walk') {
			// Trigger walk (swarm step)
			await handleAction('step');
		} else {
			// Trigger reveal
			await handleReveal();
		}
	} catch (error) {
		alert(`Error during ${nextAction}: ${error.message}`);
	}
}

	// New functions for Walk and Reveal
	// async function handleWalk() {
	// 	// This will trigger movement instructions to all participants
	// 	await handleAction('step');
	// }

	async function handleReveal() {
		// This will trigger fitness revelation to all participants
		// We need to broadcast a reveal message to all participants
		if (!$sessionState.id) {
			alert('No active session');
			return;
		}

		try {
			// For now, we'll broadcast a custom reveal message
			// You might want to add a specific API endpoint for this
			const response = await fetch(`http://localhost:8000/api/admin/session/${$sessionState.id}/reveal`, {
				method: 'POST',
				headers: { 'X-Admin-Key': adminKey }
			});
			
			if (!response.ok) {
				// If reveal endpoint doesn't exist, fall back to manual broadcast
				console.log('Reveal endpoint not found, participants should handle this via WebSocket');
			}
		} catch (error) {
			console.log('Triggering reveal state for participants:', error);
		}
	}

	// Participant removal function
	async function removeParticipant(participantId: string) {
		if (!confirm('Remove this participant from the session?')) {
			return;
		}
		
		try {
			// You'll need to implement this API endpoint
			const response = await fetch(`/api/admin/session/${$sessionState.id}/remove-participant`, {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
					'X-Admin-Key': adminKey 
				},
				body: JSON.stringify({ participant_id: participantId })
			});
			
			if (!response.ok) {
				throw new Error('Failed to remove participant');
			}
			
			console.log(`Participant ${participantId} removed`);
		} catch (error) {
			alert(`Error removing participant: ${error.message}`);
		}
	}
</script>

<div class="w-full flex flex-col gap-6">
	<!-- Session Management Section -->
	<div class="card w-full flex flex-col gap-4">
		<h2 class="text-2xl font-bold text-blue-400">Session Management</h2>
		<div class="flex flex-col gap-2 p-4 border border-blue-500 rounded-lg">
			<h3 class="font-bold text-lg">Existing Sessions</h3>
			{#if existingSessions.length > 0}
				<div class="text-sm space-y-1">
					{#each existingSessions as session (session.session_id)}
						<div class="flex justify-between items-center p-2 bg-gray-700 rounded">
							<div class="flex-grow">
								<span class="font-mono">{session.session_code}</span>
								<span class="text-gray-400">({session.status})</span>
								<span class="text-green-400">{session.participant_count} participants</span>
							</div>
							<div class="flex gap-2">
								<button 
									class="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
									on:click={() => reconnectToSession(session)}
								>
									Connect
								</button>
								<button 
									class="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700"
									on:click={() => handleDeleteSession(session)}
								>
									Delete
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-gray-400 text-sm">No existing sessions found</div>
			{/if}
		</div>
	</div>

	<!-- Admin Controls Section -->
	<div class="card w-full flex flex-col gap-4">
		<h2 class="text-2xl font-bold text-accent-color">Admin Controls</h2>
		
		<!-- Create Session -->
		<div class="flex flex-col gap-2 p-4 border border-secondary-dark rounded-lg">
			<h3 class="font-bold text-lg">1. Create Session</h3>
			<div>
				<label for="admin-key">Admin Key</label>
				<input type="password" id="admin-key" bind:value={adminKey} placeholder="Enter SWARM_API_KEY" />
			</div>
			<div>
				<label for="landscape-type">Landscape</label>
				<select id="landscape-type" bind:value={landscapeType}>
					<option value="quadratic">Quadratic (Easy)</option>
					<option value="ecological">Ecological (Medium)</option>
					<option value="rastrigin">Rastrigin (Hard)</option>
				</select>
			</div>
			<div>
				<label for="max-iterations">Max Iterations (Annealing)</label>
				<input type="number" id="max-iterations" bind:value={maxIterations} />
			</div>
			<button on:click={handleCreateSession} disabled={isLoading || !adminKey}>
				Create New Session
			</button>
		</div>

		<!-- Session Control -->
		<div class="flex flex-col gap-2 p-4 border border-secondary-dark rounded-lg">
			<h3 class="font-bold text-lg">2. Session Control</h3>
			<div class="font-mono text-sm space-y-1">
				<div>Session ID: {$sessionState.id ?? 'N/A'}</div>
				<div>Status: {$sessionState.status ?? 'N/A'}</div>
				<div>Iteration: {$sessionState.iteration ?? 'N/A'}</div>
			</div>
			
			<div class="grid grid-cols-2 gap-2 mt-2">
				<button on:click={() => handleAction('start')} disabled={isLoading || !$sessionState.id}>
					Start Session
				</button>
				<button on:click={() => handleAction('reset')} disabled={isLoading || !$sessionState.id} class="bg-yellow-600 hover:bg-yellow-700">
					Reset
				</button>
			</div>
		</div>

		<!-- Single Step Control -->
		<div class="flex flex-col gap-2 p-4 border border-green-500 rounded-lg">
			<h3 class="font-bold text-lg text-green-400">3. Live Control</h3>
			
			<!-- Current State Indicator -->
			<div class="flex items-center gap-3 mb-3">
				<span class="text-sm text-gray-400">Current Phase:</span>
				<div class="flex items-center gap-2">
					{#if $sessionState.currentPhase === 'walking'}
						<div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
						<span class="text-blue-400 font-semibold">👟 Walking</span>
					{:else if $sessionState.currentPhase === 'revealing'}
						<div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
						<span class="text-green-400 font-semibold">🎯 Revealing</span>
					{:else}
						<div class="w-3 h-3 bg-gray-500 rounded-full"></div>
						<span class="text-gray-400">⏳ Waiting</span>
					{/if}
				</div>
			</div>
			
			<!-- Single Step Button -->
			<button 
				on:click={handleStep}
				disabled={isLoading || !$sessionState.id || $sessionState.status !== 'active'}
				class="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
			>
				{#if $sessionState.currentPhase === 'revealing'}
					👟 Next: Walk
					<div class="text-xs opacity-75">Show movement instructions</div>
				{:else}
					🎯 Next: Reveal  
					<div class="text-xs opacity-75">Show fitness scores</div>
				{/if}
			</button>
			
			<!-- Session Info -->
			<div class="text-xs text-gray-400 text-center mt-2">
				Iteration: {$sessionState.iteration || 0} | 
				Participants: {$sessionState.participants?.length || 0}
			</div>
		</div>

	</div>

	<!-- Participant Management -->
	<div class="card w-full flex flex-col gap-4">
		<h2 class="text-2xl font-bold text-purple-400">Participant Management</h2>
		
		{#if $sessionState.participants && $sessionState.participants.length > 0}
			<div class="space-y-2">
				{#each $sessionState.participants as participant (participant.id)}
					<div class="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
						<div class="flex items-center gap-3">
							<!-- Color indicator -->
							<div 
								class="w-4 h-4 rounded-full border border-gray-400"
								style="background-color: {participant.color || '#888'}"
							></div>
							
							<!-- Participant info -->
							<div>
								<div class="font-semibold">{participant.name}</div>
								<div class="text-sm text-gray-400">
									Pos: [{participant.position ? participant.position.join(', ') : 'N/A'}] | 
									Fitness: {participant.fitness?.toFixed(2) || 'N/A'}
									{#if participant.velocity_magnitude}
										| Speed: {participant.velocity_magnitude.toFixed(1)}
									{/if}
								</div>
							</div>
						</div>
						
						<!-- Remove button -->
						<button 
							on:click={() => removeParticipant(participant.id)}
							class="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
						>
							Remove
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-gray-400 text-center py-4">
				No participants in session
			</div>
		{/if}
	</div>
</div>
