import { sessionState, latestSession } from '$lib/stores/sessionStore';
import { API_BASE_URL, type SessionSummary } from './client';

// Session Management Functions
export async function listSessions(adminKey: string) {
	const response = await fetch(`${API_BASE_URL}/admin/sessions`, {
		headers: { 'X-Admin-Key': adminKey }
	});
	if (!response.ok) throw new Error('Failed to list sessions');
	return response.json();
}

export async function deleteSession(adminKey: string, sessionId: string) {
	console.log(`Deleting session ${sessionId} with admin key: ${adminKey.substring(0, 8)}...`);
	const response = await fetch(`${API_BASE_URL}/admin/session/${sessionId}`, {
		method: 'DELETE',
		headers: { 'X-Admin-Key': adminKey }
	});
	console.log(`Delete session response status: ${response.status}`);
	if (!response.ok) {
		const errorText = await response.text();
		console.error(`Failed to delete session: ${response.status} - ${errorText}`);
		throw new Error(`Failed to delete session: ${response.status} - ${errorText}`);
	}
	return response.json();
}

export async function handleDeleteSession(adminKey: string, session: SessionSummary, onSessionDeleted: () => Promise<void>) {
	console.log('=== handleDeleteSession called ===');
	console.log('adminKey:', adminKey ? adminKey.substring(0, 10) + '...' : 'EMPTY');
	console.log('session:', session);
	console.log('Proceeding with deletion...');

	try {
		await deleteSession(adminKey, session.session_id);
		console.log('Session deleted successfully, reloading session list...');
		await onSessionDeleted();

		// Clear current session if it's the one being deleted
		sessionState.update(state => {
			if (state.id === session.session_id) {
				latestSession.set(null);
				return { participants: [] };
			}
			return state;
		});

		alert(`Session ${session.session_code} deleted successfully!`);
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Unknown error occurred';
		alert(`Error deleting session: ${error}`);
	}
}

// Participant Management Functions
export async function removeParticipant(adminKey: string, sessionId: string, participantId: string) {
	try {
		console.log(`Removing participant ${participantId} from session ${sessionId}`);
		const response = await fetch(`${API_BASE_URL}/admin/session/${sessionId}/remove-participant`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Admin-Key': adminKey
			},
			body: JSON.stringify({ participant_id: participantId })
		});

		console.log(`Remove participant response status: ${response.status}`);
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Failed to remove participant: ${response.status} - ${errorText}`);
			throw new Error(`Failed to remove participant: ${response.status} - ${errorText}`);
		}

		const result = await response.json();
		console.log(`Participant ${participantId} removed successfully:`, result);
		alert(`Participant removed successfully!`);
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Unknown error occurred';
		alert(`Error removing participant: ${error}`);
	}
}

// Session Control Functions
export async function handleReveal(adminKey: string, sessionId: string) {
	try {
		const response = await fetch(`${API_BASE_URL}/admin/session/${sessionId}/reveal`, {
			method: 'POST',
			headers: { 'X-Admin-Key': adminKey }
		});

		if (!response.ok) {
			console.log('Reveal endpoint not found, participants should handle this via WebSocket');
		}
	} catch (error) {
		console.log('Triggering reveal state for participants:', error);
	}
}

export async function handleStep(adminKey: string, sessionId: string, currentPhase: string, triggerStepFn: () => Promise<void>) {
	if (!sessionId) {
		alert('No active session');
		return;
	}

	// Determine next action based on current phase
	const nextAction = currentPhase === 'revealing' ? 'walk' : 'reveal';

	try {
		if (nextAction === 'walk') {
			// Trigger walk (swarm step)
			await triggerStepFn();
		} else {
			// Trigger reveal
			await handleReveal(adminKey, sessionId);
		}
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Unknown error occurred';
		alert(`Error during ${nextAction}: ${error}`);
	}
}
