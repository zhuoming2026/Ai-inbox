import type { Editor } from '@tiptap/core'
import type { EditorActionKind } from '../types/editor'

/**
 * Maps EditorActionKind → TipTap editor command.
 * Single source of truth for toolbar + suggestion menu execution.
 */
export function runEditorAction(editor: Editor, kind: EditorActionKind, extra?: Record<string, unknown>) {
  const chain = editor.chain().focus() as any

  switch (kind) {
    case 'bold':
      return chain.toggleBold().run()
    case 'italic':
      return chain.toggleItalic().run()
    case 'underline':
      return chain.toggleUnderline().run()
    case 'strike':
      return chain.toggleStrike().run()
    case 'code':
      return chain.toggleCode().run()
    case 'paragraph':
      return chain.setParagraph().run()
    case 'heading-1':
      return chain.toggleHeading({ level: 1 }).run()
    case 'heading-2':
      return chain.toggleHeading({ level: 2 }).run()
    case 'heading-3':
      return chain.toggleHeading({ level: 3 }).run()
    case 'bullet-list':
      return chain.toggleBulletList().run()
    case 'ordered-list':
      return chain.toggleOrderedList().run()
    case 'task-list':
      return chain.toggleTaskList().run()
    case 'blockquote':
      return chain.toggleBlockquote().run()
    case 'code-block':
      return chain.toggleCodeBlock().run()
    case 'horizontal-rule':
      return chain.setHorizontalRule().run()
    case 'table':
      return chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    case 'undo':
      return chain.undo().run()
    case 'redo':
      return chain.redo().run()
    case 'link':
      // Link is handled via LinkPopover, not a direct command
      return
    case 'image':
      if (extra?.src) {
        return chain.setImage({ src: extra.src as string }).run()
      }
      return
    default:
      return
  }
}

/**
 * Check if a given action kind is currently active in the editor.
 */
export function isActionActive(editor: Editor, kind: EditorActionKind): boolean {
  switch (kind) {
    case 'bold':
      return editor.isActive('bold')
    case 'italic':
      return editor.isActive('italic')
    case 'underline':
      return editor.isActive('underline')
    case 'strike':
      return editor.isActive('strike')
    case 'code':
      return editor.isActive('code')
    case 'paragraph':
      return editor.isActive('paragraph')
    case 'heading-1':
      return editor.isActive('heading', { level: 1 })
    case 'heading-2':
      return editor.isActive('heading', { level: 2 })
    case 'heading-3':
      return editor.isActive('heading', { level: 3 })
    case 'bullet-list':
      return editor.isActive('bulletList')
    case 'ordered-list':
      return editor.isActive('orderedList')
    case 'task-list':
      return editor.isActive('taskList')
    case 'blockquote':
      return editor.isActive('blockquote')
    case 'code-block':
      return editor.isActive('codeBlock')
    case 'link':
      return editor.isActive('link')
    default:
      return false
  }
}

/**
 * Check if a given action kind is currently disabled.
 */
export function isActionDisabled(editor: Editor, kind: EditorActionKind): boolean {
  switch (kind) {
    case 'undo':
      return !editor.can().undo()
    case 'redo':
      return !editor.can().redo()
    default:
      return false
  }
}
