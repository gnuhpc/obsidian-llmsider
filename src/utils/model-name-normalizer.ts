/**
 * Normalize provider-facing model IDs.
 * Display names are user friendly, but provider APIs usually require exact IDs.
 */
export function normalizeProviderModelName(providerType: string, modelName: string): string {
	const normalized = modelName.trim();
	if (providerType !== 'qwen') {
		return normalized;
	}

	return normalizeQwenModelName(normalized);
}

export function normalizeQwenModelName(modelName: string): string {
	return modelName.trim().toLowerCase();
}
