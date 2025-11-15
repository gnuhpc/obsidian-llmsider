/**
 * Similar Notes View Component
 * 相似笔记视图组件 - 在笔记底部显示相似文档
 */

import * as React from 'react';
import { useEffect, useState } from 'react';
import { TFile, Workspace, Menu } from 'obsidian';
import { SimilarNote } from '../vector/similarNoteFinder';

export interface SimilarNotesViewModel {
  currentFile: TFile | null;
  similarNotes: SimilarNote[];
  collapsed: boolean;
}

interface SimilarNotesViewProps {
  workspace: Workspace;
  viewModel: SimilarNotesViewModel;
  onCollapseToggle: () => void;
  vaultName: string;
}

/**
 * Header component with collapse toggle
 */
const SimilarNotesHeader: React.FC<{
  collapsed: boolean;
  onToggle: () => void;
  count: number;
}> = ({ collapsed, onToggle, count }) => {
  return (
    <div
      className="llmsider-similar-notes-header tree-item-self is-clickable"
      onClick={onToggle}
    >
      <div className={`tree-item-icon collapse-icon ${collapsed ? 'is-collapsed' : ''}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8L12 17L21 8" />
        </svg>
      </div>
      <div className="tree-item-inner llmsider-similar-notes-title">
        Similar Notes ({count})
      </div>
    </div>
  );
};

/**
 * Individual similar note item component
 */
const SimilarNoteItem: React.FC<{
  note: SimilarNote;
  workspace: Workspace;
  vaultName: string;
}> = ({ note, workspace, vaultName }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const newTab = e.ctrlKey || e.metaKey;
    workspace.openLinkText(note.path, '', newTab);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const menu = new Menu();
    
    menu.addItem((item) =>
      item
        .setTitle('Open')
        .setIcon('file')
        .onClick(() => workspace.openLinkText(note.path, '', false))
    );
    
    menu.addItem((item) =>
      item
        .setTitle('Open in new tab')
        .setIcon('file-plus')
        .onClick(() => workspace.openLinkText(note.path, '', true))
    );
    
    menu.addSeparator();
    
    menu.addItem((item) =>
      item
        .setTitle('Copy Obsidian URL')
        .setIcon('link')
        .onClick(() => {
          const uri = `obsidian://open?vault=${vaultName}&file=${note.path}`;
          navigator.clipboard.writeText(uri);
        })
    );
    
    menu.showAtMouseEvent(e.nativeEvent);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`llmsider-similar-note-item tree-item ${isExpanded ? '' : 'is-collapsed'}`}>
      <div
        className="tree-item-self search-result-file-title is-clickable"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <div
          className={`tree-item-icon collapse-icon ${isExpanded ? '' : 'is-collapsed'}`}
          onClick={toggleExpand}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8L12 17L21 8" />
          </svg>
        </div>
        <div className="tree-item-inner" title={note.path}>
          {note.title}
        </div>
        <div className="tree-item-flair-outer">
          <span className="tree-item-flair">
            {(note.similarity * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      {isExpanded && note.preview && (
        <div className="llmsider-similar-note-preview search-result-file-matches">
          <div className="search-result-file-match">
            {note.preview}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main similar notes view component
 */
export const SimilarNotesView: React.FC<SimilarNotesViewProps> = ({
  workspace,
  viewModel,
  onCollapseToggle,
  vaultName
}) => {
  const { currentFile, similarNotes, collapsed } = viewModel;

  if (!currentFile) {
    return null;
  }

  return (
    <div className="llmsider-similar-notes-container">
      <div className="nav-header" />
      <div className="llmsider-similar-notes-pane">
        <SimilarNotesHeader
          collapsed={collapsed}
          onToggle={onCollapseToggle}
          count={similarNotes.length}
        />
        {!collapsed && (
          <div className="search-result-container">
            {similarNotes.length === 0 ? (
              <div className="search-empty-state">
                No similar notes found
              </div>
            ) : (
              <div className="search-results-children">
                {similarNotes.map((note) => (
                  <SimilarNoteItem
                    key={note.path}
                    note={note}
                    workspace={workspace}
                    vaultName={vaultName}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
