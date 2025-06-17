<script lang="ts">
	import { sessionState } from '$lib/stores/sessionStore';
	import { removeParticipant } from '$lib/api/adminActions';

	export let adminKey: string;
	$: {
		console.log('=== PARTICIPANT MANAGEMENT DEBUG ===');
		console.log('sessionState:', $sessionState);
		console.log('participants:', $sessionState.participants);
		console.log('participants length:', $sessionState.participants?.length);
	}

	async function handleRemoveParticipant(participantId: string) {
		if (!$sessionState.id) return;
		await removeParticipant(adminKey, $sessionState.id, participantId);
	}
</script>

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
						on:click={() => handleRemoveParticipant(participant.id)}
						class="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
						disabled={!adminKey}
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
