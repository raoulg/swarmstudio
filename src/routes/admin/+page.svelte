<script lang="ts">
	import AdminPanel from '$lib/components/AdminPanel.svelte';
	import ParticipantList from '$lib/components/ParticipantList.svelte';
	// Removed Grid import since grid is now on overview page
	import { eventLog, isAdminView, latestSession } from '$lib/stores/sessionStore';
	import { onMount } from 'svelte';

	onMount(() => {
		isAdminView.set(true);
	});
</script>

<svelte:head>
	<title>Admin Dashboard | SwarmCraft</title>
</svelte:head>

<main class="grid lg:grid-cols-2 gap-6 p-6 h-screen">
	<!-- Left Column: Admin Controls -->
	<div class="lg:col-span-1 flex flex-col gap-6">
		<!-- Session Info Display -->
		{#if $latestSession}
			<div class="card bg-primary/20 border border-primary/50">
				<h3 class="text-xl font-bold mb-2 text-primary">Active Session</h3>
				<p class="text-sm">Share this code with participants to join:</p>
				<div class="text-center bg-base-300 p-3 my-3 rounded-lg">
					<strong class="text-4xl font-mono tracking-widest text-white">
						{$latestSession.code}
					</strong>
				</div>
				<p class="text-xs text-base-content/60">Session ID: {$latestSession.id}</p>
				<div class="mt-2 text-sm">
					<p class="text-blue-400">📺 Show overview screen on beamer:</p>
					<p class="font-mono text-xs bg-gray-800 p-2 rounded">
						http://localhost:5173/overview/{$latestSession.id}
					</p>
				</div>
			</div>
		{/if}

		<AdminPanel />
	</div>

	<!-- Right Column: Event Log and Quick Info -->
	<div class="lg:col-span-1 flex flex-col gap-6">
		<div class="card flex-grow overflow-y-auto">
			<h3 class="text-xl font-bold mb-2">Event Log</h3>
			<div class="font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
				{#each $eventLog as log (log.id)}
					<div>
						<span class="text-gray-500">{log.timestamp}</span>
						<span class="ml-2">{log.message}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Quick Instructions -->
		<div class="card bg-blue-900/20 border border-blue-500/50">
			<h3 class="text-lg font-bold mb-2 text-blue-400">Setup Instructions</h3>
			<div class="text-sm space-y-2">
				<div>📱 <strong>Participants:</strong> Join with session code</div>
				<div>📺 <strong>Beamer:</strong> Open /overview for grid display</div>
				<div>👟 <strong>Walk:</strong> Participants see movement instructions</div>
				<div>🎯 <strong>Reveal:</strong> Participants see their fitness scores</div>
			</div>
		</div>
	</div>
</main>
