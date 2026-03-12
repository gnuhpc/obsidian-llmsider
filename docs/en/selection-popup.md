# Selection Popup

## Overview

The Selection Popup is the floating action bar that appears when you select text in the editor, reading view, or supported web content.

It is designed for two fast actions:

- Send the selected text into LLMSider as context
- Open Quick Chat directly on the selected text

## What it does

When text selection is long enough, LLMSider can show action buttons near the selection instead of forcing you to open the full chat view first.

Current behavior in the codebase:

- Works with editor and reading view selections
- Handles drag-selection in reading view without triggering unwanted clicks
- Can detect selections inside supported webviewer content
- Can hide the `Add to Context` button when auto-reference is enabled
- Respects execution state and blocks adding context while a task is running

## Related settings

The popup behavior depends on two settings areas:

- `Selection Popup`: whether the popup actions are shown
- `Context Settings -> Auto Reference`: whether selected text is automatically injected into context

If auto-reference is enabled, LLMSider can switch from manual `Add to Context` to automatic context update for the active selection.

## Typical workflow

1. Select a paragraph in a note
2. Use the popup to add it to context or launch Quick Chat
3. Ask for rewrite, explanation, translation, or follow-up edits
4. Apply the generated diff if needed

## Related docs

- [Quick Chat](quick-chat.md)
- [Autocomplete](autocomplete.md)
- [Context Reference](context-reference.md)
- [Chat Interface](chat-interface.md)
