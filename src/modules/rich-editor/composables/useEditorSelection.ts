import { ref, computed } from 'vue'
import type { Editor } from '@tiptap/core'

/**
 * Track editor selection changes and expose selection state.
 */
export function useEditorSelection(editor: () => Editor | undefined) {
  const selectionFrom = ref(0)
  const selectionTo = ref(0)
  const hasSelection = computed(() => selectionFrom.value !== selectionTo.value)

  function updateSelection() {
    const ed = editor()
    if (!ed) return
    const { from, to } = ed.state.selection
    selectionFrom.value = from
    selectionTo.value = to
  }

  function bindEditor(ed: Editor) {
    ed.on('selectionUpdate', updateSelection)
  }

  function unbindEditor(ed: Editor) {
    ed.off('selectionUpdate', updateSelection)
  }

  return {
    selectionFrom,
    selectionTo,
    hasSelection,
    bindEditor,
    unbindEditor,
  }
}
