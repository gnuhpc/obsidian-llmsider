import type { I18nManager } from '../../i18n/i18n-manager';

/**
 * MCP Tool Details Modal - displays detailed information about an MCP tool
 */
export class MCPToolDetailsModal {
	constructor(private i18n: I18nManager) {}

	/**
	 * Show the MCP tool details modal
	 */
	show(tool: any): void {
		// Create modal overlay (same as built-in tools)
		const modal = document.createElement('div');
		modal.addClass('llmsider-modal-overlay');
		
		const modalContent = modal.createDiv({ cls: 'llmsider-modal-content' });
		
		// Modal header
		this.renderModalHeader(modalContent, tool, modal);
		
		// Modal body
		this.renderModalBody(modalContent, tool);
		
		// Close on overlay click
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				modal.remove();
			}
		});
		
		document.body.appendChild(modal);
	}

	/**
	 * Render the modal header with title and close button
	 */
	private renderModalHeader(modalContent: HTMLElement, tool: any, modal: HTMLElement): void {
		const modalHeader = modalContent.createDiv({ cls: 'llmsider-modal-header' });
		
		const modalTitle = modalHeader.createEl('h2', {
			text: tool.name,
			cls: 'llmsider-modal-title'
		});
		
		const closeBtn = modalHeader.createDiv({ cls: 'llmsider-modal-close' });
		closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="18" y1="6" x2="6" y2="18"></line>
			<line x1="6" y1="6" x2="18" y2="18"></line>
		</svg>`;
		closeBtn.addEventListener('click', () => modal.remove());
	}

	/**
	 * Render the modal body with tool details
	 */
	private renderModalBody(modalContent: HTMLElement, tool: any): void {
		const modalBody = modalContent.createDiv({ cls: 'llmsider-modal-body' });
		
		// Description
		if (tool.description) {
			modalBody.createEl('p', {
				text: tool.description,
				cls: 'llmsider-modal-description'
			});
		}
		
		// Server info section
		const serverInfo = modalBody.createDiv({ cls: 'llmsider-modal-server-info' });
		serverInfo.createEl('strong', { text: 'Server: ' });
		serverInfo.appendText(tool.server);
		
		// Show schema if available (same as built-in tools)
		if (tool.inputSchema) {
			this.renderInputSchema(modalBody, tool.inputSchema);
		}
	}

	/**
	 * Render the input schema section
	 */
	private renderInputSchema(modalBody: HTMLElement, inputSchema: any): void {
		const schemaSection = modalBody.createDiv({ cls: 'llmsider-modal-schema-section' });
		
		const schemaToggle = schemaSection.createEl('details', { cls: 'llmsider-schema-toggle' });
		schemaToggle.setAttribute('open', ''); // Auto-expand
		
		const schemaSummary = schemaToggle.createEl('summary', { cls: 'llmsider-schema-summary' });
		
		// Chevron icon
		schemaSummary.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="llmsider-schema-chevron">
			<polyline points="6 9 12 15 18 9"></polyline>
		</svg>`;
		schemaSummary.appendText(this.i18n.t('settingsPage.viewInputSchema'));
		
		const schemaContent = schemaToggle.createEl('pre', { cls: 'llmsider-schema-content' });
		schemaContent.textContent = JSON.stringify(inputSchema, null, 2);
	}
}
