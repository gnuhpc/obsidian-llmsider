import { I18nManager } from '../../i18n/i18n-manager';
import { Logger } from '../../utils/logger';

/**
 * ToolButtonControls Component
 * Creates button controls for tool enable/disable and confirmation/auto-execute
 * Two square icon buttons that change their icon on click to represent state
 */
export class ToolButtonControls {
	constructor(private i18n: I18nManager) {}

	/**
	 * Create button controls for tool enable/disable and confirmation/auto-execute
	 */
	create(
		container: HTMLElement,
		isToolEnabled: boolean,
		requireConfirmation: boolean,
		onEnableChange: (enabled: boolean) => Promise<boolean>,
		onConfirmationChange: (requireConfirm: boolean) => Promise<void>
	): void {
		const buttonGroup = container.createDiv({ cls: 'llmsider-tool-button-group' });
		
		// Enable/Disable toggle button (single square icon button)
		const enableBtn = buttonGroup.createEl('button', {
			cls: 'llmsider-tool-icon-btn llmsider-tool-enable-btn',
			attr: { 
				'data-tooltip': isToolEnabled ? this.i18n.t('settingsPage.toolEnabledTooltip') : this.i18n.t('settingsPage.toolDisabledTooltip'),
				'aria-label': isToolEnabled ? this.i18n.t('settingsPage.toolEnabled') : this.i18n.t('settingsPage.toolDisabled')
			}
		});
		
		// Function to update enable button icon
		const updateEnableIcon = (enabled: boolean) => {
			if (enabled) {
				// Checkmark icon (enabled)
				enableBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
					<polyline points="22 4 12 14.01 9 11.01"></polyline>
				</svg>`;
			} else {
				// X icon (disabled)
				enableBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="15" y1="9" x2="9" y2="15"></line>
					<line x1="9" y1="9" x2="15" y2="15"></line>
				</svg>`;
			}
			enableBtn.classList.toggle('is-active', enabled);
			enableBtn.classList.toggle('is-inactive', !enabled);
			enableBtn.setAttribute('data-tooltip', enabled ? this.i18n.t('settingsPage.toolEnabledTooltip') : this.i18n.t('settingsPage.toolDisabledTooltip'));
			enableBtn.setAttribute('aria-label', enabled ? this.i18n.t('settingsPage.toolEnabled') : this.i18n.t('settingsPage.toolDisabled'));
			enableBtn.setAttribute('aria-pressed', String(enabled));
		};
		updateEnableIcon(isToolEnabled);
		
		enableBtn.addEventListener('click', async () => {
			Logger.debug('[ToolButtonControls] Enable button clicked, current state:', isToolEnabled);
			
			// Aggressively remove tooltip on click
			enableBtn.removeAttribute('data-tooltip');
			enableBtn.removeAttribute('aria-label');
			enableBtn.blur();
			
			// Trigger mouseout event to force tooltip to hide
			const mouseOutEvent = new MouseEvent('mouseout', {
				bubbles: true,
				cancelable: true,
				view: window
			});
			enableBtn.dispatchEvent(mouseOutEvent);
			
			// Also trigger mouseleave
			const mouseLeaveEvent = new MouseEvent('mouseleave', {
				bubbles: true,
				cancelable: true,
				view: window
			});
			enableBtn.dispatchEvent(mouseLeaveEvent);
			
			Logger.debug('[ToolButtonControls] Tooltip attributes removed and mouse events triggered');
			
			const newState = !isToolEnabled;
			const result = await onEnableChange(newState);
			
			// Only update state if callback returned true (success)
			if (result) {
				Logger.debug('[ToolButtonControls] State change successful, new state:', newState);
				isToolEnabled = newState;
				updateEnableIcon(newState);
				// Update confirmation button state
				this.setConfirmButtonEnabled(confirmBtn, newState);
				updateConfirmIcon(requireConfirmation);
			} else {
				Logger.debug('[ToolButtonControls] State change failed or cancelled');
				// Restore tooltip even if change failed
				enableBtn.setAttribute('data-tooltip', isToolEnabled ? this.i18n.t('settingsPage.toolEnabledTooltip') : this.i18n.t('settingsPage.toolDisabledTooltip'));
			}
		});

		// Confirmation/Auto toggle button (single square icon button)
		const confirmBtn = buttonGroup.createEl('button', {
			cls: 'llmsider-tool-icon-btn llmsider-tool-confirm-btn',
			attr: { 
				'data-tooltip': requireConfirmation ? this.i18n.t('settingsPage.confirmationRequiredTooltip') : this.i18n.t('settingsPage.autoExecuteTooltip'),
				'aria-label': requireConfirmation ? this.i18n.t('settingsPage.confirmationRequired') : this.i18n.t('settingsPage.autoExecute')
			}
		});
		
		// Function to update confirmation button icon
		const updateConfirmIcon = (needConfirm: boolean) => {
			if (needConfirm) {
				// Shield/warning icon (requires confirmation)
				confirmBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
					<path d="M12 8v4"></path>
					<path d="M12 16h.01"></path>
				</svg>`;
			} else {
				// Lightning bolt icon (auto execute)
				confirmBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
				</svg>`;
			}
			confirmBtn.classList.toggle('is-active', needConfirm);
			confirmBtn.classList.toggle('is-inactive', !needConfirm);
			confirmBtn.setAttribute('data-tooltip', needConfirm ? this.i18n.t('settingsPage.confirmationRequiredTooltip') : this.i18n.t('settingsPage.autoExecuteTooltip'));
			confirmBtn.setAttribute('aria-label', needConfirm ? this.i18n.t('settingsPage.confirmationRequired') : this.i18n.t('settingsPage.autoExecute'));
			confirmBtn.setAttribute('aria-pressed', String(needConfirm));
		};

		this.setConfirmButtonEnabled(confirmBtn, isToolEnabled);
		updateConfirmIcon(requireConfirmation);
		
		confirmBtn.addEventListener('click', async () => {
			if (!isToolEnabled) return;
			const newState = !requireConfirmation;
			await onConfirmationChange(newState);
			requireConfirmation = newState;
			updateConfirmIcon(newState);
		});
		
		// Tooltip functionality
		[enableBtn, confirmBtn].forEach(btn => {
			let tooltip: HTMLElement | null = null;
			btn.addEventListener('mouseenter', () => {
				const tooltipText = btn.getAttribute('data-tooltip');
				if (tooltipText) {
					tooltip = document.body.createDiv({ cls: 'llmsider-tooltip' });
					tooltip.textContent = tooltipText;
					tooltip.style.cssText = `
						position: fixed;
						background: var(--background-secondary);
						color: var(--text-normal);
						padding: 6px 10px;
						border-radius: 4px;
						font-size: 12px;
						box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
						z-index: 9999;
						max-width: 250px;
						pointer-events: none;
						border: 1px solid var(--background-modifier-border);
						white-space: nowrap;
					`;
					const rect = btn.getBoundingClientRect();
					tooltip.style.left = `${rect.left}px`;
					tooltip.style.top = `${rect.bottom + 5}px`;
				}
			});
			btn.addEventListener('mouseleave', () => {
				if (tooltip) {
					tooltip.remove();
					tooltip = null;
				}
			});
		});
	}

	private setConfirmButtonEnabled(button: HTMLButtonElement, enabled: boolean): void {
		button.disabled = !enabled;
		button.classList.toggle('is-disabled-control', !enabled);
	}
}
