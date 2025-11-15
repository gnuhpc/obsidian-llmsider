import { EditorView, keymap } from '@codemirror/view';
import { Extension, Prec } from '@codemirror/state';
import { InlineCompletionHandler } from './inline-completion-handler';

/**
 * Create keymap for inline completion
 * Using Prec.highest() to ensure our Tab handler runs before default indentation
 */
export function createCompletionKeymap(handler: InlineCompletionHandler): Extension {
	return Prec.highest(keymap.of([
		{
			key: 'Tab',
			run: (view: EditorView) => {
				// Try to accept suggestion
				const accepted = handler.accept(view);
				if (accepted) {
					return true;
				}
				// If no suggestion, let default Tab behavior happen
				return false;
			},
		},
		{
			key: 'ArrowRight',
			run: (view: EditorView) => {
				// Try to accept next word
				const accepted = handler.acceptNextWord(view);
				if (accepted) {
					return true;
				}
				// If no suggestion, let default arrow behavior happen
				return false;
			},
		},
		{
			key: 'ArrowDown',
			run: (view: EditorView) => {
				// Try to switch to next suggestion
				const switched = handler.nextSuggestion(view);
				if (switched) {
					return true;
				}
				// If no suggestion, let default arrow behavior happen
				return false;
			},
		},
		{
			key: 'ArrowUp',
			run: (view: EditorView) => {
				// Try to switch to previous suggestion
				const switched = handler.previousSuggestion(view);
				if (switched) {
					return true;
				}
				// If no suggestion, let default arrow behavior happen
				return false;
			},
		},
		{
			key: 'Escape',
			run: (view: EditorView) => {
				const cancelled = handler.cancel(view);
				if (cancelled) {
					return true;
				}
				// If no suggestion to cancel, let default Escape behavior happen
				return false;
			},
		},
	]));
}
