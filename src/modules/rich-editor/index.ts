// ─── Components ────────────────────────────────────────────────────────────────

export { default as RichEditor } from './components/RichEditor.vue'
export { default as RichEditorToolbar } from './components/RichEditorToolbar.vue'
export { default as RichEditorBubbleMenu } from './components/RichEditorBubbleMenu.vue'
export { default as RichEditorFloatingMenu } from './components/RichEditorFloatingMenu.vue'
export { default as RichEditorSuggestionMenu } from './components/RichEditorSuggestionMenu.vue'
export { default as RichEditorLinkPopover } from './components/RichEditorLinkPopover.vue'

// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  EditorActionKind,
  EditorGroup,
  EditorSuggestionItem,
  EditorToolbarItem,
  EditorToolbarProps,
  ContentType,
  RichEditorProps,
  RichEditorEmits,
  LinkPopoverRef,
  SuggestionMenuItem,
  SuggestionMenuContext,
  RichEditorExtensionOptions,
} from './types/editor'

// ─── Config ───────────────────────────────────────────────────────────────────

export { fixedToolbarItems, bubbleToolbarItems, floatingToolbarItems } from './config/toolbar'
export { suggestionMenuGroups, suggestionMenuItems } from './config/suggestion-menu'

// ─── Extensions ────────────────────────────────────────────────────────────────

export { createStarterKit } from './extensions/starter'
export { LinkExtension } from './extensions/link'
export { ImageExtension } from './extensions/image'
export { TableExtension, TableRowExtension, TableCellExtension, TableHeaderExtension, tableExtensions } from './extensions/table'
export { createPlaceholder } from './extensions/placeholder'
export { createSlashCommand } from './extensions/slash-command'

// ─── Composables ───────────────────────────────────────────────────────────────

export { runEditorAction, isActionActive, isActionDisabled } from './composables/useEditorAction'
export { useFixedToolbarItems, useBubbleToolbarItems, useFloatingToolbarItems, executeToolbarItem } from './composables/useToolbarItems'
export { useSuggestionItems } from './composables/useSuggestionItems'
export { useEditorSelection } from './composables/useEditorSelection'
export { useSlashCommand } from './composables/useSlashCommand'
