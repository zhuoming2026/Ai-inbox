import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { Editor } from '@tiptap/core'
import type { SuggestionMenuItem } from '../types/editor'
import { suggestionMenuItems } from '../config/suggestion-menu'

export interface SlashCommandState {
  showSuggestionMenu: Ref<boolean>
  slashRange: Ref<{ from: number; to: number } | null>
  slashQuery: Ref<string>
  selectedIndex: Ref<number>
  filteredItems: ComputedRef<SuggestionMenuItem[]>
  /** Called when user types `/` — open the menu with initial range. */
  triggerSlash: (range: { from: number; to: number }) => void
  /** Called on each keystroke after `/` to update the query. */
  updateSlashQuery: (query: string) => void
  /** Key handler for the suggestion menu. Call from the menu's @keydown. */
  onSlashKeyDown: (event: KeyboardEvent) => boolean
  /** Execute the currently selected item (used by mouse click and Enter/Tab). */
  executeSelectedItem: (item?: SuggestionMenuItem) => void
}

/**
 * Manages slash command UI state, keyboard navigation, and execution.
 *
 * Single execution chain:
 *   Mouse click / Enter / Tab
 *     → executeSelectedItem()
 *     → deleteRange + runEditorAction
 *     → closeMenu()
 *   Keyboard navigation (ArrowUp/Down, Escape)
 *     → onSlashKeyDown()
 *
 * RichEditorSuggestionMenu handles display + hover highlight.
 */
export function useSlashCommand(
  editorGetter: () => Editor | undefined,
): SlashCommandState {
  const showSuggestionMenu = ref(false)
  const slashRange = ref<{ from: number; to: number } | null>(null)
  const slashQuery = ref('')
  const selectedIndex = ref(0)

  // ─── Filtering ───────────────────────────────────────────────────────────────

  const filteredItems = computed<SuggestionMenuItem[]>(() => {
    const q = slashQuery.value.toLowerCase().trim()
    if (!q) return suggestionMenuItems
    return suggestionMenuItems.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(q)
      const matchKeywords = item.keywords?.some((kw) => kw.includes(q)) ?? false
      return matchLabel || matchKeywords
    })
  })

  // ─── Menu control ────────────────────────────────────────────────────────────

  function triggerSlash(range: { from: number; to: number }) {
    slashRange.value = range
    slashQuery.value = ''
    showSuggestionMenu.value = true
    selectedIndex.value = 0
  }

  function updateSlashQuery(query: string) {
    slashQuery.value = query
    selectedIndex.value = 0
  }

  function closeMenu() {
    showSuggestionMenu.value = false
    slashRange.value = null
    slashQuery.value = ''
  }

  // ─── Execution (single path for mouse + keyboard) ────────────────────────────

  /**
   * Execute a slash command item.
   * - Mouse click: called with the clicked item
   * - Enter/Tab: called with no argument (uses selectedIndex)
   */
  function executeSelectedItem(item?: SuggestionMenuItem) {
    const ed = editorGetter()
    if (!ed) return
    const items = filteredItems.value
    if (!items.length) return

    // Use the provided item, or fall back to the currently selected item
    const targetItem = item ?? items[selectedIndex.value]
    if (!targetItem) return

    // Delete the slash trigger text
    if (slashRange.value) {
      ed.chain().focus().deleteRange(slashRange.value).run()
    }
    // Dispatch the editor action (dynamic import to avoid circular dep)
    import('./useEditorAction').then(({ runEditorAction }) => {
      runEditorAction(ed, targetItem.kind as any)
    })
    // Close the menu
    closeMenu()
  }

  // ─── Keyboard navigation + execution ─────────────────────────────────────────

  function onSlashKeyDown(event: KeyboardEvent): boolean {
    if (!showSuggestionMenu.value) return false

    const items = filteredItems.value

    switch (event.key) {
      case 'ArrowUp':
        if (items.length) {
          selectedIndex.value = (selectedIndex.value - 1 + items.length) % items.length
        }
        event.preventDefault()
        return true
      case 'ArrowDown':
        if (items.length) {
          selectedIndex.value = (selectedIndex.value + 1) % items.length
        }
        event.preventDefault()
        return true
      case 'Tab':
      case 'Enter':
        // Execute the currently selected item.
        executeSelectedItem()
        event.preventDefault()
        return true
      case 'Escape':
        closeMenu()
        event.preventDefault()
        return true
    }
    return false
  }

  return {
    showSuggestionMenu,
    slashRange,
    slashQuery,
    selectedIndex,
    filteredItems,
    triggerSlash,
    updateSlashQuery,
    onSlashKeyDown,
    executeSelectedItem,
  }
}
