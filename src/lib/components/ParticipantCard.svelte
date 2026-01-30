<script lang="ts">
	import type { Participant } from '$lib/stores/sessionStore';
	export let participant: Participant;
</script>

<div
	class="card flex flex-col gap-1 text-sm border-l-4"
	style="border-color: {participant.color ?? '#888'}"
>
	<div class="font-bold text-base">{participant.name}</div>
	<div>ID: <span class="font-mono text-xs">{participant.id}</span></div>
	{#if participant.position}
		<div>Grid: <span class="font-mono">[{participant.position.join(', ')}]</span></div>
	{/if}
	{#if participant.continuous_position}
		<div>Continuous: <span class="font-mono text-xs">({participant.continuous_position[0].toFixed(2)}, {participant.continuous_position[1].toFixed(2)})</span></div>
	{/if}
	{#if participant.fitness !== undefined}
		<div>Function: {participant.fitness.toFixed(3)}</div>
	{/if}
	{#if participant.velocity_magnitude !== undefined}
		<div>Speed: {participant.velocity_magnitude.toFixed(3)}</div>
	{/if}
</div>
