/**
 * Similar Notes View Manager
 * 相似笔记视图管理器 - 管理笔记底部的相似文档显示
 */

import { Component, MarkdownView, TFile, Workspace, Menu, Notice } from 'obsidian';
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
  private lastRenderTime: Map<string, number> = new Map();
  private renderDebounceMs = 300; // Debounce renders within 300ms
  private cache: Map<string, SimilarNote[]> = new Map();

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

  private async renderSimilarNotes(file: TFile, forceRefresh: boolean = false): Promise<void> {
    if (!this.similarNoteFinder) return;

    try {
      // Debounce: prevent duplicate renders within a short time window
      const now = Date.now();
      const lastRender = this.lastRenderTime.get(file.path);
      if (!forceRefresh && lastRender && now - lastRender < this.renderDebounceMs) {
        Logger.debug(`Skipping duplicate render for ${file.path} (within ${this.renderDebounceMs}ms)`);
        return;
      }
      this.lastRenderTime.set(file.path, now);
      
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
      
      // Check cache if not forcing refresh
      let similarNotes: SimilarNote[] = [];
      if (!forceRefresh && this.cache.has(file.path)) {
        similarNotes = this.cache.get(file.path)!;
        Logger.debug(`Using cached similar notes for ${file.path}`);
      } else {
        // Show loading state only when fetching
        const loadingContainer = this.createLoadingView();
        const contentEl = targetView.contentEl;
        if (contentEl.firstChild) {
          contentEl.insertBefore(loadingContainer, contentEl.firstChild);
        } else {
          contentEl.appendChild(loadingContainer);
        }
        this.activeViews.set(file.path, loadingContainer);
        
        // Find similar notes
        similarNotes = await this.similarNoteFinder.findSimilarNotes(file, 5);
        
        // Update cache
        this.cache.set(file.path, similarNotes);
        
        // Remove loading view
        loadingContainer.remove();
      }
      
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
      
      if (targetView.contentEl.firstChild) {
        targetView.contentEl.insertBefore(container, targetView.contentEl.firstChild);
      } else {
        targetView.contentEl.appendChild(container);
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
    
    // Get hide-by-default setting
    const hideByDefault = this.plugin.settings.vectorSettings.similarNotesHideByDefault;
    
    // Add hide-by-default class if enabled
    if (hideByDefault) {
      container.addClass('llmsider-similar-notes-hide-by-default');
    }
    
    // Create header
    const header = container.createDiv({ cls: 'llmsider-similar-notes-header' });
    
    // Add title (left side, takes most space)
    const title = header.createDiv({ cls: 'llmsider-similar-notes-title' });
    title.textContent = this.i18n.t('ui.similarNotes.titleWithCount', { count: similarNotes.length.toString() });
    
    // Add pin button to toggle auto-hide (right side, before refresh)
    const pinBtn = header.createDiv({ 
      cls: `llmsider-similar-notes-pin-btn ${hideByDefault ? 'unpinned' : 'pinned'}` 
    });
    // Pin icon: pinned (not auto-hide) vs unpinned (auto-hide enabled)
    const pinIcon = hideByDefault 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>` 
      : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`;
    pinBtn.innerHTML = pinIcon;
    
    pinBtn.style.minWidth = '24px';
    pinBtn.style.minHeight = '24px';
    pinBtn.style.cursor = 'pointer';
    pinBtn.style.userSelect = 'none';
    pinBtn.style.marginRight = '4px';
    pinBtn.style.display = 'flex';
    pinBtn.style.alignItems = 'center';
    pinBtn.style.justifyContent = 'center';
    pinBtn.setAttribute('aria-label', hideByDefault ? 'Pin to always show' : 'Unpin to auto-hide');
    
    pinBtn.onclick = async (e) => {
      e.stopPropagation();
      const newHideByDefault = !hideByDefault;
      this.plugin.settings.vectorSettings.similarNotesHideByDefault = newHideByDefault;
      await this.plugin.saveSettings();
      
      // Refresh the view to apply the new setting
      await this.renderSimilarNotes(file, true);
    };
    
    // Add refresh button (right side)
    const refreshBtn = header.createDiv({ 
      cls: 'llmsider-similar-notes-refresh-btn' 
    });
    refreshBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
    
    refreshBtn.style.minWidth = '24px';
    refreshBtn.style.minHeight = '24px';
    refreshBtn.style.cursor = 'pointer';
    refreshBtn.style.userSelect = 'none';
    refreshBtn.style.marginRight = '4px';
    refreshBtn.style.display = 'flex';
    refreshBtn.style.alignItems = 'center';
    refreshBtn.style.justifyContent = 'center';
    refreshBtn.setAttribute('aria-label', this.i18n.t('ui.similarNotes.refresh'));
    
    refreshBtn.onclick = (e) => {
      e.stopPropagation();
      this.renderSimilarNotes(file, true);
    };
    
    // Create content container
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
    const handleNoteClick = async (e: Event) => {
      try {
        // Always open in new tab as requested
        const newTab = true;
        
        // Find the file in vault
        const file = this.plugin.app.vault.getAbstractFileByPath(note.path);
        if (file && file instanceof TFile) {
          // Use workspace.getLeaf() for better control
          const leaf = this.workspace.getLeaf('tab');
          await leaf.openFile(file);
        } else {
          // Try alternative path formats
          const alternativePaths = [
            note.path,
            note.path + '.md',
            note.path.replace(/\.md$/, ''),
          ];
          
          for (const path of alternativePaths) {
            const altFile = this.plugin.app.vault.getAbstractFileByPath(path);
            if (altFile && altFile instanceof TFile) {
              const leaf = this.workspace.getLeaf('tab');
              await leaf.openFile(altFile);
              return;
            }
          }
          
          console.error('[SimilarNotes] Could not find file with any path variant');
        }
      } catch (error) {
        console.error('[SimilarNotes] Failed to open note:', error);
      }
    };
    
    // Multiple event binding approaches
    item.addEventListener('click', handleNoteClick);
    item.addEventListener('mousedown', async (e) => {
      if (e.button === 0) { // Left mouse button only
        await handleNoteClick(e);
      }
    });
    
    // Direct property assignment as fallback
    (item as any).onclick = handleNoteClick;
    
    // Context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const menu = new Menu();
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(this.i18n.t('ui.similarNotes.openNote'))
          .setIcon('file')
          .onClick(async () => {
            const file = this.plugin.app.vault.getAbstractFileByPath(note.path);
            if (file && file instanceof TFile) {
              const leaf = this.workspace.getLeaf();
              await leaf.openFile(file);
            }
          })
      );
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(this.i18n.t('ui.similarNotes.openInNewPane'))
          .setIcon('file-plus')
          .onClick(async () => {
            const file = this.plugin.app.vault.getAbstractFileByPath(note.path);
            if (file && file instanceof TFile) {
              // Workaround to open in background:
              // 1. Get current active leaf
              const currentLeaf = this.workspace.getLeaf(false);
              
              // 2. Open in new tab (this activates it)
              const newLeaf = this.workspace.getLeaf('tab');
              await newLeaf.openFile(file);
              
              // 3. Immediately switch back to the original leaf
              if (currentLeaf) {
                this.workspace.setActiveLeaf(currentLeaf, { focus: true });
              }
            }
          })
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
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(this.i18n.t('ui.similarNotes.generateBidirectionalLink'))
          .setIcon('link-2')
          .onClick(async () => {
            try {
              await this.generateBidirectionalLink(note);
            } catch (error) {
              console.error('[SimilarNotes] Failed to generate bidirectional link:', error);
            }
          })
      );
      
      menu.showAtMouseEvent(e);
    });
    
    return item;
  }

  private async generateBidirectionalLink(note: SimilarNote): Promise<void> {
    try {
      // Get current active file
      const currentFile = this.plugin.app.workspace.getActiveFile();
      if (!currentFile) {
        console.error('[SimilarNotes] No active file found');
        return;
      }
      
      // Get the note name without .md extension for the link
      const noteName = note.title;
      
      // Read current file content
      const content = await this.plugin.app.vault.read(currentFile);
      
      // Check if the link already exists in the content
      const linkPattern = new RegExp(`\\[\\[${noteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'i');
      if (linkPattern.test(content)) {
        // Show a notice that link already exists
        new Notice(this.i18n.t('ui.similarNotes.linkAlreadyExists'));
        return;
      }
      
      // Generate the bidirectional link format
      const linkText = `\n---\n[[${noteName}]]\n`;
      
      // Append to the end of the file
      const newContent = content + linkText;
      await this.plugin.app.vault.modify(currentFile, newContent);
      
      // Show success notice
      new Notice(this.i18n.t('ui.similarNotes.linkAdded', { noteName }));
      
    } catch (error) {
      console.error('[SimilarNotes] Error generating bidirectional link:', error);
      new Notice(this.i18n.t('ui.similarNotes.linkAddError'));
    }
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
