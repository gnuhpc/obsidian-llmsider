# Conversation Modes

## Overview

LLMSider has:

- `Normal`
- `Agent`
- `Superpower` as a toggle inside `Normal`

## Normal Mode

Normal mode is the default conversation flow.

It supports:

- direct chat
- writing help
- optional tool use

If built-in tools, MCP tools, and skills are all disabled, Normal mode still works as plain chat.

## Superpower

Superpower is an advanced interaction layer on top of Normal mode, managed by a dedicated orchestrator.

It features:

- **Interactive Workflow**: Step-by-step follow-up questions and guidance.
- **Robustness**: Advanced error handling and automatic retry mechanisms.
- **Choice Rendering**: Native `CHOICE` option rendering for user selection.
- **Tool Integration**: Seamlessly executes tools while keeping the user informed.
- **Pure Guidance**: Works even when all tools/skills are disabled, acting as a structured dialogue.

Important behavior:

- Superpower remains focused on the initial user goal throughout the multi-step flow.
- It provides a more "human-like" interaction compared to the autonomous Agent mode.

## Agent Mode

Agent mode is for autonomous multi-step execution with the currently enabled tools.
