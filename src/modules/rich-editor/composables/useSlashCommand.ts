import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { Editor } from '@tiptap/core'
import type { SuggestionMenuItem } from '../types/editor'
import { suggestionMenuItems } from '../config/suggestion-menu'
import { runEditorAction } from './useEditorAction'

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
}

/**
 * Manages slash command UI state and keyboard navigation.
 *
 * The slash extension itself (createSlashCommand) is added to the editor's
 * extensions array and fires triggerSlash / updateSlashQuery callbacks.
 * This composable holds the reactive state consumed by RichEditorSuggestionMenu.
 *
 * Execution chain for Enter:
 *   onSlashKeyDown(Enter)
 *     → executeSelectedItem()      ← deletes slash text, runs action, closes menu
 *     → return true                ← event consumed
 * Mouse click:
 *   RichEditorSuggestionMenu @execute → executeItem() (same logic, in RichEditor)
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

  // ─── Menu control (called by slash extension callbacks) ─────────────────────

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

  // ─── Execute selected item (shared between Enter and mouse click) ────────────

  function executeSelectedItem() {
    const ed = editorGetter()
    if (!ed) return
    const items = filteredItems.value
    if (!items.length) return
    const item = items[selectedIndex.value]
    if (!item) return

    // Delete the slash trigger text
    if (slashRange.value) {
      ed.chain().focus().deleteRange(slashRange.value).run()
    }
    // Dispatch the editor action
    runEditorAction(ed, item.kind as any)
    // Close the menu
    closeMenu()
  }

  // ─── Keyboard navigation ────────────────────────────────────────────────────

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
      case 'Enter':
        // Execute the currently selected item and close the menu.
        // This is the ONLY execution path for keyboard Enter.
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
  }
}
