import type { EditorSuggestionItem } from '../types/editor'

/**
 * Slash command menu groups and items.
 * These are shared between the suggestion menu and drag handle menu.
 */
export const suggestionMenuGroups: { label: string; items: EditorSuggestionItem[] }[] = [
  {
    label: 'Basic',
    items: [
      {
        id: 'heading-1',
        label: 'Heading 1',
        description: 'Large section heading',
        icon: 'i-lucide-heading-1',
        kind: 'heading-1',
        group: 'block-format',
        keywords: ['h1', 'heading', 'title'],
      },
      {
        id: 'heading-2',
        label: 'Heading 2',
        description: 'Medium section heading',
        icon: 'i-lucide-heading-2',
        kind: 'heading-2',
        group: 'block-format',
        keywords: ['h2', 'heading'],
      },
      {
        id: 'heading-3',
        label: 'Heading 3',
        description: 'Small section heading',
        icon: 'i-lucide-heading-3',
        kind: 'heading-3',
        group: 'block-format',
        keywords: ['h3', 'heading'],
      },
    ],
  },
  {
    label: 'Lists',
    items: [
      {
        id: 'bullet-list',
        label: 'Bullet List',
        description: 'Unordered list',
        icon: 'i-lucide-list',
        kind: 'bullet-list',
        group: 'list',
        keywords: ['ul', 'bullet', 'list'],
      },
      {
        id: 'ordered-list',
        label: 'Ordered List',
        description: 'Numbered list',
        icon: 'i-lucide-list-ordered',
        kind: 'ordered-list',
        group: 'list',
        keywords: ['ol', 'numbered', 'list'],
      },
      {
        id: 'task-list',
        label: 'Task List',
        description: 'Checkable task list',
        icon: 'i-lucide-list-check',
        kind: 'task-list',
        group: 'list',
        keywords: ['todo', 'task', 'checklist'],
      },
    ],
  },
  {
    label: 'Blocks',
    items: [
      {
        id: 'blockquote',
        label: 'Quote',
        description: 'Block quotation',
        icon: 'i-lucide-text-quote',
        kind: 'blockquote',
        group: 'block-format',
        keywords: ['quote', 'blockquote'],
      },
      {
        id: 'code-block',
        label: 'Code Block',
        description: 'Code snippet with syntax highlighting',
        icon: 'i-lucide-square-code',
        kind: 'code-block',
        group: 'block-format',
        keywords: ['code', 'codeblock', 'pre'],
      },
      {
        id: 'horizontal-rule',
        label: 'Divider',
        description: 'Horizontal rule',
        icon: 'i-lucide-minus',
        kind: 'horizontal-rule',
        group: 'insert',
        keywords: ['hr', 'divider', 'rule', 'separator'],
      },
    ],
  },
]

/** Flat list for easy searching */
export const suggestionMenuItems: EditorSuggestionItem[] =
  suggestionMenuGroups.flatMap((g) => g.items)
