<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NIcon } from 'naive-ui'
import type { Editor } from '@tiptap/core'
import { linkPopoverIcons } from '../config/icons'
import { useEditorFloatingPosition } from '../composables/useEditorFloatingPosition'

const props = defineProps<{
  editor: Editor
}>()

const open = defineModel<boolean>('open', { default: false })
const floatingRef = ref<HTMLElement | null>(null)

const url = ref('')
const active = computed(() => props.editor.isActive('link'))

const disabled = computed(() => {
  if (!props.editor.isEditable) return true
  const { selection } = props.editor.state
  return selection.empty && !props.editor.isActive('link')
})

// Sync URL when selection changes
watch(
  () => props.editor.state.selection,
  () => {
    if (props.editor.isActive('link')) {
      url.value = props.editor.getAttributes('link').href || ''
    }
  },
  { immediate: true }
)

// ─── Floating position ────────────────────────────────────────────────────────

function getAnchorRect(): DOMRect | null {
  if (!open.value) return null
  const ed = props.editor
  const { from, to } = ed.state.selection
  const start = ed.view.coordsAtPos(from)
  const end = ed.view.coordsAtPos(to)
  const midX = (start.left + end.right) / 2
  return new DOMRect(midX, start.top, 0, Math.max(start.bottom, end.bottom) - start.top)
}

const { position } = useEditorFloatingPosition({
  editor: props.editor,
  floatingRef,
  getAnchorRect,
  placement: 'top',
  offsetValue: 12,
})

// ─── Actions ──────────────────────────────────────────────────────────────────

function apply() {
  if (!url.value) return

  const { selection } = props.editor.state
  const isEmpty = selection.empty
  const hasCode = props.editor.isActive('code')

  let chain = props.editor.chain().focus()

  if (hasCode && !isEmpty) {
    chain = chain.extendMarkRange('code').setLink({ href: url.value })
  } else {
    chain = chain.extendMarkRange('link').setLink({ href: url.value })
    if (isEmpty) {
      chain = chain.insertContent({ type: 'text', text: url.value })
    }
  }

  chain.run()
  open.value = false
}

function remove() {
  props.editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .unsetLink()
    .setMeta('preventAutolink', true)
    .run()
  url.value = ''
  open.value = false
}

function openInNewTab() {
  if (!url.value) return
  window.open(url.value, '_blank', 'noopener,noreferrer')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    apply()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="floatingRef"
      class="rich-editor__overlay rich-editor__link-popover"
      :style="position
        ? { position: 'fixed', left: `${position.left}px`, top: `${position.top}px` }
        : { position: 'fixed', visibility: 'hidden', left: '0', top: '0' }"
      @keydown="handleKeydown"
    >
      <div class="rich-editor__link-popover-main">
        <span class="rich-editor__link-popover-label">Edit Link</span>
        <div class="rich-editor__link-popover-input-wrap">
          <span class="rich-editor__link-popover-leading" aria-hidden="true">
            <n-icon size="15">
              <component :is="linkPopoverIcons.open" />
            </n-icon>
          </span>
          <input
            v-model="url"
            type="url"
            placeholder="Paste a link..."
            :disabled="disabled"
            @keydown="handleKeydown"
          />
        </div>
      </div>

      <div class="rich-editor__link-popover-actions">
        <button
          type="button"
          class="is-primary"
          title="Apply link"
          :disabled="!url && !active"
          @click="apply"
        >
          <n-icon size="15">
            <component :is="linkPopoverIcons.apply" />
          </n-icon>
        </button>
        <button
          type="button"
          title="Open in new tab"
          :disabled="!url && !active"
          @click="openInNewTab"
        >
          <n-icon size="15">
            <component :is="linkPopoverIcons.open" />
          </n-icon>
        </button>
        <button
          type="button"
          title="Remove link"
          :disabled="!url && !active"
          @click="remove"
        >
          <n-icon size="15">
            <component :is="linkPopoverIcons.remove" />
          </n-icon>
        </button>
      </div>
    </div>
  </Teleport>
</template>
