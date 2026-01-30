<script lang="ts">
	import { participantHistory, tracingConfig, sessionState } from '$lib/stores/sessionStore';
	import type { Participant } from '$lib/stores/sessionStore';

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

	// Get the previous position for single-step tracing
	function getPreviousPosition(participantId: string): [number, number] | null {
		const positions = history[participantId];
		if (!positions || positions.length < 2) return null;
		return positions[positions.length - 2].position;
	}

	// Get all history for a participant
	function getParticipantHistory(participantId: string): [number, number][] {
		const positions = history[participantId];
		if (!positions) return [];
		return positions.map(entry => entry.position);
	}

	// Get participant color
	function getParticipantColor(participantId: string): string {
		const participant = participants.find(p => p.id === participantId);
		return participant?.color || '#888';
	}
</script>

<svg
	class="absolute inset-0 w-full h-full pointer-events-none"
	style="z-index: 1;"
	viewBox="0 0 100 100"
	preserveAspectRatio="none"
>
	<!-- Only show traces during walking phase -->
	{#if session.currentPhase === 'walking' && config.mode === 'single-step'}
		<!-- Show line from previous to current position for each participant -->
		{#each participants as participant}
			{@const prevPos = getPreviousPosition(participant.id)}
			{#if prevPos && participant.position}
				<line
					x1={posToPercent(prevPos[1]) + (50 / gridSize)}
					y1={posToPercent(prevPos[0]) + (50 / gridSize)}
					x2={posToPercent(participant.position[1]) + (50 / gridSize)}
					y2={posToPercent(participant.position[0]) + (50 / gridSize)}
					stroke={getParticipantColor(participant.id)}
					stroke-width="0.3"
					stroke-opacity="0.6"
					marker-end="url(#arrowhead-{participant.id})"
					vector-effect="non-scaling-stroke"
				/>
				<!-- Arrow marker -->
				<defs>
					<marker
						id="arrowhead-{participant.id}"
						markerWidth="10"
						markerHeight="10"
						refX="8"
						refY="3"
						orient="auto"
						markerUnits="strokeWidth"
					>
						<polygon
							points="0 0, 10 3, 0 6"
							fill={getParticipantColor(participant.id)}
							opacity="0.6"
						/>
					</marker>
				</defs>
			{/if}
		{/each}

	{:else if session.currentPhase === 'walking' && config.mode === 'full-lines'}
		<!-- Show complete path for all participants -->
		{#each participants as participant}
			{@const positions = getParticipantHistory(participant.id)}
			{#if positions.length > 1}
				<polyline
					points={positions.map(pos =>
						`${posToPercent(pos[1]) + (50 / gridSize)},${posToPercent(pos[0]) + (50 / gridSize)}`
					).join(' ')}
					fill="none"
					stroke={getParticipantColor(participant.id)}
					stroke-width="0.3"
					stroke-opacity="0.5"
					stroke-linejoin="round"
					stroke-linecap="round"
					vector-effect="non-scaling-stroke"
				/>
			{/if}
		{/each}

	{:else if session.currentPhase === 'walking' && config.mode === 'full-dots'}
		<!-- Show dots for all historical positions -->
		{#each participants as participant}
			{@const positions = getParticipantHistory(participant.id)}
			{#each positions as pos, idx}
				{@const opacity = 0.2 + (idx / positions.length) * 0.5}
				{@const size = 0.4 + (idx / positions.length) * 0.6}
				<circle
					cx={posToPercent(pos[1]) + (50 / gridSize)}
					cy={posToPercent(pos[0]) + (50 / gridSize)}
					r={size}
					fill={getParticipantColor(participant.id)}
					opacity={opacity}
				/>
			{/each}
		{/each}

	{:else if session.currentPhase === 'walking' && config.mode === 'single-participant' && config.selectedParticipantId}
		<!-- Show trace for single selected participant -->
		{@const positions = getParticipantHistory(config.selectedParticipantId)}
		{#if positions.length > 1}
			<!-- Draw path -->
			<polyline
				points={positions.map(pos =>
					`${posToPercent(pos[1]) + (50 / gridSize)},${posToPercent(pos[0]) + (50 / gridSize)}`
				).join(' ')}
				fill="none"
				stroke={getParticipantColor(config.selectedParticipantId)}
				stroke-width="0.5"
				stroke-opacity="0.7"
				stroke-linejoin="round"
				stroke-linecap="round"
				vector-effect="non-scaling-stroke"
			/>
			<!-- Draw dots at each position -->
			{#each positions as pos, idx}
				{@const opacity = 0.3 + (idx / positions.length) * 0.7}
				{@const size = 0.5 + (idx / positions.length) * 0.8}
				<circle
					cx={posToPercent(pos[1]) + (50 / gridSize)}
					cy={posToPercent(pos[0]) + (50 / gridSize)}
					r={size}
					fill={getParticipantColor(config.selectedParticipantId)}
					opacity={opacity}
					stroke="white"
					stroke-width="0.1"
					vector-effect="non-scaling-stroke"
				/>
			{/each}
		{/if}
	{/if}
</svg>
