<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/core'
import type { EditorToolbarItem } from '../types/editor'
import RichEditorToolbar from './RichEditorToolbar.vue'

interface ToolbarOptions {
  onInsertImage?: () => Promise<string>
  onOpenLinkEditor?: () => void
}

const props = defineProps<{
  editor: Editor
  items: EditorToolbarItem[][]
  shouldShow?: (ctx: { editor: Editor }) => boolean
  options?: ToolbarOptions
  position?: { left: string; top: string; transform?: string } | null
}>()

const emit = defineEmits<{
  openLinkEditor: []
}>()

const show = ref(false)

function updateVisibility() {
  if (!props.editor) return
  if (props.shouldShow) {
    show.value = props.shouldShow({ editor: props.editor })
  } else {
    // Default: show when editor has focus and has a selection
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

// Watch for shouldShow changes
watch(() => props.shouldShow, updateVisibility)
</script>

<template>
  <div
    v-if="show && position"
    class="rich-editor__overlay rich-editor__bubble-menu--white"
    :style="position"
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
