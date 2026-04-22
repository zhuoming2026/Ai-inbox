<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
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
  options?: ToolbarOptions
  position?: { left: string; top: string; transform?: string } | null
}>()

const show = ref(false)

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
</script>

<template>
  <div
    v-if="show && position"
    class="rich-editor__overlay"
    :style="position"
  >
    <RichEditorToolbar
      :editor="editor"
      :items="items"
      layout="floating"
      :options="options"
    />
  </div>
</template>
