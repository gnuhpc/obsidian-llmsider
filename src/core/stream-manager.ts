export class StreamManager {
	private isStreaming: boolean = false;
	private streamController?: AbortController;
	private sendButton: HTMLElement;
	private stopButton: HTMLElement;
	private inputElement: HTMLTextAreaElement;

	constructor(sendButton: HTMLElement, stopButton: HTMLElement, inputElement: HTMLTextAreaElement) {
		this.sendButton = sendButton;
		this.stopButton = stopButton;
		this.inputElement = inputElement;
	}

	/**
	 * Start streaming mode - show stop button, hide send button
	 */
	startStreaming(): AbortController {
		this.isStreaming = true;
		this.streamController = new AbortController();
		this.sendButton.style.display = 'none';
		this.stopButton.style.display = 'inline-block';

		// Keep input enabled during streaming so user can type
		// if (this.inputElement) {
		// 	this.inputElement.disabled = true;
		// }

		return this.streamController;
	}

	/**
	 * Stop streaming mode - show send button, hide stop button
	 */
	stopStreaming(): void {
		this.isStreaming = false;

		// Abort ongoing stream
		if (this.streamController) {
			this.streamController.abort();
			this.streamController = undefined;
		}

		// Reset button states
		this.sendButton.style.display = 'inline-block';
		this.stopButton.style.display = 'none';

		// Input already enabled, no need to re-enable
		// if (this.inputElement) {
		// 	this.inputElement.disabled = false;
		// }
	}

	/**
	 * Reset button states after streaming completes
	 */
	resetButtonStates(): void {
		this.isStreaming = false;
		this.streamController = undefined;
		this.sendButton.style.display = 'inline-block';
		this.stopButton.style.display = 'none';

		// Input already enabled, no need to change
		// if (this.inputElement) {
		// 	this.inputElement.disabled = false;
		// }
	}

	/**
	 * Get current streaming state
	 */
	getIsStreaming(): boolean {
		return this.isStreaming;
	}

	/**
	 * Get current stream controller
	 */
	getStreamController(): AbortController | undefined {
		return this.streamController;
	}

	/**
	 * Set stop button click handler
	 */
	setStopHandler(handler: () => void): void {
		this.stopButton.onclick = handler;
	}

	/**
	 * Pause streaming UI state without aborting the controller
	 * Used when waiting for user interaction (e.g. tool confirmation)
	 */
	pauseStreaming(): void {
		this.isStreaming = false;
		
		// Update UI
		this.sendButton.style.display = 'inline-block';
		this.stopButton.style.display = 'none';

		// Re-enable input
		if (this.inputElement) {
			this.inputElement.disabled = false;
		}
	}

	/**
	 * Resume streaming UI state
	 * Used when user interaction is complete and agent resumes
	 */
	resumeStreaming(): void {
		this.isStreaming = true;
		
		// Update UI
		this.sendButton.style.display = 'none';
		this.stopButton.style.display = 'inline-block';

		// Keep input enabled - users should be able to type during streaming/tool execution
		// This is especially important for guided mode where users may want to add context
		// if (this.inputElement) {
		// 	this.inputElement.disabled = true;
		// }
	}
}