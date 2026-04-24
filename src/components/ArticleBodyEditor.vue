<template>
  <div class="article-body-editor">
    <RichEditor
      v-model="model"
      content-type="markdown"
      :typography-theme="resolvedTypographyTheme"
      :code-theme="resolvedCodeTheme"
      placeholder="开始写作，输入 / 调出命令菜单…"
      min-height="100%"
      max-width="100%"
      :on-insert-image="handleInsertImage"
    >
      <template #toolbar-end>
        <slot name="toolbar-end" />
      </template>
    </RichEditor>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { RichEditor, type EditorCodeTheme, type TypographyTheme } from '../modules/rich-editor'

const props = defineProps<{
  typographyTheme?: TypographyTheme
  codeTheme?: EditorCodeTheme
}>()

const model = defineModel<string>({ default: '' })
const message = useMessage()
const typographyTheme = ref<TypographyTheme>('typora-github')
const codeTheme = ref<EditorCodeTheme>('github')
const resolvedTypographyTheme = computed(() => props.typographyTheme ?? typographyTheme.value)
const resolvedCodeTheme = computed(() => props.codeTheme ?? codeTheme.value)

async function syncTypographyThemeFromSettings() {
  const settings = await window.electronAPI?.getSettings()
  const typographyValue = settings?.editorTypographyTheme
  const codeValue = settings?.editorCodeTheme
  if (typographyValue === 'default' || typographyValue === 'serif' || typographyValue === 'typora-github') {
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
  if (typographyValue === 'default' || typographyValue === 'serif' || typographyValue === 'typora-github') {
    typographyTheme.value = typographyValue
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
