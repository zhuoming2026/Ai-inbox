import { computed } from 'vue'
import type { Editor } from '@tiptap/core'
import type { EditorToolbarItem } from '../types/editor'
import { fixedToolbarItems, bubbleToolbarItems, floatingToolbarItems } from '../config/toolbar'
import { isActionActive, isActionDisabled, runEditorAction } from './useEditorAction'

interface UseToolbarItemsOptions {
  onInsertImage?: () => Promise<string>
  onOpenLinkEditor?: () => void
}

/**
 * Resolve toolbar items with current active/disabled state.
 */
function resolveToolbarItems(
  items: EditorToolbarItem[][],
  editor: Editor
): EditorToolbarItem[][] {
  return items.map((group) =>
    group.map((item) => {
      const active = isActionActive(editor, item.kind)
      const disabled = isActionDisabled(editor, item.kind)

      return {
        ...item,
        active,
        disabled,
      }
    })
  )
}

/**
 * Execute a toolbar item action.
 */
export function executeToolbarItem(
  editor: Editor,
  item: EditorToolbarItem,
  options: UseToolbarItemsOptions = {}
) {
  if (item.slot === 'link' && item.kind === 'link') {
    options.onOpenLinkEditor?.()
    return
  }

  if (item.kind === 'image' && options.onInsertImage) {
    options.onInsertImage().then((url) => {
      if (url) {
        runEditorAction(editor, 'image', { src: url })
      }
    })
    return
  }

  runEditorAction(editor, item.kind)
}

/**
 * Fixed toolbar (top bar) items with live state.
 */
export function useFixedToolbarItems(editor: () => Editor | undefined, _options: UseToolbarItemsOptions = {}) {
  return computed(() => {
    const ed = editor()
    if (!ed) return fixedToolbarItems
    return resolveToolbarItems(fixedToolbarItems, ed)
  })
}

/**
 * Bubble menu items with live state.
 */
export function useBubbleToolbarItems(editor: () => Editor | undefined, _options: UseToolbarItemsOptions = {}) {
  return computed(() => {
    const ed = editor()
    if (!ed) return bubbleToolbarItems
    return resolveToolbarItems(bubbleToolbarItems, ed)
  })
}

/**
 * Floating menu items with live state.
 */
export function useFloatingToolbarItems(editor: () => Editor | undefined, _options: UseToolbarItemsOptions = {}) {
  return computed(() => {
    const ed = editor()
    if (!ed) return floatingToolbarItems
    return resolveToolbarItems(floatingToolbarItems, ed)
  })
}
