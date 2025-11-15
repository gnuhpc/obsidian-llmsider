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

		// Disable input while streaming
		if (this.inputElement) {
			this.inputElement.disabled = true;
		}

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

		// Re-enable input
		if (this.inputElement) {
			this.inputElement.disabled = false;
		}
	}

	/**
	 * Reset button states after streaming completes
	 */
	resetButtonStates(): void {
		this.isStreaming = false;
		this.streamController = undefined;
		this.sendButton.style.display = 'inline-block';
		this.stopButton.style.display = 'none';

		// Re-enable input
		if (this.inputElement) {
			this.inputElement.disabled = false;
		}
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
}