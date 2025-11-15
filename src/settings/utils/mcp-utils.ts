/**
 * MCP Server Utilities
 * Helper functions for MCP server icon and command display
 */

/**
 * Get icon SVG for MCP server based on configuration
 */
export function getMCPServerIcon(serverConfig: any): string {
	// Check if it's a URL-based server first
	if (serverConfig.url) {
		try {
			const url = new URL(serverConfig.url);
			if (url.protocol === 'ws:' || url.protocol === 'wss:') {
				// WebSocket icon
				return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
				</svg>`;
			} else if (url.protocol === 'http:' || url.protocol === 'https:') {
				// HTTP/Streamable HTTP icon
				return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="2" y1="12" x2="22" y2="12"></line>
					<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
				</svg>`;
			}
		} catch (error) {
			// Invalid URL, fall through to command-based detection
		}
	}

	// Try to determine icon based on command or server type
	const command = serverConfig.command?.toLowerCase() || '';

	// Python icon
	if (command.includes('python')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M12 2L2 7l10 5 10-5-10-5z"></path>
		<path d="M2 17l10 5 10-5"></path>
		<path d="M2 12l10 5 10-5"></path>
	</svg>`;
	
	// Node/NPM package icon
	if (command.includes('node') || command.includes('npm')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
		<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
		<polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
		<line x1="12" y1="22.08" x2="12" y2="12"></line>
	</svg>`;
	
	// Weather/cloud icon
	if (command.includes('weather')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
	</svg>`;
	
	// File/folder icon
	if (command.includes('file') || command.includes('fs')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
	</svg>`;
	
	// Git branch icon
	if (command.includes('git')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<line x1="6" y1="3" x2="6" y2="15"></line>
		<circle cx="18" cy="6" r="3"></circle>
		<circle cx="6" cy="18" r="3"></circle>
		<path d="M18 9a9 9 0 0 1-9 9"></path>
	</svg>`;
	
	// Web/globe icon
	if (command.includes('web') || command.includes('http')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="12" cy="12" r="10"></circle>
		<line x1="2" y1="12" x2="22" y2="12"></line>
		<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
	</svg>`;
	
	// Database icon
	if (command.includes('database') || command.includes('db')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
		<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
		<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
	</svg>`;

	// Default tool/wrench icon
	return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
	</svg>`;
}

/**
 * Get display command string for MCP server
 */
export function getMCPServerCommand(serverConfig: any): string {
	// Check if it's a URL-based server first
	if (serverConfig.url) {
		try {
			const url = new URL(serverConfig.url);
			if (url.protocol === 'ws:' || url.protocol === 'wss:') {
				return `WebSocket: ${url.host}`;
			} else if (url.protocol === 'http:' || url.protocol === 'https:') {
				return `Streamable HTTP: ${url.host}`;
			}
		} catch (error) {
			return `Invalid URL: ${serverConfig.url}`;
		}
	}

	// Handle command-based servers
	if (serverConfig.command) {
		const baseCommand = serverConfig.command.split(/[/\\]/).pop() || serverConfig.command;
		return baseCommand;
	}
	return 'Unknown command';
}
