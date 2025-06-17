<script lang="ts">
	import AdminPanel from '$lib/components/AdminPanel.svelte';
	import ParticipantManagement from '$lib/components/ParticipantManagement.svelte';
	import { eventLog, isAdminView, latestSession } from '$lib/stores/sessionStore';
	import { onMount } from 'svelte';

	let adminKey = '';

	onMount(() => {
		isAdminView.set(true);
	});

	async function copyOverviewUrl(sessionId: string, event?: Event) {
		const url = `http://localhost:5173/overview/${sessionId}`;
		
		try {
			if (navigator.clipboard && window.isSecureContext) {
				// Modern approach - works in HTTPS and localhost
				await navigator.clipboard.writeText(url);
			} else {
				// Fallback for older browsers or non-secure contexts
				const textArea = document.createElement('textarea');
				textArea.value = url;
				textArea.style.position = 'fixed';
				textArea.style.left = '-999999px';
				textArea.style.top = '-999999px';
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				document.execCommand('copy');
				textArea.remove();
			}
			
			// Visual feedback
			const button = event?.target as HTMLButtonElement;
			if (button) {
				const originalText = button.textContent;
				button.textContent = '✅ Copied!';
				button.style.backgroundColor = '#16a34a'; // green
				setTimeout(() => {
					button.textContent = originalText;
					button.style.backgroundColor = ''; // reset
				}, 2000);
			}
		} catch (err) {
			console.error('Failed to copy URL:', err);
			alert('Failed to copy URL. Please copy manually.');
		}
	}
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
				<div class="text-center bg-base-300 p-2 my-2 rounded-lg">
					<strong class="text-2xl font-mono tracking-widest text-white">
						{$latestSession.code}
					</strong>
				</div>
				<p class="text-xs text-base-content/60">Session ID: {$latestSession.id}</p>
				<div class="mt-2 text-sm">
					<p class="text-blue-400 mb-1">📺 Show overview screen on beamer:</p>
					<div class="flex items-center gap-2">
						<p class="font-mono text-xs bg-gray-800 p-2 rounded flex-grow">
							http://localhost:5173/overview/{$latestSession.id}
						</p>
						<button 
							class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded transition-colors"
							on:click={(e) => copyOverviewUrl($latestSession.id, e)}
							title="Copy overview URL"
						>
							📋 Copy
						</button>
					</div>
				</div>
			</div>
		{/if}

		<AdminPanel bind:adminKey />
	</div>

	<!-- Right Column: Event Log, Participant Management, and Quick Info -->
	<div class="lg:col-span-1 flex flex-col gap-6">
		<!-- Participant Management -->
		<ParticipantManagement {adminKey} />

		<!-- Event Log -->
		<div class="card flex-grow overflow-y-auto">
			<h3 class="text-xl font-bold mb-2">Event Log</h3>
			<div class="font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
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
