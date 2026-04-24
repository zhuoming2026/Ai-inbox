<script setup lang="ts">
import { computed, ref } from 'vue'
import { NIcon } from 'naive-ui'
import type { Editor } from '@tiptap/core'
import type { SuggestionMenuItem } from '../types/editor'
import { resolveEditorIcon, resolveEditorTextFallback } from '../config/icons'
import { useEditorFloatingPosition } from '../composables/useEditorFloatingPosition'

const props = defineProps<{
  editor: Editor
  range: { from: number; to: number } | null
  query: string
  items: SuggestionMenuItem[]
  selectedIndex: number
}>()

const emit = defineEmits<{
  close: []
  execute: [item: SuggestionMenuItem]
  keyDown: [{ event: KeyboardEvent }]
  'update:selectedIndex': [index: number]
}>()

const floatingRef = ref<HTMLElement | null>(null)

const placement = computed(() => {
  if (!props.range) return 'bottom-start'
  const coords = props.editor.view.coordsAtPos(props.range.from)
  const viewportMiddle = window.innerHeight / 2
  return coords.top > viewportMiddle ? 'top-start' : 'bottom-start'
})

// ─── Floating position ────────────────────────────────────────────────────────
// Use bottom-start placement: flip() will auto-flip to top if near bottom of viewport.
// The anchor is the / query range start — below the cursor.

function getAnchorRect(): DOMRect | null {
  if (!props.range) return null
  const ed = props.editor
  const { from, to } = props.range
  const start = ed.view.coordsAtPos(from)
  const end = ed.view.coordsAtPos(to)
  return new DOMRect(start.left, start.top, Math.max(1, end.left - start.left), Math.max(1, start.bottom - start.top))
}

const { position } = useEditorFloatingPosition({
  editor: props.editor,
  floatingRef,
  getAnchorRect,
  placement: () => placement.value,
  offsetValue: 8,
})

function onKeydown(event: KeyboardEvent) {
  emit('keyDown', { event })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="range"
      ref="floatingRef"
      class="rich-editor__overlay rich-editor__suggestion-menu"
      :style="position
        ? { position: 'fixed', left: `${position.left}px`, top: `${position.top}px` }
        : { position: 'fixed', visibility: 'hidden', left: '0', top: '0' }"
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
  </Teleport>
</template>
