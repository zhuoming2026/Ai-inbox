import type { EditorToolbarItem } from '../types/editor'

/**
 * Fixed toolbar items — top-level action bar
 */
export const fixedToolbarItems: EditorToolbarItem[][] = [
  // History
  [
    { kind: 'undo', label: 'Undo', icon: 'i-lucide-undo', tooltip: 'Undo', group: 'history' },
    { kind: 'redo', label: 'Redo', icon: 'i-lucide-redo', tooltip: 'Redo', group: 'history' },
  ],
  // Block format
  [
    {
      kind: 'heading-1',
      label: 'Heading 1',
      icon: 'i-lucide-heading-1',
      tooltip: 'Heading 1',
      group: 'block-format',
      level: 1,
    },
    {
      kind: 'heading-2',
      label: 'Heading 2',
      icon: 'i-lucide-heading-2',
      tooltip: 'Heading 2',
      group: 'block-format',
      level: 2,
    },
    {
      kind: 'heading-3',
      label: 'Heading 3',
      icon: 'i-lucide-heading-3',
      tooltip: 'Heading 3',
      group: 'block-format',
      level: 3,
    },
  ],
  // Text format
  [
    { kind: 'bold', label: 'Bold', icon: 'i-lucide-bold', tooltip: 'Bold', group: 'text-format', mark: 'bold' },
    { kind: 'italic', label: 'Italic', icon: 'i-lucide-italic', tooltip: 'Italic', group: 'text-format', mark: 'italic' },
    { kind: 'underline', label: 'Underline', icon: 'i-lucide-underline', tooltip: 'Underline', group: 'text-format', mark: 'underline' },
    { kind: 'strike', label: 'Strikethrough', icon: 'i-lucide-strikethrough', tooltip: 'Strikethrough', group: 'text-format', mark: 'strike' },
    { kind: 'code', label: 'Inline Code', icon: 'i-lucide-code', tooltip: 'Code', group: 'text-format', mark: 'code' },
  ],
  // Lists
  [
    { kind: 'bullet-list', label: 'Bullet List', icon: 'i-lucide-list', tooltip: 'Bullet List', group: 'list' },
    { kind: 'ordered-list', label: 'Ordered List', icon: 'i-lucide-list-ordered', tooltip: 'Ordered List', group: 'list' },
    { kind: 'task-list', label: 'Task List', icon: 'i-lucide-list-check', tooltip: 'Task List', group: 'list' },
  ],
  // Block
  [
    { kind: 'blockquote', label: 'Blockquote', icon: 'i-lucide-text-quote', tooltip: 'Blockquote', group: 'block-format' },
    { kind: 'code-block', label: 'Code Block', icon: 'i-lucide-square-code', tooltip: 'Code Block', group: 'block-format' },
    { kind: 'horizontal-rule', label: 'Divider', icon: 'i-lucide-minus', tooltip: 'Divider', group: 'insert' },
  ],
  // Insert
  [
    { kind: 'link', label: 'Link', icon: 'i-lucide-link', tooltip: 'Link', group: 'insert', slot: 'link' },
    { kind: 'image', label: 'Image', icon: 'i-lucide-image', tooltip: 'Image', group: 'insert' },
  ],
]

/**
 * Bubble menu items — appear on text selection
 */
export const bubbleToolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'bold', label: 'Bold', icon: 'i-lucide-bold', tooltip: 'Bold', group: 'text-format', mark: 'bold' },
    { kind: 'italic', label: 'Italic', icon: 'i-lucide-italic', tooltip: 'Italic', group: 'text-format', mark: 'italic' },
    { kind: 'underline', label: 'Underline', icon: 'i-lucide-underline', tooltip: 'Underline', group: 'text-format', mark: 'underline' },
    { kind: 'strike', label: 'Strikethrough', icon: 'i-lucide-strikethrough', tooltip: 'Strikethrough', group: 'text-format', mark: 'strike' },
    { kind: 'code', label: 'Inline Code', icon: 'i-lucide-code', tooltip: 'Code', group: 'text-format', mark: 'code' },
    { kind: 'link', label: 'Link', icon: 'i-lucide-link', tooltip: 'Link', group: 'insert', slot: 'link' },
  ],
]

/**
 * Floating menu items — appear on empty line
 */
export const floatingToolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'heading-1', label: 'Heading 1', icon: 'i-lucide-heading-1', tooltip: 'Heading 1', group: 'block-format', level: 1 },
    { kind: 'heading-2', label: 'Heading 2', icon: 'i-lucide-heading-2', tooltip: 'Heading 2', group: 'block-format', level: 2 },
    { kind: 'heading-3', label: 'Heading 3', icon: 'i-lucide-heading-3', tooltip: 'Heading 3', group: 'block-format', level: 3 },
    { kind: 'bullet-list', label: 'Bullet List', icon: 'i-lucide-list', tooltip: 'Bullet List', group: 'list' },
    { kind: 'ordered-list', label: 'Ordered List', icon: 'i-lucide-list-ordered', tooltip: 'Ordered List', group: 'list' },
    { kind: 'task-list', label: 'Task List', icon: 'i-lucide-list-check', tooltip: 'Task List', group: 'list' },
    { kind: 'blockquote', label: 'Blockquote', icon: 'i-lucide-text-quote', tooltip: 'Blockquote', group: 'block-format' },
    { kind: 'code-block', label: 'Code Block', icon: 'i-lucide-square-code', tooltip: 'Code Block', group: 'block-format' },
    { kind: 'horizontal-rule', label: 'Divider', icon: 'i-lucide-minus', tooltip: 'Divider', group: 'insert' },
  ],
]
