<script lang="ts">
	import { participantHistory, tracingConfig, sessionState } from '$lib/stores/sessionStore';
	import type { Participant, PositionHistoryEntry } from '$lib/stores/sessionStore';

	export let gridSize: number = 25;
	export let participants: Participant[] = [];

	$: config = $tracingConfig;
	$: history = $participantHistory;
	$: session = $sessionState;

	// Debug logging
	$: {
		console.log('TraceOverlay - Current state:', {
			mode: config.mode,
			participantCount: participants.length,
			historyKeys: Object.keys(history),
			historyEntryCount: Object.keys(history).reduce((sum, key) => sum + history[key].length, 0)
		});
	}

	// Helper to convert grid position to percentage
	function posToPercent(pos: number): number {
		return (pos * 100) / gridSize;
	}

	// Get the previous entry for single-step tracing
	function getPreviousEntry(participantId: string): PositionHistoryEntry | null {
		const positions = history[participantId];
		if (!positions || positions.length < 2) return null;
		return positions[positions.length - 2];
	}

	// Get all history for a participant
	function getParticipantHistory(participantId: string): PositionHistoryEntry[] {
		const positions = history[participantId];
		if (!positions) return [];
		return positions;
	}

	// Get participant color
	function getParticipantColor(participantId: string): string {
		const participant = participants.find(p => p.id === participantId);
		return participant?.color || '#888';
	}

	const traceLineColor = '#94a3b8'; // Uniform color for lines
</script>

<svg
	class="absolute inset-0 w-full h-full pointer-events-none"
	style="z-index: 20;"
	viewBox="0 0 100 100"
	preserveAspectRatio="none"
>
	<!-- Only show single step traces during walking phase -->
	{#if session.currentPhase === 'walking' && config.mode === 'single-step'}
		<!-- Show line from previous to current position for each participant -->
		{#each participants as participant}
			{@const prevEntry = getPreviousEntry(participant.id)}
			{#if prevEntry && participant.position}
				<line
					x1={posToPercent(prevEntry.position[0]) + (50 / gridSize)}
					y1={100 - posToPercent(prevEntry.position[1]) - (50 / gridSize)}
					x2={posToPercent(participant.position[0]) + (50 / gridSize)}
					y2={100 - posToPercent(participant.position[1]) - (50 / gridSize)}
					stroke={traceLineColor}
					stroke-width="0.8"
					stroke-opacity="0.9"
				/>
			{/if}
		{/each}

	{:else if config.mode === 'full-lines'}
		<!-- Show complete path for all participants -->
		{#each participants as participant}
			{@const entries = getParticipantHistory(participant.id)}
			{#if entries.length > 1}
				<polyline
					points={entries.map(e =>
						`${posToPercent(e.position[0]) + (50 / gridSize)},${100 - posToPercent(e.position[1]) - (50 / gridSize)}`
					).join(' ')}
					fill="none"
					stroke={traceLineColor}
					stroke-width="0.6"
					stroke-opacity="0.6"
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
			{/if}
		{/each}

	{:else if config.mode === 'full-dots'}
		<!-- Show dots for all historical positions -->
		{#each participants as participant}
			{@const entries = getParticipantHistory(participant.id)}
			{#each entries as entry, idx}
				{@const opacity = 0.4 + (idx / entries.length) * 0.6}
				{@const size = 0.8}
				<circle
					cx={entry.normalized_position
						? entry.normalized_position[0] * 100
						: posToPercent(entry.position[0]) + (50 / gridSize)}
					cy={entry.normalized_position
						? 100 - entry.normalized_position[1] * 100
						: 100 - posToPercent(entry.position[1]) - (50 / gridSize)}
					r={size}
					fill={entry.color || getParticipantColor(participant.id)}
					opacity={opacity}
				/>
			{/each}
		{/each}

	{:else if config.mode === 'single-participant' && config.selectedParticipantId}
		<!-- Show trace for single selected participant -->
		{@const entries = getParticipantHistory(config.selectedParticipantId)}
		{#if entries.length > 1}
			<!-- Draw path -->
			<polyline
				points={entries.map(e =>
					`${posToPercent(e.position[0]) + (50 / gridSize)},${100 - posToPercent(e.position[1]) - (50 / gridSize)}`
				).join(' ')}
				fill="none"
				stroke={traceLineColor}
				stroke-width="0.5"
				stroke-opacity="0.8"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			<!-- Draw dots at each position -->
			{#each entries as entry, idx}
				{@const opacity = 0.3 + (idx / entries.length) * 0.7}
				{@const size = 0.5 + (idx / entries.length) * 0.8}
				<circle
					cx={posToPercent(entry.position[0]) + (50 / gridSize)}
					cy={100 - posToPercent(entry.position[1]) - (50 / gridSize)}
					r={size}
					fill={entry.color || getParticipantColor(config.selectedParticipantId)}
					opacity={opacity}
					stroke="white"
					stroke-width="0.1"
				/>
			{/each}
		{/if}
	{/if}
</svg>