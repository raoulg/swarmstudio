import { writable } from 'svelte/store';

// Define types for our state
export interface Participant {
	id: string;
	name: string;
	position?: [number, number]; // Grid position [row, col]
	continuous_position?: [number, number]; // Actual continuous coordinates [x, y]
	fitness?: number;
	velocity_magnitude?: number;
	color?: string;
	role?: string; // For future use (GWO, ABC)
	emojis?: string[]; // Participant emojis
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

// Position history for tracing
export interface PositionHistoryEntry {
	position: [number, number];
	timestamp: number;
	iteration?: number;
	color?: string;
}

export interface ParticipantHistory {
	[participantId: string]: PositionHistoryEntry[];
}

export type TracingMode = 'none' | 'single-step' | 'full-lines' | 'full-dots' | 'single-participant';

export interface TracingConfig {
	mode: TracingMode;
	selectedParticipantId?: string;
	maxHistoryLength: number; // Maximum number of positions to keep
}

// Create stores
export const sessionState = writable<Session>({ participants: [] });
export const participantId = writable<string | null>(null);
export const eventLog = writable<LogEntry[]>([]);
export const isAdminView = writable<boolean>(false);

// Position history for tracing
export const participantHistory = writable<ParticipantHistory>({});

// Tracing config with localStorage sync
function createTracingConfigStore() {
	const STORAGE_KEY = 'swarmcraft_tracing_config';

	// Load initial value from localStorage
	const storedValue = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
	const initialValue: TracingConfig = storedValue
		? JSON.parse(storedValue)
		: { mode: 'none', maxHistoryLength: 100 };

	const store = writable<TracingConfig>(initialValue);

	// Subscribe to changes and save to localStorage
	if (typeof window !== 'undefined') {
		store.subscribe(value => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
			console.log('Tracing config updated:', value);
		});

		// Listen for changes in other tabs
		window.addEventListener('storage', (event) => {
			if (event.key === STORAGE_KEY && event.newValue) {
				const newValue = JSON.parse(event.newValue);
				console.log('Tracing config updated from another tab:', newValue);
				store.set(newValue);
			}
		});
	}

	return store;
}

export const tracingConfig = createTracingConfigStore();

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

// Helper to add position to history
export function addPositionToHistory(participantId: string, position: [number, number], color?: string, iteration?: number) {
	participantHistory.update((history) => {
		const participantPositions = history[participantId] || [];
		const newEntry: PositionHistoryEntry = {
			position,
			timestamp: Date.now(),
			iteration,
			color
		};

		// Add new position
		const updatedPositions = [...participantPositions, newEntry];

		// Limit history length (use fixed value to avoid subscription issues)
		const maxLength = 100;
		const trimmedPositions = updatedPositions.slice(-maxLength);

		const newHistory = {
			...history,
			[participantId]: trimmedPositions
		};

		console.log(`Position history updated for ${participantId}:`, {
			totalParticipants: Object.keys(newHistory).length,
			positionsForThisParticipant: trimmedPositions.length,
			latestPosition: position
		});

		return newHistory;
	});
}

// Helper to clear all history
export function clearPositionHistory() {
	participantHistory.set({});
}

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
