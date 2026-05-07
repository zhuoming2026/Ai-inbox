<template>
  <div class="article-body-editor">
    <RichEditor
      ref="richEditorRef"
      v-model="model"
      content-type="markdown"
      :typography-theme="resolvedTypographyTheme"
      :code-theme="resolvedCodeTheme"
      placeholder="开始写作，输入 / 调出命令菜单…"
      :toolbar="toolbar"
      min-height="100%"
      max-width="100%"
      :on-insert-image="handleInsertImage"
      @selection-change="handleSelectionChange"
    >
      <template #toolbar-end>
        <slot name="toolbar-end" />
      </template>
    </RichEditor>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Editor } from '@tiptap/core'
import { useMessage } from 'naive-ui'
import { RichEditor, type EditorCodeTheme, type TypographyTheme } from '../modules/rich-editor'
import { isBuiltInTypographyTheme } from '../modules/rich-editor/types/editor'

const props = defineProps<{
  typographyTheme?: TypographyTheme
  codeTheme?: EditorCodeTheme
  toolbar?: boolean
}>()

const toolbar = computed(() => props.toolbar ?? true)

const emit = defineEmits<{
  (e: 'selectionChange', selection: { from: number; to: number }): void
}>()

const model = defineModel<string>({ default: '' })
const message = useMessage()
const richEditorRef = ref<InstanceType<typeof RichEditor> | null>(null)
const typographyTheme = ref<TypographyTheme>('typora-github')
const codeTheme = ref<EditorCodeTheme>('github')
const resolvedTypographyTheme = computed(() => props.typographyTheme ?? typographyTheme.value)
const resolvedCodeTheme = computed(() => props.codeTheme ?? codeTheme.value)

function getEditorInstance(): Editor | null {
  const exposed = richEditorRef.value as unknown as { editor?: Editor | { value?: Editor | null } } | null
  if (!exposed?.editor) return null
  const maybeRef = exposed.editor as { value?: Editor | null }
  return maybeRef.value ?? exposed.editor as Editor
}

function extractUrlFromText(text: string) {
  return text.match(/https?:\/\/[^\s<>)"']+/)?.[0]?.replace(/[),.;]+$/, '') || ''
}

function getSelectedLinkCandidate() {
  const editor = getEditorInstance()
  if (!editor) return null

  const { from, to, empty } = editor.state.selection
  const urls = new Set<string>()
  const activeHref = editor.getAttributes('link')?.href
  if (typeof activeHref === 'string' && activeHref.trim()) {
    urls.add(activeHref.trim())
  }

  if (!empty) {
    editor.state.doc.nodesBetween(from, to, (node) => {
      for (const mark of node.marks) {
        if (mark.type.name === 'link' && typeof mark.attrs.href === 'string') {
          urls.add(mark.attrs.href.trim())
        }
      }
    })
  }

  const selectedText = empty ? '' : editor.state.doc.textBetween(from, to, ' ').trim()
  const textUrl = extractUrlFromText(selectedText)
  if (textUrl) urls.add(textUrl)

  const url = [...urls].find(Boolean)
  if (!url) return null
  return {
    url,
    text: selectedText,
  }
}

function handleSelectionChange(selection: { from: number; to: number }) {
  emit('selectionChange', selection)
}

async function syncTypographyThemeFromSettings() {
  const settings = await window.electronAPI?.getSettings()
  const typographyValue = settings?.editorTypographyTheme
  const codeValue = settings?.editorCodeTheme
  if (isBuiltInTypographyTheme((typographyValue as string) ?? '')) {
    typographyTheme.value = typographyValue
  }
  if (codeValue === 'github' || codeValue === 'night' || codeValue === 'paper' || codeValue === 'maize') {
    codeTheme.value = codeValue
  }
}

async function handleInsertImage() {
  const url = window.prompt('输入图片 URL')
  if (!url) return ''

  const trimmed = url.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      message.error('仅支持 http 或 https 图片链接')
      return ''
    }
    return parsed.toString()
  } catch {
    message.error('请输入有效的图片 URL')
    return ''
  }
}

function handleSettingsChanged(event: Event) {
  const detail = (event as CustomEvent<Record<string, unknown>>).detail
  const typographyValue = detail?.editorTypographyTheme
  const codeValue = detail?.editorCodeTheme
  if (isBuiltInTypographyTheme((typographyValue as string) ?? '')) {
    typographyTheme.value = typographyValue as TypographyTheme
  }
  if (codeValue === 'github' || codeValue === 'night' || codeValue === 'paper' || codeValue === 'maize') {
    codeTheme.value = codeValue
  }
}

onMounted(() => {
  void syncTypographyThemeFromSettings()
  window.addEventListener('settings-changed', handleSettingsChanged as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('settings-changed', handleSettingsChanged as EventListener)
})

defineExpose({
  getSelectedLinkCandidate,
})
</script>

<style scoped>
.article-body-editor {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  height: 100%;
}
</style>
