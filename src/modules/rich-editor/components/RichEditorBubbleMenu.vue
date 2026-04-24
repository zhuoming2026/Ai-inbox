<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
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
  shouldShow?: (ctx: { editor: Editor }) => boolean
  options?: ToolbarOptions
}>()

const emit = defineEmits<{
  openLinkEditor: []
}>()

const show = ref(false)
const floatingRef = ref<HTMLElement | null>(null)

// ─── Show/hide logic ─────────────────────────────────────────────────────────

function updateVisibility() {
  if (!props.editor) return
  if (props.shouldShow) {
    show.value = props.shouldShow({ editor: props.editor })
  } else {
    const { selection } = props.editor.state
    show.value = !selection.empty && props.editor.isFocused
  }
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

watch(() => props.shouldShow, updateVisibility)

// ─── Floating position ────────────────────────────────────────────────────────

function getAnchorRect(): DOMRect | null {
  if (!show.value) return null
  const ed = props.editor
  const { from, to, empty } = ed.state.selection
  if (empty) return null

  const start = ed.view.coordsAtPos(from)
  const end = ed.view.coordsAtPos(to)
  const midX = (start.left + end.right) / 2
  const top = Math.min(start.top, end.top)
  return new DOMRect(midX, top, 0, Math.max(start.bottom, end.bottom) - top)
}

const { position } = useEditorFloatingPosition({
  editor: props.editor,
  floatingRef,
  getAnchorRect,
  placement: 'top',
  offsetValue: 8,
})

// ─── Actions ──────────────────────────────────────────────────────────────────
</script>

<template>
  <div
    v-if="show"
    ref="floatingRef"
    class="rich-editor__overlay rich-editor__bubble-menu--white"
    :style="position
      ? { position: 'fixed', left: `${position.left}px`, top: `${position.top}px` }
      : { position: 'fixed', visibility: 'hidden', left: '0', top: '0' }"
  >
    <RichEditorToolbar
      :editor="editor"
      :items="items"
      layout="bubble"
      :options="options"
      @open-link-editor="emit('openLinkEditor')"
    />
  </div>
</template>
