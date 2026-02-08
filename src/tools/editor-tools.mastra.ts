/**
 * Editor Tools (Mastra Format)
 * 
 * File editing and workspace management tools for Obsidian
 * Provides operations for opening, creating, navigating, and editing files
 */

import { z } from 'zod';
import { App, TFile, WorkspaceLeaf, MarkdownView, Notice } from 'obsidian';
import { createMastraTool } from './tool-converter';
import { Logger } from './../utils/logger';

let globalApp: App | null = null;

export function setSharedFunctions(functions: {
	getApp: () => App;
}) {
	globalApp = functions.getApp();
}

function getApp(): App {
	if (!globalApp) {
		throw new Error('App instance not initialized. Call setSharedFunctions() first.');
	}
	return globalApp;
}
