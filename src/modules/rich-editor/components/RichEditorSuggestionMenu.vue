<script setup lang="ts">
import { NIcon } from 'naive-ui'
import type { Editor } from '@tiptap/core'
import type { SuggestionMenuItem } from '../types/editor'
import { resolveEditorIcon, resolveEditorTextFallback } from '../config/icons'

defineProps<{
  editor: Editor
  range: { from: number; to: number } | null
  query: string
  items: SuggestionMenuItem[]
  selectedIndex: number
  position?: { left: string; top: string; transform?: string } | null
}>()

const emit = defineEmits<{
  close: []
  execute: [item: SuggestionMenuItem]
  keyDown: [{ event: KeyboardEvent }]
  'update:selectedIndex': [index: number]
}>()

function onKeydown(event: KeyboardEvent) {
  // ArrowUp/Down/Tab/Escape: navigation via onSlashKeyDown.
  // Enter: goes to onSlashKeyDown (in composable) → executeSelectedItem.
  emit('keyDown', { event })
}
</script>

<template>
  <div
    v-if="position"
    class="rich-editor__suggestion-menu"
    :style="position"
    @keydown="onKeydown"
  >
    <template v-if="items.length > 0">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        type="button"
        class="rich-editor__suggestion-item"
        :class="{ 'is-selected': index === selectedIndex }"
        @click="$emit('execute', item)"
        @mouseenter="$emit('update:selectedIndex', index)"
      >
        <span class="rich-editor__suggestion-item-icon">
          <n-icon v-if="resolveEditorIcon(item)" size="16">
            <component :is="resolveEditorIcon(item)" />
          </n-icon>
          <span v-else class="rich-editor__toolbar-text">{{ resolveEditorTextFallback(item) }}</span>
        </span>
        <span class="rich-editor__suggestion-item-text">{{ item.label }}</span>
      </button>
    </template>
    <div v-else class="rich-editor__suggestion-empty">
      No results
    </div>
  </div>
</template>
