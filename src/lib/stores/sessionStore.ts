import { writable } from 'svelte/store';

// Define types for our state
export interface Participant {
	id: string;
	name: string;
	position?: [number, number];
	fitness?: number;
	velocity_magnitude?: number;
	color?: string;
	role?: string; // For future use (GWO, ABC)
}

export interface SessionConfig {
	grid_size: number;
	landscape_type: string;
}

export interface Session {
	id?: string;
	code?: string;
	status?: string;
	config?: SessionConfig;
	participants: Participant[];
	iteration?: number;
	currentPhase?: 'waiting' | 'walking' | 'revealing';
}
export interface LogEntry {
	id: string;
	timestamp: string;
	message: string;
	data?: unknown;
}

// Create stores
export const sessionState = writable<Session>({ participants: [] });
export const participantId = writable<string | null>(null);
export const eventLog = writable<LogEntry[]>([]);
export const isAdminView = writable<boolean>(false);

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper to add logs
export function logEvent(message: string, data?: unknown) {
	const newLog: LogEntry = {
		id: generateUUID(),
		timestamp: new Date().toLocaleTimeString(),
		message,
		data
	};
	eventLog.update((logs) => [newLog, ...logs.slice(0, 100)]);
}

export const latestSession = writable<{ code: string; id: string } | null>(null);

// let socket: WebSocket | null = null;

// export function connectWebSocket(sessionId: string, participantId: string) {
// 	if (socket) {
// 		socket.close();
// 	}
//
// 	// Adjust the URL if your server runs on a different port or path
// 	// This uses a different endpoint for the admin to distinguish from participants
// 	const wsUrl = `ws://localhost:8000/ws/session/${sessionId}/admin?participant_id=${participantId}`;
//
// 	socket = new WebSocket(wsUrl);
//
// 	socket.onopen = () => {
// 		logEvent(`Admin WebSocket connected for session ${sessionId}.`);
// 	};
//
// 	socket.onmessage = (event) => {
// 		const data = JSON.parse(event.data);
// 		logEvent('WebSocket message received', data);
//
// 		// This is the crucial part that updates your UI
// 		// It listens for a "STATE_UPDATE" message from the server
// 		// and replaces the sessionState with the new, complete state.
// 		if (data.type === 'STATE_UPDATE') {
// 			sessionState.set({
// 				id: data.payload.session_id,
// 				code: data.payload.session_code,
// 				status: data.payload.status,
// 				config: data.payload.config,
// 				participants: data.payload.participants,
// 				iteration: data.payload.iteration
// 			});
// 		}
// 	};
//
// 	socket.onerror = (error) => {
// 		console.error('WebSocket Error:', error);
// 		logEvent('WebSocket Error', error);
// 	};
//
// 	socket.onclose = () => {
// 		logEvent('WebSocket connection closed.');
// 	};
// }
