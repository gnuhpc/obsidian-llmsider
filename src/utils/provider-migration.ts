/**
 * Provider migration utilities
 * Helper functions for working with Connection + Model architecture
 */

import { LLMConnection, LLMModel } from '../types';

/**
 * Get active connection and model from IDs
 */
export function getActiveConnectionAndModel(
	connections: LLMConnection[],
	models: LLMModel[],
	activeConnectionId: string,
	activeModelId: string
): { connection: LLMConnection | null; model: LLMModel | null } {
	const connection = connections.find(c => c.id === activeConnectionId) || null;
	const model = models.find(m => m.id === activeModelId) || null;

	return { connection, model };
}
