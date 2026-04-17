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
    fontFamily: 'Source Sans 3, Nunito Sans, system-ui, sans-serif',
  },
}

const article = ref<any>(null)
const content = ref('')
const lastSaved = ref('')

const renderedContent = computed(() => {
  let html = content.value
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
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
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-8);
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.back-btn {
  width: var(--btn-height-md);
  height: var(--btn-height-md);
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  color: var(--text-primary);
}

.back-btn:hover {
  background: var(--bg-secondary);
}

.logo {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--text-primary);
  margin: 0;
}

.logo-x {
  color: var(--color-primary);
}

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
  border-right: 1px solid var(--border-color);
}

.panel-label {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-muted);
  padding: var(--space-3) var(--space-6);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-label);
  flex-shrink: 0;
}

.markdown-textarea {
  flex: 1;
  width: 100%;
  padding: var(--space-6);
  border: none;
  outline: none;
  resize: none;
  font-family: var(--font-editor);
  font-size: var(--text-lg);
  line-height: 1.8;
  color: var(--text-primary);
  background: var(--bg-card);
}

.markdown-textarea::placeholder {
  color: var(--text-placeholder);
}

.bytemd-viewer {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
  font-family: var(--font-editor);
  font-size: var(--text-lg);
  line-height: 1.8;
  color: var(--text-primary);
  background: var(--bg-label);
}

.bytemd-viewer :deep(h1) {
  font-size: var(--text-3xl);
  margin: var(--space-6) 0 var(--space-4);
}

.bytemd-viewer :deep(h2) {
  font-size: var(--text-2xl);
  margin: var(--space-5) 0 var(--space-3);
}

.bytemd-viewer :deep(h3) {
  font-size: var(--text-xl);
  margin: var(--space-4) 0 var(--space-2);
}

.bytemd-viewer :deep(p) {
  margin: var(--space-3) 0;
}

.bytemd-viewer :deep(code) {
  background: var(--bg-primary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sharp);
  font-family: var(--font-mono);
  font-size: var(--text-base);
}

.bytemd-viewer :deep(pre) {
  background: var(--bg-primary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.bytemd-viewer :deep(pre code) {
  background: none;
  padding: 0;
}

.bytemd-viewer :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  padding-left: var(--space-4);
  margin: var(--space-4) 0;
  font-style: italic;
}

.bytemd-viewer :deep(ul),
.bytemd-viewer :deep(ol) {
  margin: var(--space-3) 0;
  padding-left: var(--space-6);
}

.bytemd-viewer :deep(li) {
  margin: var(--space-1) 0;
}

.bytemd-viewer :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
}

.bytemd-viewer :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: var(--space-6) 0;
}
</style>
