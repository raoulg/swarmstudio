import { sessionState, latestSession, participantId, logEvent } from '$lib/stores/sessionStore';
import { get } from 'svelte/store';

const API_BASE_URL = 'http://localhost:8000/api';
const WS_BASE_URL = 'ws://localhost:8000';

let websocket: WebSocket | null = null;

// --- WebSocket Management ---
// Add to client.ts (or create a separate types file)
interface SessionSummary {
	session_id: string;
	session_code: string;
	status: string;
	participant_count: number;
	created_at: string;
}

export function connectWebSocket(sessionId: string, partId: string) {
	if (websocket) {
		websocket.close();
	}

	const url = `${WS_BASE_URL}/ws/${sessionId}/${partId}`;
	websocket = new WebSocket(url);

	websocket.onopen = () => {
		logEvent(`WebSocket connected for ${partId}`);
	};

	websocket.onmessage = (event) => {
		const data = JSON.parse(event.data);
		logEvent(`WS Received: ${data.type}`, data);

		// Handle different message types from the backend
		switch (data.type) {
			case 'session_state':
			case 'session_started':
			case 'session_reset':
				console.log('=== WEBSOCKET SESSION DATA ===');
				console.log('Received data.session:', data.session);
				console.log('Current sessionState before update:', sessionState);
				sessionState.set(data.session);
				break;
			case 'swarm_update':
				sessionState.update((s) => ({
					...s,
					iteration: data.iteration,
					participants: data.participants
				}));
				break;
			case 'participant_joined':
				console.log('=== PARTICIPANT_JOINED DEBUG ===');
				console.log('Raw message data:', data);
				console.log('data.participants:', data.participants);
				console.log('Current sessionState before update:', get(sessionState));
				sessionState.update((s) => ({
					...s,
					participants: data.participants
				}));
				break;
			case 'participant_moved':
				sessionState.update((s) => ({
					...s,
					participants: s.participants.map((p) =>
						p.id === data.participant_id
							? { ...p, position: data.position, fitness: data.fitness }
							: p
					)
				}));
				break;
			case 'session_closed':
				alert('The session has been closed by the admin.');
				websocket?.close();
				sessionState.set({ participants: [] });
				break;
		}
	};

	websocket.onclose = () => {
		logEvent('WebSocket disconnected');
		websocket = null;
	};

	websocket.onerror = (err) => {
		logEvent('WebSocket error', err);
	};
}

// --- API Functions ---

export async function createSession(adminKey: string, landscape: string, iterations: number) {
	const response = await fetch(`${API_BASE_URL}/admin/create-session`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
		body: JSON.stringify({
			landscape_type: landscape,
			grid_size: 25,
			max_participants: 50,
			max_iterations: iterations,
			min_exploration_probability: 0.01,
			exploration_probability: 0.2
		})
	});
	if (!response.ok) throw new Error('Failed to create session');
	return response.json();
}

export async function joinSession(sessionCode: string) {
	const response = await fetch(`${API_BASE_URL}/join/${sessionCode}`, { method: 'POST' });
	if (!response.ok) throw new Error('Failed to join session');
	const data = await response.json();
	participantId.set(data.participant_id);
	// Connect to WebSocket after successfully joining
	connectWebSocket(data.session_id, data.participant_id);
	return data;
}

export async function startSession(adminKey: string, sessionId: string) {
	const response = await fetch(`${API_BASE_URL}/admin/session/${sessionId}/start`, {
		method: 'POST',
		headers: { 'X-Admin-Key': adminKey }
	});
	if (!response.ok) throw new Error('Failed to start session');
	return response.json();
}

export async function triggerStep(adminKey: string, sessionId: string) {
	const response = await fetch(`${API_BASE_URL}/admin/session/${sessionId}/step`, {
		method: 'POST',
		headers: { 'X-Admin-Key': adminKey }
	});
	if (!response.ok) throw new Error('Failed to trigger step');
	return response.json();
}

export async function resetSession(adminKey: string, sessionId: string) {
	const response = await fetch(`${API_BASE_URL}/admin/session/${sessionId}/reset`, {
		method: 'POST',
		headers: { 'X-Admin-Key': adminKey }
	});
	if (!response.ok) throw new Error('Failed to reset session');
	return response.json();
}


export function connectAdminWebSocket(sessionId: string) {
	// Generate a unique ID for the admin's WebSocket connection
	const adminId = `admin_${crypto.randomUUID()}`;
	logEvent(`Admin connecting to WebSocket for session ${sessionId}`);
	connectWebSocket(sessionId, adminId);
}

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

export async function reconnectToSession(sessionData: SessionSummary) {
	sessionState.set({
		id: sessionData.session_id,
		code: sessionData.session_code,
		status: sessionData.status,
		participants: []
	});
	latestSession.set({ code: sessionData.session_code, id: sessionData.session_id });
	connectAdminWebSocket(sessionData.session_id);
}
