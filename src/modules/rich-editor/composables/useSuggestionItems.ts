import { computed, ref } from 'vue'
import type { Editor } from '@tiptap/core'
import type { SuggestionMenuItem } from '../types/editor'
import { suggestionMenuItems } from '../config/suggestion-menu'
import { runEditorAction } from './useEditorAction'

/**
 * Provides filtered suggestion menu items based on query.
 */
export function useSuggestionItems(editor: () => Editor | undefined) {
  const query = ref('')

  const filteredItems = computed<SuggestionMenuItem[]>(() => {
    const q = query.value.toLowerCase().trim()
    if (!q) return suggestionMenuItems

    return suggestionMenuItems.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(q)
      const matchKeywords = item.keywords?.some((kw) => kw.includes(q)) ?? false
      return matchLabel || matchKeywords
    })
  })

  function executeItem(item: SuggestionMenuItem, range: { from: number; to: number }) {
    const ed = editor()
    if (!ed) return

    ed.chain()
      .focus()
      .deleteRange(range)
      .run()

    if (item.kind) {
      runEditorAction(ed, item.kind)
    }
  }

  return {
    query,
    filteredItems,
    executeItem,
  }
}
