<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NIcon } from 'naive-ui'
import type { Editor } from '@tiptap/core'
import { linkPopoverIcons } from '../config/icons'

const props = defineProps<{
  editor: Editor
  position?: { left: string; top: string; transform?: string } | null
}>()

const open = defineModel<boolean>('open', { default: false })

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
  <div
    v-if="open && position"
    class="rich-editor__link-popover"
    :style="position"
    @keydown="handleKeydown"
  >
    <input
      v-model="url"
      type="url"
      placeholder="Paste a link..."
      :disabled="disabled"
      @keydown="handleKeydown"
    />
    <button
      type="button"
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
</template>
