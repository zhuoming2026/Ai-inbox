<template>
  <div class="article-body-editor">
    <RichEditor
      v-model="model"
      content-type="markdown"
      placeholder="开始写作，输入 / 调出命令菜单…"
      min-height="100%"
      max-width="100%"
      :on-insert-image="handleInsertImage"
    />
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { RichEditor } from '../modules/rich-editor'

const model = defineModel<string>({ default: '' })
const message = useMessage()

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
