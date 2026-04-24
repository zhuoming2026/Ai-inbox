<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, withDefaults, defineProps, defineEmits, defineExpose } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'
import type { RichEditorProps, RichEditorEmits } from '../types/editor'
import { createStarterKit } from '../extensions/starter'
import { LinkExtension } from '../extensions/link'
import { ImageExtension } from '../extensions/image'
import { tableExtensions } from '../extensions/table'
import { createPlaceholder } from '../extensions/placeholder'
import { createSlashCommand } from '../extensions/slash-command'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from '@tiptap/markdown'
import { useFixedToolbarItems, useBubbleToolbarItems, useFloatingToolbarItems } from '../composables/useToolbarItems'
import { useSlashCommand } from '../composables/useSlashCommand'
import RichEditorToolbar from './RichEditorToolbar.vue'
import RichEditorBubbleMenu from './RichEditorBubbleMenu.vue'
import RichEditorFloatingMenu from './RichEditorFloatingMenu.vue'
import RichEditorSuggestionMenu from './RichEditorSuggestionMenu.vue'
import RichEditorLinkPopover from './RichEditorLinkPopover.vue'

import '../styles/editor.css'
import '../styles/theme.css'
import '../styles/typography/base.css'
import '../styles/typography/themes/default.css'
import '../styles/typography/themes/serif.css'
import '../styles/typography/themes/typora-github.css'
import '../styles/code-themes/github.css'
import '../styles/code-themes/night.css'
import '../styles/code-themes/paper.css'
import '../styles/code-themes/maize.css'

const props = withDefaults(defineProps<RichEditorProps>(), {
  modelValue: '',
  contentType: 'html',
  placeholder: "Write, type '/' for commands...",
  editable: true,
  toolbar: true,
  bubble: true,
  floating: true,
  minHeight: '300px',
  maxWidth: '100%',
  contentTheme: 'default',
  starterKit: () => ({ undoRedo: true }),
})

const resolvedTypographyTheme = computed(() => props.typographyTheme ?? props.contentTheme ?? 'default')
const resolvedCodeTheme = computed(() => props.codeTheme ?? 'github')

const emit = defineEmits<RichEditorEmits>()

const rootRef = ref<HTMLElement | null>(null)
const linkPopoverOpen = ref(false)

// ─── Content helpers ─────────────────────────────────────────────────────────

function getEditorContent(value: string, contentType: string): any {
  if (!value) return value
  if (contentType === 'json') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function getOutputContent(ed: Editor, contentType: string): string {
  switch (contentType) {
    case 'json':
      return JSON.stringify(ed.getJSON())
    case 'markdown':
      return ed.storage.markdown?.manager.serialize(ed.getJSON()) ?? ed.getHTML()
    case 'html':
    default:
      return ed.getHTML()
  }
}

function looksLikeMarkdown(text: string) {
  const sample = text.trim()
  if (!sample || sample.length < 2) return false

  return [
    /^#{1,6}\s/m,
    /^>\s/m,
    /^[-*+]\s/m,
    /^\d+\.\s/m,
    /^[-*+]\s\[[ xX]\]\s/m,   // task list: "- [ ]", "* [x]", "+ [X]"
    /^```/m,
    /\[.+?\]\(.+?\)/,
    /!\[.*?\]\(.+?\)/,
    /^---$/m,
    /\*\*[^*]+\*\*/,
  ].some((pattern) => pattern.test(sample))
}

// ─── Toolbar items ────────────────────────────────────────────────────────────

const editorOptions = {
  onInsertImage: props.onInsertImage,
  onOpenLinkEditor: () => { linkPopoverOpen.value = true },
}

const fixedItems = useFixedToolbarItems(() => editor.value, editorOptions)
const bubbleItems = useBubbleToolbarItems(() => editor.value, editorOptions)
const floatingItems = useFloatingToolbarItems(() => editor.value, editorOptions)

// ─── Slash command state ─────────────────────────────────────────────────────
//
// The slash extension is added to the editor's extensions array below.
// Its Suggestion callbacks (onTrigger, onQueryUpdate, onKeyDown) close over
// these reactive state setters so RichEditorSuggestionMenu stays in sync.

const {
  showSuggestionMenu,
  slashRange,
  slashQuery,
  selectedIndex,
  filteredItems,
  triggerSlash,
  updateSlashQuery,
  onSlashKeyDown,
  executeSelectedItem,
} = useSlashCommand(() => editor.value)

// ─── Editor ───────────────────────────────────────────────────────────────────

const initialContent = props.contentType === 'markdown'
  ? props.modelValue
  : getEditorContent(props.modelValue, props.contentType)

const editor = useEditor({
  content: initialContent,
  editable: props.editable,
  extensions: [
    createStarterKit(props.starterKit),
    Underline,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    LinkExtension,
    ImageExtension,
    ...tableExtensions,
    createPlaceholder(props.placeholder),
    Markdown,
    // Slash command — TipTap Suggestion extension handles / detection,
    // fires triggerSlash / updateSlashQuery callbacks to update UI state.
    createSlashCommand({
      onTrigger: (range) => {
        triggerSlash(range)
      },
      onQueryUpdate: (query) => {
        updateSlashQuery(query)
      },
      onClose: () => {
        showSuggestionMenu.value = false
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        return onSlashKeyDown(props.event)
      },
    }),
  ],
  editorProps: {
    attributes: {
      class: 'tiptap rich-editor__content',
      style: `max-width: ${props.maxWidth};`,
    },
    handlePaste(view, event) {
      const text = event.clipboardData?.getData('text/plain') ?? ''

      // Only attempt markdown paste if there's text and it looks like markdown.
      // Presence of HTML alone should not block markdown detection — many copy
      // sources include both HTML and plain text; we prefer plain text when
      // it is valid markdown.
      if (!text || !looksLikeMarkdown(text)) {
        return false
      }

      event.preventDefault()
      view.dispatch(view.state.tr)
      editor.value?.commands.insertContent(text, { contentType: 'markdown' })
      return true
    },
  },
  onUpdate: ({ editor: ed }) => {
    const value = getOutputContent(ed, props.contentType)
    emit('update:modelValue', value)
  },
  onFocus: ({ event }) => {
    emit('focus', event)
  },
  onBlur: ({ event }) => {
    emit('blur', event)
  },
  onSelectionUpdate: ({ editor: ed }) => {
    const { from, to } = ed.state.selection
    emit('selectionChange', { from, to })
  },
  onCreate: ({ editor: ed }) => {
    emit('ready', ed)
  },
})

// ─── Sync props → editor ──────────────────────────────────────────────────────

watch(() => props.modelValue, (val) => {
  const ed = editor.value
  if (!ed) return
  const currentContent = getOutputContent(ed, props.contentType)
  if (currentContent !== val) {
    if (props.contentType === 'markdown') {
      ed.commands.setContent(val, { contentType: 'markdown', emitUpdate: false })
    } else {
      const parsed = getEditorContent(val, props.contentType)
      ed.commands.setContent(parsed, { emitUpdate: false })
    }
  }
})

watch(() => props.editable, (val) => {
  editor.value?.setEditable(val)
})

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// ─── Expose ───────────────────────────────────────────────────────────────────

defineExpose({ editor })
</script>

<template>
  <div
    ref="rootRef"
    class="rich-editor"
    :class="{ 'rich-editor--readonly': !editable }"
    :data-content-theme="resolvedTypographyTheme"
    :data-typography-theme="resolvedTypographyTheme"
    :data-code-theme="resolvedCodeTheme"
  >
    <!-- Fixed Toolbar -->
    <RichEditorToolbar
      v-if="toolbar && editor"
      :editor="editor"
      :items="fixedItems"
      :options="editorOptions"
      layout="fixed"
      @open-link-editor="linkPopoverOpen = true"
    >
      <template #end>
        <slot name="toolbar-end" />
      </template>
    </RichEditorToolbar>

    <!-- Editor Content -->
    <div class="rich-editor__scroll-wrapper">
      <EditorContent :editor="editor" />
    </div>

    <!-- Bubble Menu (selection toolbar) -->
    <RichEditorBubbleMenu
      v-if="bubble && editor"
      :editor="editor"
      :items="bubbleItems"
      :options="editorOptions"
      :should-show="({ editor: ed }) => {
        const { selection } = ed.state
        return !selection.empty && ed.isFocused
      }"
      @open-link-editor="linkPopoverOpen = true"
    />

    <!-- Floating Menu (empty line) -->
    <RichEditorFloatingMenu
      v-if="floating && editor"
      :editor="editor"
      :items="floatingItems"
      :options="editorOptions"
    />

    <!-- Slash Command Suggestion Menu -->
    <RichEditorSuggestionMenu
      v-if="showSuggestionMenu && editor"
      :editor="editor"
      :range="slashRange"
      :query="slashQuery"
      :items="filteredItems"
      :selected-index="selectedIndex"
      @close="showSuggestionMenu = false"
      @execute="executeSelectedItem"
      @key-down="({ event }) => onSlashKeyDown(event)"
      @update:selected-index="(i) => { selectedIndex = i }"
    />

    <!-- Link Popover -->
    <RichEditorLinkPopover
      v-if="editor && linkPopoverOpen"
      v-model:open="linkPopoverOpen"
      :editor="editor"
    />
  </div>
</template>
