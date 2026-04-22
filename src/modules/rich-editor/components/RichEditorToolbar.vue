<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import type { Editor } from '@tiptap/core'
import type { EditorToolbarItem } from '../types/editor'
import { executeToolbarItem } from '../composables/useToolbarItems'
import { resolveEditorIcon, resolveEditorTextFallback } from '../config/icons'

interface ToolbarOptions {
  onInsertImage?: () => Promise<string>
  onOpenLinkEditor?: () => void
}

const props = defineProps<{
  editor: Editor
  items: EditorToolbarItem[][]
  layout?: 'fixed' | 'bubble' | 'floating'
  options?: ToolbarOptions
}>()

const layout = computed(() => props.layout ?? 'fixed')

const emit = defineEmits<{
  openLinkEditor: []
}>()

function handleItemClick(item: EditorToolbarItem) {
  if (item.slot === 'link') {
    emit('openLinkEditor')
    return
  }
  executeToolbarItem(props.editor, item, props.options ?? {})
}

</script>

<template>
  <div
    class="rich-editor__toolbar"
    :class="{
      'rich-editor__bubble-menu': layout === 'bubble',
      'rich-editor__floating-menu': layout === 'floating',
    }"
  >
    <template v-for="(group, gi) in items" :key="gi">
      <!-- Separator between groups -->
      <div v-if="gi > 0" class="rich-editor__toolbar-separator" />

      <div class="rich-editor__toolbar-group">
        <button
          v-for="item in group"
          :key="item.kind"
          type="button"
          class="rich-editor__toolbar-btn"
          :class="{ 'is-active': item.active }"
          :disabled="item.disabled"
          :title="item.tooltip ?? item.label"
          @click="handleItemClick(item)"
        >
          <n-icon v-if="resolveEditorIcon(item)" size="16">
            <component :is="resolveEditorIcon(item)" />
          </n-icon>
          <span v-else class="rich-editor__toolbar-text">{{ resolveEditorTextFallback(item) }}</span>
        </button>
      </div>
    </template>
  </div>
</template>
