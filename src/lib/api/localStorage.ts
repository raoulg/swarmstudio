/**
 * LocalStorage utilities for persisting participant session data
 */

export interface ParticipantSessionData {
	sessionId: string;
	sessionCode: string;
	participantId: string;
	participantName: string;
	joinedAt: string;
}

const STORAGE_KEY = 'swarmcraft_participant';

/**
 * Save participant session data to localStorage
 */
export function saveParticipantSession(data: ParticipantSessionData): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		console.log('Saved to localStorage:', data);
	} catch (error) {
		console.error('Failed to save to localStorage:', error);
	}
}

/**
 * Load participant session data from localStorage
 */
export function loadParticipantSession(): ParticipantSessionData | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return null;

		const data = JSON.parse(stored) as ParticipantSessionData;
		console.log('Loaded from localStorage:', data);
		return data;
	} catch (error) {
		console.error('Failed to load from localStorage:', error);
		return null;
	}
}

/**
 * Clear participant session data from localStorage
 */
export function clearParticipantSession(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
		console.log('Cleared localStorage');
	} catch (error) {
		console.error('Failed to clear localStorage:', error);
	}
}

/**
 * Check if a saved session matches the given session code
 */
export function hasSavedSession(sessionCode?: string): boolean {
	const saved = loadParticipantSession();
	if (!saved) return false;
	if (!sessionCode) return true;
	return saved.sessionCode === sessionCode;
}
