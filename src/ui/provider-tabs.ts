import { setIcon } from 'obsidian';
import { LLMConnection, LLMModel } from '../types';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';

/**
 * Manager for provider selection modal
 * Used for multi-provider comparison feature
 */
export class ProviderTabsManager {
    private plugin: LLMSiderPlugin;
    private i18n: I18nManager;

    constructor(plugin: LLMSiderPlugin, _container: HTMLElement) {
        this.plugin = plugin;
        this.i18n = plugin.getI18nManager()!;
    }

    /**
     * Get connection type icon
     */
    private getConnectionTypeIcon(type: string): string {
        const icons: Record<string, string> = {
            'openai': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4"></circle>
                <line x1="21.17" y1="8" x2="12" y2="8"></line>
            </svg>`,
            'anthropic': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
            </svg>`,
            'gemini': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z"></path>
            </svg>`,
            'azure-openai': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z"></path>
            </svg>`
        };
        
        return icons[type] || icons['openai'];
    }

    /**
     * Show provider dropdown near the trigger button
     */
    showAddProviderModal(onSelect?: (providerId: string) => void, triggerButton?: HTMLElement): void {
        // Remove any existing dropdown
        const existingDropdown = document.querySelector('.llmsider-provider-dropdown-overlay');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Create dropdown overlay (for backdrop click)
        const overlay = document.body.createDiv({ cls: 'llmsider-provider-dropdown-overlay' });
        
        // Create dropdown container
        const dropdown = overlay.createDiv({ cls: 'llmsider-provider-dropdown' });
        
        // Position dropdown near the trigger button
        if (triggerButton) {
            const rect = triggerButton.getBoundingClientRect();
            const dropdownWidth = 280;
            const dropdownMaxHeight = 400;
            
            // Calculate position
            let left = rect.right + 8; // 8px gap to the right
            let top = rect.top;
            
            // Check if dropdown would overflow right edge
            if (left + dropdownWidth > window.innerWidth) {
                // Position to the left of button instead
                left = rect.left - dropdownWidth - 8;
            }
            
            // Check if dropdown would overflow bottom
            if (top + dropdownMaxHeight > window.innerHeight) {
                // Align to bottom
                top = Math.max(8, window.innerHeight - dropdownMaxHeight - 8);
            }
            
            dropdown.style.left = `${left}px`;
            dropdown.style.top = `${top}px`;
        }
        
        // Header
        const header = dropdown.createDiv({ cls: 'llmsider-provider-dropdown-header' });
        header.textContent = this.i18n.t('ui.selectProvider') || 'Select Provider';
        
        // Provider list
        const providerList = dropdown.createDiv({ cls: 'llmsider-provider-dropdown-list' });
        
        // Get all available providers
        const connections = this.plugin.settings.connections || [];
        const models = this.plugin.settings.models || [];
        
        if (connections.length === 0 || models.length === 0) {
            providerList.createDiv({ 
                cls: 'llmsider-provider-dropdown-empty',
                text: 'No providers configured.'
            });
            overlay.onclick = () => overlay.remove();
            return;
        }
        
        // Group by connection
        connections.forEach((connection: LLMConnection) => {
            const connectionModels = models.filter((m: LLMModel) => 
                m.connectionId === connection.id && m.enabled
            );
            
            if (connectionModels.length === 0) return;
            
            // Connection header
            const groupHeader = providerList.createDiv({ cls: 'llmsider-provider-dropdown-group' });
            groupHeader.textContent = connection.name;
            
            // Models
            connectionModels.forEach((model: LLMModel) => {
                const providerId = `${connection.id}::${model.id}`;
                
                const item = providerList.createDiv({ cls: 'llmsider-provider-dropdown-item' });
                
                // Icon
                const icon = item.createDiv({ cls: 'llmsider-provider-dropdown-icon' });
                icon.innerHTML = this.getConnectionTypeIcon(connection.type);
                
                // Info
                const info = item.createDiv({ cls: 'llmsider-provider-dropdown-info' });
                info.createDiv({ cls: 'llmsider-provider-dropdown-name', text: model.name });
                
                item.onclick = () => {
                    if (onSelect) {
                        onSelect(providerId);
                    }
                    overlay.remove();
                };
            });
        });
        
        // Close on background click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };
        
        // Prevent dropdown clicks from closing
        dropdown.onclick = (e) => {
            e.stopPropagation();
        };
    }
}
