<script lang="ts">
	import { tracingConfig, sessionState, clearPositionHistory, participantHistory } from '$lib/stores/sessionStore';
	import type { TracingMode } from '$lib/stores/sessionStore';

	$: config = $tracingConfig;
	$: participants = $sessionState.participants;
	$: history = $participantHistory;

	// Calculate total positions in history
	$: totalPositions = Object.keys(history).reduce((sum, key) => sum + history[key].length, 0);

	function setMode(mode: TracingMode) {
		tracingConfig.update(c => ({ ...c, mode }));
	}

	function selectParticipant(participantId: string) {
		tracingConfig.update(c => ({
			...c,
			mode: 'single-participant',
			selectedParticipantId: participantId
		}));
	}

	function clearHistory() {
		if (confirm('Clear all position history?')) {
			clearPositionHistory();
		}
	}

	const tracingModes: { mode: TracingMode; label: string; description: string }[] = [
		{ mode: 'none', label: 'None', description: 'No tracing' },
		{ mode: 'single-step', label: 'Single Step', description: 'Show movement arrows' },
		{ mode: 'full-lines', label: 'Full Path Lines', description: 'Complete path for all' },
		{ mode: 'full-dots', label: 'Full Path Dots', description: 'Dot trail for all' },
		{ mode: 'single-participant', label: 'Single Trace', description: 'Track one participant' }
	];
</script>

<div class="bg-gray-800 rounded-lg p-4 space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="font-bold text-blue-400">Tracing Controls</h3>
		<button
			on:click={clearHistory}
			class="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
			title="Clear position history"
		>
			Clear History
		</button>
	</div>

	<!-- Tracing Mode Selection -->
	<div class="space-y-2">
		<label class="text-sm font-medium text-gray-300">Tracing Mode:</label>
		<div class="grid grid-cols-2 gap-2">
			{#each tracingModes as { mode, label, description }}
				<button
					on:click={() => setMode(mode)}
					class="px-3 py-2 rounded text-sm transition-colors {config.mode === mode
						? 'bg-blue-600 text-white'
						: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
					title={description}
				>
					{label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Participant Selection (only shown for single-participant mode) -->
	{#if config.mode === 'single-participant'}
		<div class="space-y-2">
			<label class="text-sm font-medium text-gray-300">Select Participant:</label>
			<div class="max-h-40 overflow-y-auto space-y-1">
				{#each participants as participant}
					<button
						on:click={() => selectParticipant(participant.id)}
						class="w-full px-3 py-2 rounded text-sm text-left transition-colors flex items-center gap-2 {config.selectedParticipantId === participant.id
							? 'bg-blue-600 text-white'
							: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
					>
						<div
							class="w-3 h-3 rounded-full flex-shrink-0"
							style="background-color: {participant.color || '#888'};"
						></div>
						<span class="truncate">{participant.name}</span>
						{#if participant.emojis}
							<span class="ml-auto">{participant.emojis.join('')}</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Info Display -->
	<div class="text-xs text-gray-400 border-t border-gray-700 pt-2">
		{#if config.mode === 'none'}
			<p>No tracing enabled. Select a mode to visualize movement.</p>
		{:else if config.mode === 'single-step'}
			<p>Shows arrows from previous to current position during walking phase.</p>
		{:else if config.mode === 'full-lines'}
			<p>Displays complete movement path as lines for all participants.</p>
		{:else if config.mode === 'full-dots'}
			<p>Shows historical positions as dots with increasing opacity.</p>
		{:else if config.mode === 'single-participant'}
			<p>Tracks the complete journey of a single selected participant.</p>
		{/if}
	</div>

	<!-- Debug Info -->
	<div class="text-xs bg-gray-900/50 p-2 rounded border border-gray-700">
		<div class="font-bold text-blue-400 mb-1">Debug Info:</div>
		<div class="space-y-0.5 font-mono">
			<div>Mode: <span class="text-green-400">{config.mode}</span></div>
			<div>Participants: <span class="text-green-400">{participants.length}</span></div>
			<div>History tracked: <span class="text-green-400">{Object.keys(history).length}</span> participants</div>
			<div>Total positions: <span class="text-green-400">{totalPositions}</span></div>
		</div>
	</div>
</div>
