// Simple logger for the lite version

export class Logger {
	private static debugEnabled = false;

	static setDebugEnabled(enabled: boolean): void {
		this.debugEnabled = enabled;
	}

	static debug(message: string, ...args: unknown[]): void {
		if (this.debugEnabled) {
			console.warn(`[LLMSider Debug] ${message}`, ...args);
		}
	}

	static info(message: string, ...args: unknown[]): void {
		console.warn(`[LLMSider] ${message}`, ...args);
	}

	static warn(message: string, ...args: unknown[]): void {
		console.warn(`[LLMSider Warning] ${message}`, ...args);
	}

	static error(message: string, ...args: unknown[]): void {
		console.error(`[LLMSider Error] ${message}`, ...args);
	}
}
