<script lang="ts">
	// src/lib/components/AdminPanel.svelte
	import { 
		createSession, 
		startSession, 
		triggerStep, 
		resetSession, 
		connectAdminWebSocket,
		reconnectToSession,
		type SessionSummary
	} from '$lib/api/client';
	import { 
		listSessions,
		handleDeleteSession,
		handleStep
	} from '$lib/api/adminActions';
	import { sessionState, latestSession } from '$lib/stores/sessionStore';
	import { onMount } from 'svelte';

	export let adminKey = '';
	export let landscapeType = 'quadratic';
	export let maxIterations = 20;
	export let gridSize = 25;
	export let isLoading = false;
	export let existingSessions: SessionSummary[] = [];

	onMount(async () => {
		console.log('=== AdminPanel mounted ===');
		console.log('adminKey on mount:', adminKey ? 'SET' : 'NOT SET');
		if (adminKey) {
			await loadExistingSessions();
		}
	});

	// Auto-load sessions when key is entered
	$: if (adminKey) {
		loadExistingSessions();
	}

	// Sync local state with active session config
	$: if ($sessionState.config) {
		landscapeType = $sessionState.config.landscape_type || 'quadratic';
		gridSize = $sessionState.config.grid_size || 25;
		// Optional: maxIterations is not currently in session.config, but if it were:
		// maxIterations = $sessionState.config.max_iterations || 20;
	}

	async function loadExistingSessions() {
		if (!adminKey) return;
		try {
			existingSessions = await listSessions(adminKey);
			console.log('Existing sessions:', existingSessions);
			
			// Auto-reconnection logic ONLY if we don't have an active session ID
			if (!$sessionState.id) {
				const activeSession = existingSessions.find(s => s.status === 'active');
				const latestSession = existingSessions
					.filter(s => s.participant_count > 0)
					.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
				
				const targetSession = activeSession || latestSession;
				
				if (targetSession) {
					await reconnectToSession(targetSession);
				}
			}
		} catch (error) {
			console.log('Error loading sessions:', error);
		}
	}

	async function handleCreateSession() {
		isLoading = true;
		try {
			const data = await createSession(adminKey, landscapeType, maxIterations, gridSize);
			console.log('=== ADMIN SESSION CREATION DEBUG ===');
			console.log('Session created:', data);
			console.log('Current sessionState store:', $sessionState);
			console.log('Current latestSession store:', $latestSession);
			
			latestSession.set({ code: data.session_code, id: data.session_id });
			
			sessionState.set({ 
				id: data.session_id, 
				code: data.session_code, 
				participants: [],
				status: 'waiting',
				// Optimistically set config so UI updates immediately
				config: {
					grid_size: gridSize,
					landscape_type: landscapeType
				}
			});
			
			connectAdminWebSocket(data.session_id);
			// Refresh list to show new session
			await loadExistingSessions();
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

	async function handleStepAction() {
		await handleStep(
			adminKey, 
			$sessionState.id, 
			$sessionState.currentPhase, 
			() => handleAction('step')
		);
	}
</script>

<div class="w-full flex flex-col gap-6">
	<!-- Session Management Section -->
	<div class="card w-full flex flex-col gap-4">
		<h2 class="text-2xl font-bold text-blue-400">Session Management</h2>
		{#if !adminKey}
			<div class="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 text-sm">
				⚠️ <strong>Enter admin key below</strong> to manage sessions
			</div>
		{/if}
		<div class="flex flex-col gap-2 p-4 border border-blue-500 rounded-lg">
			<div class="flex justify-between items-center">
				<h3 class="font-bold text-lg">Existing Sessions</h3>
				<button 
					on:click={loadExistingSessions}
					disabled={!adminKey}
					class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
				>
					🔄 Refresh
				</button>
			</div>
			{#if existingSessions.length > 0}
				<div class="text-sm space-y-1 max-h-40 overflow-y-auto">
					{#each existingSessions as session (session.session_id)}
						<div class="flex justify-between items-center p-2 bg-gray-700 rounded">
							<div class="flex-grow">
								<span class="font-mono">{session.session_code}</span>
								<span class="text-gray-400">({session.status})</span>
								{#if session.session_id === $sessionState.id}
									<span class="text-blue-400 font-bold ml-2">← ACTIVE</span>
								{/if}
							</div>
							<div class="flex gap-2">
								<button
									class="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
									on:click={() => reconnectToSession(session)}
								>
									Connect
								</button>
								<button
									class="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
									on:click={() => {
										console.log('Delete button clicked!');
										console.log('adminKey:', adminKey ? 'SET' : 'NOT SET');
										console.log('session:', session);
										handleDeleteSession(adminKey, session, loadExistingSessions);
									}}
									disabled={!adminKey}
									title={!adminKey ? "Enter admin key to delete sessions" : "Delete this session"}
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
				<label for="admin-key" class="text-accent-color font-semibold">
					Admin Key <span class="text-red-500">*</span>
					{#if adminKey}
						<span class="text-green-500 text-sm ml-2">✓ Key entered</span>
					{/if}
				</label>
				<input
					type="password"
					id="admin-key"
					bind:value={adminKey}
					placeholder="Enter SWARM_API_KEY"
					class="border-2 {adminKey ? 'border-green-500' : 'border-gray-600'}"
				/>
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
				<label for="grid-size">Grid Size</label>
				<input type="number" id="grid-size" bind:value={gridSize} min="10" max="100" />
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
				<div>Landscape: <span class="text-green-400 font-bold uppercase">{$sessionState.config?.landscape_type ?? 'N/A'}</span></div>
				<div>Grid Size: <span class="font-bold">{$sessionState.config?.grid_size ?? 'N/A'}</span></div>
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
				on:click={handleStepAction}
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
</div>
