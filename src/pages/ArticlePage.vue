<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="article-page">
        <!-- Header -->
        <header class="header">
          <button class="back-btn" @click="$router.back()">
            <n-icon><ArrowBackIcon /></n-icon>
          </button>
          <h1 class="logo">Ai-In<span class="logo-x">box</span></h1>
        </header>

        <!-- Editor Area -->
        <main class="editor-area">
          <!-- Edit Panel -->
          <div class="edit-panel">
            <div class="panel-label">Edit</div>
            <textarea
              v-model="content"
              class="markdown-textarea"
              placeholder="Start writing..."
              @input="onContentChange"
            ></textarea>
          </div>

          <!-- Preview Panel -->
          <div class="preview-panel">
            <div class="panel-label">Preview</div>
            <div class="bytemd-viewer" v-html="renderedContent"></div>
          </div>
        </main>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NConfigProvider,
  NIcon,
  NMessageProvider,
  type GlobalThemeOverrides,
} from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'

const route = useRoute()
const router = useRouter()
const slug = route.params.slug as string

const ArrowBackIcon = h(NIcon, null, () => h(ArrowBackOutline))

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#fabb18',
    fontFamily: 'Inter, PingFang SC, sans-serif',
  },
}

const article = ref<any>(null)
const content = ref('')
const lastSaved = ref('')

// 简单的 Markdown 转 HTML
const renderedContent = computed(() => {
  let html = content.value
    // 标题
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 粗体斜体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 代码
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 引用
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // 列表
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    // 换行
    .replace(/\n/g, '<br>')

  return html
})

onMounted(async () => {
  const data = await window.electronAPI?.readFile(slug)
  if (data) {
    try {
      article.value = typeof data === 'string' ? JSON.parse(data) : data
      content.value = article.value?.raw || article.value?.body || ''
    } catch {
      article.value = { raw: data, created: new Date().toISOString() }
      content.value = typeof data === 'string' ? data : ''
    }
    lastSaved.value = content.value
  }
})

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function onContentChange() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveArticle()
  }, 500)
}

async function saveArticle() {
  if (content.value !== lastSaved.value) {
    const updated = {
      ...article.value,
      body: content.value,
      raw: content.value,
      updated: new Date().toISOString(),
    }
    await window.electronAPI?.updateFile(slug, updated)
    article.value = updated
    lastSaved.value = content.value
  }
}

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveArticle()
})

router.beforeEach((_to, _from, next) => {
  saveArticle()
  next()
})
</script>

<style scoped>
.article-page {
  width: 100%;
  height: 100vh;
  background: #f5f4ed;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 32px;
  background: #ffffff;
  border-bottom: 1px solid rgba(26, 26, 26, 0.08);
  flex-shrink: 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(26, 26, 26, 0.1);
  background: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #f5f4ed;
}

.logo {
  font-family: 'Acme', sans-serif;
  font-size: 24px;
  color: #1a1a1a;
  margin: 0;
}

.logo-x {
  color: #fabb18;
}

/* Editor Area */
.editor-area {
  flex: 1;
  display: flex;
  min-height: 0;
}

.edit-panel,
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.edit-panel {
  border-right: 1px solid rgba(26, 26, 26, 0.08);
}

.panel-label {
  font-family: 'Acme', sans-serif;
  font-size: 18px;
  color: rgba(26, 26, 26, 0.3);
  padding: 12px 24px;
  border-bottom: 1px solid rgba(26, 26, 26, 0.05);
  background: #fafaf8;
  flex-shrink: 0;
}

/* Textarea Editor */
.markdown-textarea {
  flex: 1;
  width: 100%;
  padding: 24px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Newsreader', serif;
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
  background: #ffffff;
}

.markdown-textarea::placeholder {
  color: rgba(26, 26, 26, 0.3);
}

/* Preview Area */
.bytemd-viewer {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  font-family: 'Newsreader', serif;
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
  background: #fafaf8;
}

.bytemd-viewer :deep(h1) {
  font-size: 30px;
  margin: 24px 0 16px;
}

.bytemd-viewer :deep(h2) {
  font-size: 24px;
  margin: 20px 0 12px;
}

.bytemd-viewer :deep(h3) {
  font-size: 20px;
  margin: 16px 0 8px;
}

.bytemd-viewer :deep(p) {
  margin: 12px 0;
}

.bytemd-viewer :deep(code) {
  background: #f5f4ed;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Source Code Pro', monospace;
  font-size: 16px;
}

.bytemd-viewer :deep(pre) {
  background: #f5f4ed;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

.bytemd-viewer :deep(pre code) {
  background: none;
  padding: 0;
}

.bytemd-viewer :deep(blockquote) {
  border-left: 3px solid #fabb18;
  padding-left: 16px;
  margin: 16px 0;
  font-style: italic;
}

.bytemd-viewer :deep(ul),
.bytemd-viewer :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

.bytemd-viewer :deep(li) {
  margin: 4px 0;
}

.bytemd-viewer :deep(a) {
  color: #fabb18;
  text-decoration: underline;
}

.bytemd-viewer :deep(hr) {
  border: none;
  border-top: 1px solid rgba(26, 26, 26, 0.1);
  margin: 24px 0;
}
</style>
