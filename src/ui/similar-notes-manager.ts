/**
 * Similar Notes View Manager
 * 相似笔记视图管理器 - 管理笔记底部的相似文档显示
 */

import { Component, MarkdownView, TFile, Workspace, Menu } from 'obsidian';
import { Logger } from './../utils/logger';
import { SimilarNote, SimilarNoteFinder } from '../vector/similarNoteFinder';
import LLMSiderPlugin from '../main';
import { I18nManager } from '../i18n/i18n-manager';

export class SimilarNotesViewManager extends Component {
  private plugin: LLMSiderPlugin;
  private workspace: Workspace;
  private i18n: I18nManager;
  private similarNoteFinder: SimilarNoteFinder | null = null;
  private activeViews: Map<string, HTMLElement> = new Map();
  private currentFile: TFile | null = null;

  constructor(plugin: LLMSiderPlugin, workspace: Workspace) {
    super();
    this.plugin = plugin;
    this.workspace = workspace;
    this.i18n = plugin.i18n;
    
    // Initialize similar note finder if vector DB is available
    const vectorDB = plugin.getVectorDBManager();
    if (vectorDB) {
      this.similarNoteFinder = new SimilarNoteFinder(vectorDB, plugin.app.vault);
    }
    
    // Clean up any orphaned similar notes containers from previous sessions
    this.cleanupOrphanedContainers();
  }
  
  private cleanupOrphanedContainers(): void {
    // Find and remove all similar notes containers in the DOM
    const orphanedContainers = document.querySelectorAll('.llmsider-similar-notes-container');
    orphanedContainers.forEach(container => {
      container.remove();
    });
  }

  async onFileOpen(file: TFile | null): Promise<void> {
    if (!file) {
      this.clearAllViews();
      return;
    }

    this.currentFile = file;
    
    // Check if similar notes feature is enabled
    if (!this.plugin.settings.vectorSettings.showSimilarNotes) {
      this.clearAllViews();
      return;
    }

    // Check if vector DB is ready
    if (!this.similarNoteFinder) {
      const vectorDB = this.plugin.getVectorDBManager();
      if (vectorDB) {
        this.similarNoteFinder = new SimilarNoteFinder(vectorDB, this.plugin.app.vault);
      } else {
        return;
      }
    }

    // Small delay to ensure the view is fully rendered
    setTimeout(() => {
      this.renderSimilarNotes(file);
    }, 100);
  }

  private async renderSimilarNotes(file: TFile): Promise<void> {
    if (!this.similarNoteFinder) return;

    try {
      // First, clear ALL existing similar notes views to prevent duplicates
      this.clearAllViews();
      
      // Find all markdown views displaying this file
      const leaves = this.workspace.getLeavesOfType('markdown');
      let targetView: MarkdownView | null = null;
      
      for (const leaf of leaves) {
        const view = leaf.view as MarkdownView;
        if (view.file && view.file.path === file.path) {
          targetView = view;
          break;
        }
      }
      
      if (!targetView) return;
      
      // Show loading state
      const loadingContainer = this.createLoadingView();
      const contentEl = targetView.contentEl;
      if (contentEl.firstChild) {
        contentEl.insertBefore(loadingContainer, contentEl.firstChild);
      } else {
        contentEl.appendChild(loadingContainer);
      }
      this.activeViews.set(file.path, loadingContainer);
      
      // Find similar notes
      const similarNotes = await this.similarNoteFinder.findSimilarNotes(file, 5);
      
      // Remove loading view
      loadingContainer.remove();
      
      // Only show if there are similar notes
      if (similarNotes.length === 0) {
        this.activeViews.delete(file.path);
        return;
      }
      
      // Deduplicate similar notes by file path
      const uniqueNotes = new Map<string, SimilarNote>();
      for (const note of similarNotes) {
        if (!uniqueNotes.has(note.path)) {
          uniqueNotes.set(note.path, note);
        }
      }
      const deduplicatedNotes = Array.from(uniqueNotes.values());
      
      // Create and insert the similar notes view at the top of the content
      const container = this.createSimilarNotesView(file, deduplicatedNotes);
      
      if (contentEl.firstChild) {
        contentEl.insertBefore(container, contentEl.firstChild);
      } else {
        contentEl.appendChild(container);
      }
      
      // Track the view
      this.activeViews.set(file.path, container);
    } catch (error) {
      Logger.error('Error rendering similar notes:', error);
    }
  }

  private createLoadingView(): HTMLElement {
    const container = createDiv({ cls: 'llmsider-similar-notes-container' });
    
    // Create header (no collapse button)
    const header = container.createDiv({ cls: 'llmsider-similar-notes-header' });
    const title = header.createDiv({ cls: 'llmsider-similar-notes-title' });
    title.textContent = this.i18n.t('ui.similarNotes.loading');
    
    return container;
  }

  private createSimilarNotesView(file: TFile, similarNotes: SimilarNote[]): HTMLElement {
    const container = createDiv({ cls: 'llmsider-similar-notes-container' });
    
    // Create header (no collapse button)
    const header = container.createDiv({ cls: 'llmsider-similar-notes-header' });
    const title = header.createDiv({ cls: 'llmsider-similar-notes-title' });
    title.textContent = this.i18n.t('ui.similarNotes.titleWithCount', { count: similarNotes.length.toString() });
    
    // Create content container (always visible)
    const content = container.createDiv({ cls: 'llmsider-similar-notes-content' });
    
    // Render similar notes
    similarNotes.forEach((note) => {
      const noteItem = this.createNoteItem(note);
      content.appendChild(noteItem);
    });
    
    return container;
  }

  private createNoteItem(note: SimilarNote): HTMLElement {
    const item = createDiv({ cls: 'llmsider-similar-note-item is-clickable' });
    
    // Note name
    const nameEl = item.createDiv({ cls: 'llmsider-similar-note-title' });
    nameEl.textContent = note.title;
    nameEl.setAttribute('title', note.path);
    
    // Similarity score
    const scoreEl = item.createDiv({ cls: 'llmsider-similar-note-similarity' });
    scoreEl.textContent = `${(note.similarity * 100).toFixed(0)}%`;
    
    // Click to open note
    item.addEventListener('click', (e) => {
      const newTab = e.ctrlKey || e.metaKey;
      this.workspace.openLinkText(note.path, '', newTab);
    });
    
    // Context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const menu = new Menu();
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(this.i18n.t('ui.similarNotes.openNote'))
          .setIcon('file')
          .onClick(() => this.workspace.openLinkText(note.path, '', false))
      );
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(this.i18n.t('ui.similarNotes.openInNewPane'))
          .setIcon('file-plus')
          .onClick(() => this.workspace.openLinkText(note.path, '', true))
      );
      
      menu.addSeparator();
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(this.i18n.t('ui.similarNotes.copyUrl'))
          .setIcon('link')
          .onClick(() => {
            const vaultName = this.plugin.app.vault.getName();
            const uri = `obsidian://open?vault=${vaultName}&file=${note.path}`;
            navigator.clipboard.writeText(uri);
          })
      );
      
      menu.showAtMouseEvent(e);
    });
    
    return item;
  }

  private removeView(filePath: string): void {
    const view = this.activeViews.get(filePath);
    if (view) {
      view.remove();
      this.activeViews.delete(filePath);
    }
  }

  private clearAllViews(): void {
    // Clear tracked views
    this.activeViews.forEach((view) => view.remove());
    this.activeViews.clear();
    
    // Also clean up any orphaned containers that might not be tracked
    this.cleanupOrphanedContainers();
  }

  onunload(): void {
    this.clearAllViews();
  }
}
