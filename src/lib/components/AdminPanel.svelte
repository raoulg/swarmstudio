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

	onMount(async () => {
		if (adminKey) {
			await loadExistingSessions();
		}
	});

	let adminKey = '';
	let landscapeType = 'quadratic';
	let maxIterations = 20;
	let isLoading = false;

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
			// Admin joins their own session to get updates
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
	let existingSessions = [];

	async function loadExistingSessions() {
		try {
			existingSessions = await listSessions(adminKey);
			console.log('Existing sessions:', existingSessions);
			
			// Auto-reconnection logic (as before)
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
	async function handleDeleteSession(session) {
		if (!confirm(`Delete session ${session.session_code}?`)) return;
		
		try {
			await apiDeleteSession(adminKey, session.session_id);
			await loadExistingSessions(); // Refresh list
			
			// Clear current session if deleted
			if ($sessionState.id === session.session_id) {
				sessionState.set({ participants: [] });
				latestSession.set(null);
			}
		} catch (error) {
			alert(`Error: ${error.message}`);
		}
	}

</script>
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

<div class="card w-full flex flex-col gap-4">
	<h2 class="text-2xl font-bold text-accent-color">Admin Controls</h2>

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

	<div class="flex flex-col gap-2 p-4 border border-secondary-dark rounded-lg">
		<h3 class="font-bold text-lg">2. Manage Session</h3>
		<div class="font-mono text-sm">Session ID: {$sessionState.id ?? 'N/A'}</div>
		<div class="font-mono text-sm">Status: {$sessionState.status ?? 'N/A'}</div>
		<div class="font-mono text-sm">Iteration: {$sessionState.iteration ?? 'N/A'}</div>
		<div class="grid grid-cols-3 gap-2 mt-2">
			<button on:click={() => handleAction('start')} disabled={isLoading || !$sessionState.id}>Start</button>
			<button on:click={() => handleAction('step')} disabled={isLoading || !$sessionState.id}>Step</button>
			<button on:click={() => handleAction('reset')} disabled={isLoading || !$sessionState.id} class="bg-yellow-600 hover:bg-yellow-700">Reset</button>
		</div>
	</div>
</div>

