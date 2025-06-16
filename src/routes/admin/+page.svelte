
<script lang="ts">
	import AdminPanel from '$lib/components/AdminPanel.svelte';
	import ParticipantList from '$lib/components/ParticipantList.svelte';
	import Grid from '$lib/components/Grid.svelte';
	// Import the new 'latestSession' store
	import { eventLog, isAdminView, latestSession } from '$lib/stores/sessionStore';
	import { onMount } from 'svelte';

	onMount(() => {
		isAdminView.set(true);
	});
</script>

<svelte:head>
	<title>Admin Dashboard | SwarmCraft</title>
</svelte:head>

<main class="grid lg:grid-cols-3 gap-6 p-6 h-screen">
	<div class="lg:col-span-1 flex flex-col gap-6">

		<!-- Add this UI block to display the new session info -->
		{#if $latestSession}
			<div class="card bg-primary/20 border border-primary/50">
				<h3 class="text-xl font-bold mb-2 text-primary">New Session Ready</h3>
				<p class="text-sm">Share this code with participants to join:</p>
				<div class="text-center bg-base-300 p-3 my-3 rounded-lg">
					<strong class="text-4xl font-mono tracking-widest text-white">
						{$latestSession.code}
					</strong>
				</div>
				<p class="text-xs text-base-content/60">Session ID: {$latestSession.id}</p>
			</div>
		{/if}

		<AdminPanel />

		<div class="card flex-grow overflow-y-auto">
			<h3 class="text-xl font-bold mb-2">Event Log</h3>
			<div class="font-mono text-xs space-y-1">
				{#each $eventLog as log (log.id)}
					<div>
						<span class="text-gray-500">{log.timestamp}</span>
						<span class="ml-2">{log.message}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="lg:col-span-1 flex flex-col gap-6">
		<h2 class="text-3xl font-bold text-center">Swarm Visualizer</h2>
		<Grid />
	</div>

	<div class="lg:col-span-1 flex flex-col">
		<ParticipantList />
	</div>
</main>
