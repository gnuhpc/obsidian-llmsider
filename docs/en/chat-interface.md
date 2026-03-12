# Chat Interface

## Overview

The chat view is the main workspace for LLMSider conversations.

## Main controls

Top Area (Header):

- **Session Title**: Displays current session name. Click to edit and rename.
- **Clear Chat**: 🗑️ Removes all messages in the current session while keeping the session metadata.
- **New Chat**: ➕ Starts a fresh conversation session.
- **History**: 🕒 Toggles the Chat History sidebar to browse past conversations.
- **Settings**: ⚙️ Opens the LLMSider configuration page.

Input Area & Toolbar:

- **Attach/Context**: 📎 Click to add the current note, selected text, folders, or web content into the AI context.
- **Conversation Mode**: Switch between **Normal** (direct chat) and **Agent** (autonomous tool execution) modes.
- **Superpower Toggle**: (S icon) Enable step-by-step guidance and interactive goal-seeking.
- **Skill Selector**: ✨ Select a specialized Skill to apply specific prompt logic or behavior patterns.
- **Built-in Tools**: 🔧 Manage permissions for native tools like web search, note operations, and calculations.
- **MCP Control**: 🔌 Manage Model Context Protocol servers to extend AI abilities with external services.
- **Local Search**: 🔍 Toggle real-time semantic search over your vault for context enhancement.
- **Speed Reading**: 📖 Open a smart analysis drawer for the current active note (summaries, mind maps, etc.).
- **Optimize Prompt**: 🪄 Automatically rethink and enhance your input for better AI results.
- **Model Selector**: Quickly switch between configured AI providers and specific models.
- **Send / Stop**: ⬆️ Send your message or ⏹️ halt the current AI generation process.

Message Actions:

- **Edit**: ✏️ Edit your previous message to modify the context or query.
- **Copy**: 📋 Copy message content to clipboard.
- **Regenerate**: 🔄 Request the AI to generate a new response for the same query.
- **Compare**: ➕ Add a comparison tab to see how other models respond to the same message.
- **Process Diff**: 🛠️ (For file operations) Review and apply changes proposed by the AI.

Context Suggestions:

- **Confirm**: ✓ Add a suggested relevant file to the current conversation context.
- **Dismiss**: ✕ Ignore the suggestion and hide the recommendation.

## Conversation modes in UI

The current UI exposes:

- `Normal`
- `Superpower` toggle inside Normal
- `Agent`

## Tool behavior

In `Normal` mode, tool usage is optional.

If built-in tools, MCP tools, and skills are all disabled, the chat still works as plain model conversation.

If `Superpower` is enabled, it should still render guided choices even with no tools available.
