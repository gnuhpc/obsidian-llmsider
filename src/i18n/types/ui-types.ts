/**
 * UI elements translation types
 */

export interface ModalTranslation {
  title: string;
  message: string;
  confirm: string;
  cancel: string;
  close: string;
}

export interface ConversationModeTranslation {
  chat: string;
  chatDescription: string;
  planExecute: string;
  planExecuteDescription: string;
  guided: string;
  guidedDescription: string;
}

export interface UITranslation {
  // General UI
  loading: string;
  saving: string;
  saved: string;
  error: string;
  success: string;
  warning: string;
  info: string;

  // Buttons
  ok: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  add: string;
  remove: string;
  close: string;
  back: string;
  next: string;
  finish: string;
  retry: string;
  refresh: string;
  copy: string;
  paste: string;
  cut: string;
  undo: string;
  redo: string;

  // Form elements
  search: string;
  filter: string;
  sort: string;
  select: string;
  selectAll: string;
  deselectAll: string;
  clear: string;
  reset: string;
  apply: string;

  // Navigation
  home: string;
  settings: string;
  help: string;
  about: string;
  documentation: string;

  // Status indicators
  online: string;
  offline: string;
  connecting: string;
  connected: string;
  disconnected: string;
  enabled: string;
  disabled: string;
  active: string;
  inactive: string;

  // File operations
  file: string;
  folder: string;
  create: string;
  open: string;
  rename: string;
  move: string;
  duplicate: string;
  download: string;
  upload: string;

  // Validation messages
  required: string;
  invalid: string;
  tooShort: string;
  tooLong: string;
  mustBeNumber: string;
  mustBeEmail: string;
  mustBeUrl: string;

  // Confirmation dialogs
  confirmDelete: string;
  confirmDiscard: string;
  confirmOverwrite: string;
  unsavedChanges: string;

  // Empty states
  noData: string;
  noResults: string;
  noItems: string;
  emptyList: string;

  // Pagination
  page: string;
  of: string;
  perPage: string;
  previous: string;
  first: string;
  last: string;

  // Time
  today: string;
  yesterday: string;
  tomorrow: string;
  thisWeek: string;
  lastWeek: string;
  thisMonth: string;
  lastMonth: string;

  // Conversation modes
  conversationMode: ConversationModeTranslation;

  // Modals
  deleteConfirmModal: ModalTranslation;
  errorModal: ModalTranslation;

  // Chat interface
  newChat: string;
  clearChat: string;
  chatHistory: string;
  exportChat: string;
  importChat: string;

  // File reference
  attachFile: string;
  attachedFiles: string;
  removeFile: string;
  fileReference: string;

  // Provider selection
  selectProvider: string;
  selectModel: string;
  defaultProvider: string;

  // Streaming indicators
  thinking: string;
  generating: string;
  processing: string;

  // Diff view
  showDiff: string;
  hideDiff: string;
  originalContent: string;
  modifiedContent: string;

  // Code blocks
  copyCode: string;
  codeCopied: string;
  language: string;
  lineNumbers: string;

  // Context menu
  contextMenu: string;
  copyText: string;
  selectText: string;
  viewSource: string;

  // Toast notifications
  toastSuccess: string;
  toastError: string;
  toastWarning: string;
  toastInfo: string;
}
