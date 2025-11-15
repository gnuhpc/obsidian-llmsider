"use strict";
// Core type definitions for LLMSider plugin
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.ACTION_MODAL_TYPE = exports.CHAT_VIEW_TYPE = void 0;
// ============================================================================
// Constants and Enums
// ============================================================================
exports.CHAT_VIEW_TYPE = 'llmsider-chat-view';
exports.ACTION_MODAL_TYPE = 'llmsider-action-modal';
exports.DEFAULT_SETTINGS = {
    // New architecture
    connections: [],
    models: [],
    activeConnectionId: '',
    activeModelId: '',
    // Legacy (for migration)
    providers: [],
    activeProvider: '',
    agentMode: false, // Default to false (basic Q&A mode)
    showSidebar: true,
    sidebarPosition: 'right',
    i18n: {
        language: 'en', // Default to English, will be auto-detected on first load
        initialized: false, // Will be set to true after first language detection
    },
    chatSessions: [],
    maxChatHistory: 50,
    nextSessionId: 1, // Start auto-incrementing from 1
    customPrompts: [],
    mcpSettings: {
        serversConfig: {
            mcpServers: {}
        },
        serverPermissions: {},
        enableToolSuggestions: true,
        enableResourceBrowsing: true,
    },
    builtInToolsPermissions: {}, // All tools enabled by default
    toolAutoExecute: {}, // Tool-specific auto-execute settings
    autocomplete: {
        enabled: true, // Default enabled
        granularity: 'phrase',
        tone: 'professional',
        domain: 'general',
        triggerDelay: 500,
        maxSuggestions: 1
    },
    inlineQuickChat: {
        enabled: false, // Default disabled
        triggerKey: 'Mod+/',
        showOnSelection: false,
        enableDiffPreview: true // Default enabled for diff preview
    },
    debugMode: false,
    enableDiffRenderingInActionMode: false, // Default to disabled
    requireConfirmationForTools: true, // Default to true - require confirmation before executing tools
    enableTelemetry: false,
    rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 10000,
    },
};
