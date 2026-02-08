/**
 * English translation - Main entry point
 * Import and merge translations from submodules
 */

import { enBase } from "./base";
import { enBuiltInPrompts } from "./built-in-prompts";
import { enCommon } from "./common";
import { enErrors } from "./errors";
import { enMCP } from "./mcp";
import { enStatus } from "./status";
import { enSuccess } from "./success";
import { enUI } from "./ui";
import { enSettings } from "./settings";
import { enTools } from "./tools";
import { enPlanExecute } from "./plan-execute";
import {
  enParameterNames,
  enToolCallPrompter,
  enAutocomplete,
  enQuickChat,
  enAutoSummarize,
  enSelectionPopup,
  enCommands,
  enQuickChatUI,
  enMermaid,
  enVectorDatabase,
} from "./misc";

export const en = {
  // Base translations
  ...enBase,

  // Settings page (from settings.ts)
  settingsPage: enSettings.settingsPage,

  // ChatView
  chatView: enUI.chatView,

  // Plan-Execute framework (from plan-execute.ts)
  planExecute: enPlanExecute.planExecute,

  // Tools translations
  tools: enTools,

  // Error messages
  errors: enErrors,

  // Success messages
  success: enSuccess,

  // Common UI elements
  common: enCommon,

  // UI elements
  ui: enUI,

  // MCP messages
  mcp: enMCP,

  // Tool parameter names
  parameterNames: enParameterNames,

  // Tool call prompter
  toolCallPrompter: enToolCallPrompter,

  // Autocomplete
  autocomplete: enAutocomplete,

  // Quick Chat
  quickChat: enQuickChat,

  // Auto-Summarize
  autoSummarize: enAutoSummarize,

  // Selection popup
  selectionPopup: enSelectionPopup,

  // Commands
  commands: enCommands,

  // Quick Chat UI
  quickChatUI: enQuickChatUI,

  // Mermaid diagrams
  mermaid: enMermaid,

  // Vector database
  vectorDatabase: enVectorDatabase,

  // Built-in prompts
  builtInPrompts: enBuiltInPrompts,

  // Status messages
  status: enStatus,

  // Notification messages (exported at top level for direct access)
  notifications: enSettings.notifications,
};
