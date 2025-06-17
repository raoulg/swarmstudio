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
	const response = await fetch(`${API_BASE_URL}/admin/session/${sessionId}`, {
		method: 'DELETE',
		headers: { 'X-Admin-Key': adminKey }
	});
	if (!response.ok) throw new Error('Failed to delete session');
	return response.json();
}

export async function handleDeleteSession(adminKey: string, session: SessionSummary, onSessionDeleted: () => Promise<void>) {
	if (!confirm(`Delete session ${session.session_code}? This will disconnect all participants.`)) {
		return;
	}

	try {
		await deleteSession(adminKey, session.session_id);
		await onSessionDeleted();

		// Clear current session if it's the one being deleted
		sessionState.update(state => {
			if (state.id === session.session_id) {
				latestSession.set(null);
				return { participants: [] };
			}
			return state;
		});
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Unknown error occurred';
		alert(`Error deleting session: ${error}`);
	}
}

// Participant Management Functions
export async function removeParticipant(adminKey: string, sessionId: string, participantId: string) {
	if (!confirm('Remove this participant from the session?')) {
		return;
	}

	try {
		const response = await fetch(`${API_BASE_URL}/admin/session/${sessionId}/remove-participant`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Admin-Key': adminKey
			},
			body: JSON.stringify({ participant_id: participantId })
		});

		if (!response.ok) {
			throw new Error('Failed to remove participant');
		}

		console.log(`Participant ${participantId} removed`);
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
