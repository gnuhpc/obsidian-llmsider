import { App, FuzzyMatch, FuzzySuggestModal } from 'obsidian';

export interface SkillSelectionItem {
  skillId: string;
  title: string;
  description?: string;
}

export class SkillSelectionModal extends FuzzySuggestModal<SkillSelectionItem> {
  constructor(
    app: App,
    private items: SkillSelectionItem[],
    private onSelect: (item: SkillSelectionItem) => void,
  ) {
    super(app);
    this.setPlaceholder('Select a skill');
  }

  getItems(): SkillSelectionItem[] {
    return this.items;
  }

  getItemText(item: SkillSelectionItem): string {
    return item.title;
  }

  renderSuggestion(match: FuzzyMatch<SkillSelectionItem>, el: HTMLElement): void {
    const item = match.item;
    el.createEl('div', {
      text: item.title,
      cls: 'llmsider-skill-suggestion-title',
    });

    if (item.description) {
      el.createEl('div', {
        text: item.description,
        cls: 'llmsider-skill-suggestion-description',
      });
    }
  }

  onChooseItem(item: SkillSelectionItem): void {
    this.onSelect(item);
  }
}
