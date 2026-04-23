import type { Editor } from '@tiptap/core'
import type { EditorView } from '@tiptap/pm/view'

// ─── Action Kind ─────────────────────────────────────────────────────────────

export type EditorActionKind =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'bullet-list'
  | 'ordered-list'
  | 'task-list'
  | 'blockquote'
  | 'code-block'
  | 'horizontal-rule'
  | 'table'
  | 'link'
  | 'image'
  | 'undo'
  | 'redo'

// ─── Group ────────────────────────────────────────────────────────────────────

export type EditorGroup =
  | 'text-format'
  | 'block-format'
  | 'list'
  | 'insert'
  | 'history'
  | 'ai'

// ─── Suggestion Item ─────────────────────────────────────────────────────────

export interface EditorSuggestionItem {
  id: string
  label: string
  description?: string
  icon?: string
  kind: EditorActionKind
  group?: EditorGroup
  keywords?: string[]
}

// ─── Toolbar Item ─────────────────────────────────────────────────────────────

export interface EditorToolbarItem {
  kind: EditorActionKind
  label: string
  icon?: string
  tooltip?: string
  group?: EditorGroup
  disabled?: boolean
  active?: boolean
  loading?: boolean
  children?: EditorToolbarItem[]
  /** For custom slots like link popover */
  slot?: 'link'
  /** For heading level */
  level?: 1 | 2 | 3 | 4
  /** For mark-based items */
  mark?: string
  /** Click handler (used when kind alone isn't enough) */
  onClick?: (editor: Editor) => void
}

// ─── Toolbar Props ───────────────────────────────────────────────────────────

export interface EditorToolbarProps {
  editor: Editor
  items: EditorToolbarItem[][]
  /** 'fixed' | 'bubble' | 'floating' */
  layout?: 'fixed' | 'bubble' | 'floating'
  /** Override auto show/hide logic */
  shouldShow?: (ctx: { editor: Editor; view: EditorView; state: any; oldState?: any }) => boolean
}

// ─── Content Type ────────────────────────────────────────────────────────────

export type ContentType = 'html' | 'json' | 'markdown'

/**
 * Content type behavior:
 * - html: editor.getHTML() → output HTML string
 * - json: editor.getJSON() → output JSON string (JSON.stringify)
 * - markdown: editor.getMarkdown() → output markdown string (requires @tiptap/extension-markdown)
 */
export interface ContentTypeOption {
  contentType: ContentType
}

// ─── RichEditor Props ────────────────────────────────────────────────────────

export type ContentTheme = 'default' | 'serif'

export interface RichEditorProps {
  modelValue?: string
  contentType?: ContentType
  placeholder?: string
  editable?: boolean
  toolbar?: boolean
  bubble?: boolean
  floating?: boolean
  minHeight?: string
  maxWidth?: string
  /** Content theme for the article area */
  contentTheme?: ContentTheme
  /** Starter kit options */
  starterKit?: {
    undoRedo?: boolean
  }
  /** Called when user wants to insert an image — should return URL */
  onInsertImage?: () => Promise<string>
  /** Called when link button is clicked in bubble/bubble toolbar */
  onOpenLinkEditor?: () => void
}

// ─── RichEditor Emits ────────────────────────────────────────────────────────

export interface RichEditorEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'ready', editor: Editor): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'selectionChange', selection: { from: number; to: number }): void
}

// ─── Link Popover ───────────────────────────────────────────────────────────

export interface LinkPopoverRef {
  open: () => void
  close: () => void
}

// ─── Suggestion Menu ────────────────────────────────────────────────────────

export interface SuggestionMenuItem {
  id: string
  label: string
  description?: string
  icon?: string
  keywords?: string[]
  isDisabled?: boolean
  isActive?: boolean
  /** Maps to EditorActionKind for execution */
  kind?: EditorActionKind
}

export interface SuggestionMenuContext {
  editor: Editor
  query: string
  range: { from: number; to: number }
  items: SuggestionMenuItem[]
  command: (item: SuggestionMenuItem) => void
}

// ─── Extension Config ────────────────────────────────────────────────────────

export interface RichEditorExtensionOptions {
  onInsertImage?: () => Promise<string>
}
