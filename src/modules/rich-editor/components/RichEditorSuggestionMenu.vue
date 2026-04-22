<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import type { Editor } from '@tiptap/core'
import type { SuggestionMenuItem } from '../types/editor'
import { suggestionMenuGroups } from '../config/suggestion-menu'
import { resolveEditorIcon, resolveEditorTextFallback } from '../config/icons'

const props = defineProps<{
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
  enter: []
  keyDown: [{ event: KeyboardEvent }]
  'update:selectedIndex': [index: number]
}>()

function onKeydown(event: KeyboardEvent) {
  // Enter is handled separately via @enter emit, not via @keyDown.
  // Arrow keys and Escape go through @keyDown for navigation.
  if (event.key === 'Enter') {
    emit('enter')
    event.preventDefault()
    return
  }
  emit('keyDown', { event })
}

function selectItem(item: SuggestionMenuItem) {
  // Emit the selected item so RichEditor can handle execution.
  emit('execute', item)
}

// Grouped items for display
const groupedItems = computed(() => {
  return suggestionMenuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => props.items.some(ai => ai.id === item.id)),
    }))
    .filter(group => group.items.length > 0)
})
</script>

<template>
  <div
    v-if="position"
    class="rich-editor__suggestion-menu"
    :style="position"
    @keydown="onKeydown"
  >
    <template v-if="items.length > 0">
      <template v-for="group in groupedItems" :key="group.label">
        <div class="rich-editor__suggestion-group">
          <div class="rich-editor__suggestion-group-label">{{ group.label }}</div>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="rich-editor__suggestion-item"
            :class="{ 'is-selected': items.findIndex(ai => ai.id === item.id) === selectedIndex }"
            @click="selectItem(item)"
            @mouseenter="$emit('update:selectedIndex', items.findIndex(ai => ai.id === item.id))"
          >
            <span class="rich-editor__suggestion-item-icon">
              <n-icon v-if="resolveEditorIcon(item)" size="16">
                <component :is="resolveEditorIcon(item)" />
              </n-icon>
              <span v-else class="rich-editor__toolbar-text">{{ resolveEditorTextFallback(item) }}</span>
            </span>
            <div>
              <div class="rich-editor__suggestion-item-text">{{ item.label }}</div>
              <div v-if="item.description" class="rich-editor__suggestion-item-description">
                {{ item.description }}
              </div>
            </div>
          </button>
        </div>
      </template>
    </template>
    <div v-else class="rich-editor__suggestion-group">
      <div class="rich-editor__suggestion-group-label" style="padding: 0.5rem;">
        No results
      </div>
    </div>
  </div>
</template>
