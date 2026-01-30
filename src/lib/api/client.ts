import {
	sessionState,
	latestSession,
	participantId,
	logEvent,
	addPositionToHistory,
	clearPositionHistory
} from '$lib/stores/sessionStore';
import { get } from 'svelte/store';
import {
	saveParticipantSession,
	loadParticipantSession,
	clearParticipantSession,
	type ParticipantSessionData
} from './localStorage';

// Use environment variable or fallback to localhost for development
const API_HOST = import.meta.env.VITE_API_HOST || 'http://localhost:8000';
export const API_BASE_URL = `${API_HOST}/api`;
const WS_BASE_URL = API_HOST.replace('http', 'ws');

let websocket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

// --- Types ---
export interface SessionSummary {
	session_id: string;
	session_code: string;
	status: string;
	participant_count: number;
	created_at: string;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- WebSocket Management ---
export function connectWebSocket(sessionId: string, partId: string, isReconnect: boolean = false) {
	if (websocket) {
		websocket.close();
	}

	const url = `${WS_BASE_URL}/ws/${sessionId}/${partId}`;
	websocket = new WebSocket(url);

	websocket.onopen = () => {
		reconnectAttempts = 0; // Reset on successful connection
		const message = isReconnect ? 'WebSocket reconnected' : 'WebSocket connected';
		logEvent(`${message} for ${partId}`);
	};

	websocket.onmessage = (event) => {
		const data = JSON.parse(event.data);
		console.log(`=== WEBSOCKET MESSAGE RECEIVED ===`);
		console.log('Timestamp:', new Date().toISOString());
		console.log('Message type:', data.type);
		console.log('Participant ID:', partId);
		console.log('Full message:', data);
		logEvent(`WS Received: ${data.type}`, data);

		// Handle different message types from the backend
		switch (data.type) {
			case 'session_reset':
				// ONLY reset should do complete replacement
				console.log('=== COMPLETE RESET ===');
				sessionState.set(data.session);
				// Clear localStorage on session reset
				clearParticipantSession();
				// Clear position history
				clearPositionHistory();
				break;

			case 'session_state':
			case 'session_started':
				// Smart merge - preserve currentPhase and other client state
				console.log('=== SMART SESSION UPDATE ===');
				console.log('Received data.session:', data.session);
				console.log('Current sessionState before update:', get(sessionState));

				sessionState.update((currentState) => ({
					...data.session,
					// Preserve client-side phase state unless server explicitly sets it
					currentPhase: data.session.currentPhase || currentState.currentPhase
				}));
				break;

			case 'swarm_update':
				console.log('=== SWARM UPDATE to walking phase ===');
				console.log('Number of participants in update:', data.participants?.length);

				// Track position changes for all participants
				if (data.participants) {
					data.participants.forEach((participant: any) => {
						if (participant.position) {
							console.log(`Adding position for ${participant.id}: [${participant.position}]`);
							addPositionToHistory(participant.id, participant.position, participant.color, data.iteration);
						} else {
							console.log(`Participant ${participant.id} has no position`);
						}
					});
				} else {
					console.log('No participants in swarm_update message');
				}

				sessionState.update((s) => ({
					...s,
					iteration: data.iteration,
					participants: data.participants,
					currentPhase: 'walking' // Set phase when walk happens
				}));
				break;

			case 'reveal_fitness':
				console.log('=== revealing triggered ===');
				sessionState.update((s) => ({
					...s,
					currentPhase: 'revealing',
					lastUpdate: data.timestamp
				}));
				break;

			case 'participant_joined':
			case 'participant_reconnected':
				console.log(`=== ${data.type.toUpperCase()} DEBUG ===`);
				console.log('Raw message data:', data);
				console.log('data.participants:', data.participants);
				console.log('Current sessionState before update:', get(sessionState));

				const action = data.type === 'participant_reconnected' ? 'reconnected' : 'joined';
				console.log(`Participant ${data.participant_id} ${action} - updating participants list`);

				// Update session state with new participants list
				if (data.participants) {
					sessionState.update((s) => ({
						...s,
						participants: data.participants
					}));
				}
				break;

			case 'participant_connected':
			case 'participant_disconnected':
				console.log(`=== ${data.type.toUpperCase()} ===`);
				console.log(`Participant ${data.participant_id} connection status changed`);
				// Could update UI to show connection status if needed
				break;

			case 'participant_moved':
				// Track position change
				if (data.position) {
					// Get current color for history
					const currentP = get(sessionState).participants.find(p => p.id === data.participant_id);
					addPositionToHistory(data.participant_id, data.position, currentP?.color);
				}

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

		// Attempt to reconnect if this was an unexpected disconnect
		const savedSession = loadParticipantSession();
		if (savedSession && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
			reconnectAttempts++;
			const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
			logEvent(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

			setTimeout(() => {
				if (!websocket) { // Only reconnect if still disconnected
					connectWebSocket(savedSession.sessionId, savedSession.participantId, true);
				}
			}, delay);
		}
	};

	websocket.onerror = (err) => {
		logEvent('WebSocket error', err);
	};
}

export function connectAdminWebSocket(sessionId: string) {
	// Generate a unique ID for the admin's WebSocket connection
	const adminId = `admin_${generateUUID()}`;
	logEvent(`Admin connecting to WebSocket for session ${sessionId}`);
	connectWebSocket(sessionId, adminId);
}

// --- Core API Functions ---
// Configuration constants - should match backend swarmcraft/config.py
const DEFAULT_GRID_SIZE = 25;

export async function createSession(adminKey: string, landscape: string, iterations: number, gridSize: number = DEFAULT_GRID_SIZE) {
	const response = await fetch(`${API_BASE_URL}/admin/create-session`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
		body: JSON.stringify({
			landscape_type: landscape,
			grid_size: gridSize,
			max_participants: 50,
			max_iterations: iterations,
			min_exploration_probability: 0.01,
			exploration_probability: 0.2
		})
	});
	if (!response.ok) throw new Error('Failed to create session');
	return response.json();
}

export async function joinSession(sessionCode: string, savedParticipantId?: string) {
	const body = savedParticipantId ? JSON.stringify({ participant_id: savedParticipantId }) : '{}';

	const response = await fetch(`${API_BASE_URL}/join/${sessionCode}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body
	});

	if (!response.ok) throw new Error('Failed to join session');
	const data = await response.json();

	// Save to localStorage
	const sessionData: ParticipantSessionData = {
		sessionId: data.session_id,
		sessionCode: sessionCode,
		participantId: data.participant_id,
		participantName: data.participant_name,
		joinedAt: new Date().toISOString()
	};
	saveParticipantSession(sessionData);

	// Update store
	participantId.set(data.participant_id);

	// Connect to WebSocket after successfully joining
	connectWebSocket(data.session_id, data.participant_id, data.is_reconnect || false);

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
	// Note: localStorage is cleared via WebSocket 'session_reset' message handler
	return response.json();
}

// Re-export localStorage utilities for convenience
export { loadParticipantSession, saveParticipantSession, clearParticipantSession } from './localStorage';

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
