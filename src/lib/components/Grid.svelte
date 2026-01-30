<script lang="ts">
	import { sessionState } from '$lib/stores/sessionStore';

	let gridSize = 25;
	let particles = [];

	sessionState.subscribe((s) => {
		gridSize = s.config?.grid_size ?? 25;
		particles = s.participants ?? [];
	});

	// Helper to determine which numbers to show to avoid crowding
	$: showEvery = gridSize > 15 ? 5 : 1;
	$: axisNumbers = Array.from({ length: gridSize }, (_, i) => i);
</script>

<div class="w-full max-w-[85vh] mx-auto p-16">
	<div class="relative aspect-square w-full">
		<!-- Y Axis Label -->
		<div class="absolute -left-16 top-0 h-full flex items-center justify-center">
			<span class="text-white/40 text-sm font-bold uppercase tracking-widest -rotate-90 whitespace-nowrap">Y Axis</span>
		</div>

		<!-- Y Axis Numbers -->
		<div class="absolute -left-8 top-0 h-full w-8">
			{#each axisNumbers as i}
				{#if i % showEvery === 0 || i === gridSize - 1}
					<div 
						class="absolute right-2 text-[12px] font-mono text-white/60 font-bold -translate-y-1/2"
						style="bottom: {(i + 0.5) * (100 / gridSize)}%"
					>
						{i}
					</div>
				{/if}
			{/each}
		</div>

		<!-- X Axis Label -->
		<div class="absolute -bottom-16 left-0 w-full flex items-center justify-center">
			<span class="text-white/40 text-sm font-bold uppercase tracking-widest whitespace-nowrap">X Axis</span>
		</div>

		<!-- X Axis Numbers -->
		<div class="absolute -bottom-8 left-0 w-full h-8">
			{#each axisNumbers as i}
				{#if i % showEvery === 0 || i === gridSize - 1}
					<div 
						class="absolute top-2 text-[12px] font-mono text-white/60 font-bold -translate-x-1/2"
						style="left: {(i + 0.5) * (100 / gridSize)}%"
					>
						{i}
					</div>
				{/if}
			{/each}
		</div>

		<!-- Grid Container -->
		<div class="w-full h-full relative bg-primary-dark rounded-xl shadow-2xl border border-secondary-dark/50 overflow-visible">
			<!-- Background Grid Lines (using CSS for performance) -->
			<div
				class="grid w-full h-full absolute inset-0 rounded-xl overflow-hidden"
				style="grid-template-columns: repeat({gridSize}, 1fr); grid-template-rows: repeat({gridSize}, 1fr);"
			>
				{#each Array(gridSize * gridSize) as _, i (i)}
					<div class="border-[0.5px] border-secondary-dark/20"></div>
				{/each}
			</div>

			<!-- Particles -->
			{#each particles as particle (particle.id)}
				{#if particle.position}
					<div
						class="particle absolute rounded-full transition-all duration-500 ease-in-out flex items-center justify-center text-xs font-bold text-white z-10 border border-white/40 shadow-lg"
						style="
							width: calc(100% / {gridSize});
							height: calc(100% / {gridSize});
							left: {particle.position[0] * (100 / gridSize)}%;
							bottom: {particle.position[1] * (100 / gridSize)}%;
							background-color: {particle.color ?? '#888'};
							box-shadow: 0 0 15px {particle.color ?? '#888'}AA;
						"
						title="{particle.name} (X: {particle.position[0]}, Y: {particle.position[1]})"
					>
						<span class="drop-shadow-md">{particle.name.substring(0, 1).toUpperCase()}</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

<style>
	.particle {
		will-change: left, bottom;
	}
</style>