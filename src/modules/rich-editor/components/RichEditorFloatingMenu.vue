<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/core'
import type { EditorToolbarItem } from '../types/editor'
import RichEditorToolbar from './RichEditorToolbar.vue'
import { useEditorFloatingPosition } from '../composables/useEditorFloatingPosition'

interface ToolbarOptions {
  onInsertImage?: () => Promise<string>
  onOpenLinkEditor?: () => void
}

const props = defineProps<{
  editor: Editor
  items: EditorToolbarItem[][]
  options?: ToolbarOptions
}>()

const show = ref(false)
const floatingRef = ref<HTMLElement | null>(null)

function updateVisibility() {
  if (!props.editor) return
  const { selection } = props.editor.state
  const isEmpty = selection.empty && props.editor.isEmpty
  show.value = isEmpty && props.editor.isFocused
}

onMounted(() => {
  props.editor.on('selectionUpdate', updateVisibility)
  props.editor.on('focus', updateVisibility)
  props.editor.on('blur', updateVisibility)
})

onBeforeUnmount(() => {
  props.editor.off('selectionUpdate', updateVisibility)
  props.editor.off('focus', updateVisibility)
  props.editor.off('blur', updateVisibility)
})

// ─── Floating position ────────────────────────────────────────────────────────

function getAnchorRect(): DOMRect | null {
  if (!show.value) return null
  const ed = props.editor
  const { from } = ed.state.selection
  const coords = ed.view.coordsAtPos(from)
  return new DOMRect(coords.left - 24, coords.top - 8, 0, 0)
}

const { position } = useEditorFloatingPosition({
  editor: props.editor,
  floatingRef,
  getAnchorRect,
  placement: 'right-start',
  offsetValue: 4,
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="floatingRef"
      class="rich-editor__overlay"
      :style="position
        ? { position: 'fixed', left: `${position.left}px`, top: `${position.top}px` }
        : { position: 'fixed', visibility: 'hidden', left: '0', top: '0' }"
    >
      <RichEditorToolbar
        :editor="editor"
        :items="items"
        layout="floating"
        :options="options"
      />
    </div>
  </Teleport>
</template>
