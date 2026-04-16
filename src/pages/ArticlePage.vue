<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="article-page">
        <div class="page-background">
          <!-- Main Column: Editor -->
          <div class="main-column">
            <div class="header">
              <button class="back-btn" @click="$router.back()">
                <n-icon><ArrowBackIcon /></n-icon>
              </button>
              <h1 class="logo">Ai-In<span class="logo-x">box</span></h1>
            </div>

            <div class="editor-container">
              <div class="editor-header">
                <span
                  :class="['mode-btn', { active: mode === 'edit' }]"
                  @click="mode = 'edit'"
                >Edit</span>
                <span class="mode-divider">|</span>
                <span
                  :class="['mode-btn', { active: mode === 'preview' }]"
                  @click="mode = 'preview'"
                >Preview</span>
              </div>

              <div class="editor-body">
                <div v-if="mode === 'edit'" class="edit-area">
                  <Editor
                    v-model="content"
                    class="bytemd-editor"
                    @change="onContentChange"
                  />
                </div>
                <div v-else class="preview-area">
                  <Viewer :value="content" class="bytemd-viewer" />
                </div>
              </div>
            </div>
          </div>

          <!-- Right Sidebar: Preview -->
          <aside class="preview-sidebar">
            <button class="close-btn" @click="$router.back()">
              <n-icon><CloseIcon /></n-icon>
            </button>

            <div class="preview-content">
              <!-- AI Insights -->
              <div class="insights-card">
                <div class="insights-header">
                  <span class="insights-dot"></span>
                  <span class="insights-title">AI INSIGHTS</span>
                </div>
                <p class="insights-quote">
                  "This article posits that library design is not merely functional but symbolic of the hierarchical nature of human knowledge in the Enlightenment era."
                </p>
                <div class="insights-tags">
                  <span class="tag tag-neoclassicism">NEOCLASSICISM</span>
                  <span class="tag tag-historiography">HISTORIOGRAPHY</span>
                </div>
              </div>

              <!-- Article Preview -->
              <div class="article-preview">
                <div class="preview-image"></div>
                <h2 class="preview-title">The Architecture of Neoclassical Libraries</h2>
                <p class="preview-text">
                  Neoclassicism in library architecture represents more than a stylistic choice; it was a physical manifestation of the Enlightenment ideals.
                </p>
                <h3 class="preview-subtitle">Spatial Distribution</h3>
                <p class="preview-text">
                  Unlike modern modular spaces, the 19th-century library was a fixed hierarchy.
                </p>
                <blockquote class="blockquote">
                  "To build a library is to build a map of the mind. Every bookshelf is a synapse, every corridor a pathway of logic."
                </blockquote>
              </div>
            </div>
          </aside>
        </div>

        <!-- Status Bar -->
        <footer class="status-bar">
          <div class="status-left">
            <span
              v-for="s in statuses"
              :key="s"
              :class="['status-chip', s, { active: currentStatus === s }]"
              @click="setStatus(s)"
            >{{ s }}</span>
          </div>
          <div class="status-right">
            <span class="status-info">{{ article?.created || '' }}</span>
          </div>
        </footer>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { useRoute } from 'vue-router'
import {
  NConfigProvider,
  NIcon,
  NMessageProvider,
  type GlobalThemeOverrides,
} from 'naive-ui'
import { ArrowBackOutline, CloseOutline } from '@vicons/ionicons5'
// @ts-ignore - ByteMD components used in template
import { Editor, Viewer } from '@bytemd/vue-next'
import 'bytemd/dist/index.css'

const route = useRoute()
const slug = route.params.slug as string

const ArrowBackIcon = h(NIcon, null, () => h(ArrowBackOutline))
const CloseIcon = h(NIcon, null, () => h(CloseOutline))

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#fabb18',
    fontFamily: 'Inter, PingFang SC, sans-serif',
  },
}

const mode = ref<'edit' | 'preview'>('edit')
const article = ref<any>(null)
const content = ref('')
const currentStatus = ref('ready')
const statuses = ['ready', 'working', 'finished']

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
    currentStatus.value = article.value?.status || 'ready'
  }
})

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function onContentChange() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveArticle()
  }, 1000)
}

async function saveArticle() {
  if (article.value) {
    const updated = {
      ...article.value,
      body: content.value,
      raw: content.value,
    }
    await window.electronAPI?.updateFile(slug, updated)
    article.value = updated
  }
}

async function setStatus(status: string) {
  currentStatus.value = status
  if (article.value) {
    article.value.status = status
    await window.electronAPI?.updateFile(slug, article.value)
  }
}
</script>

<style scoped>
.article-page {
  width: 100%;
  min-height: 100vh;
  background: #f5f4ed;
}

.page-background {
  display: flex;
  padding-bottom: 60px;
}

/* Main Column */
.main-column {
  flex: 4;
  display: flex;
  flex-direction: column;
  padding: 31px 48px;
  min-width: 0;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn {
  width: 48px;
  height: 48px;
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
  font-size: 28px;
  color: #1a1a1a;
  margin: 0;
}

.logo-x {
  color: #fabb18;
}

/* Editor Container */
.editor-container {
  flex: 1;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px;
  border-bottom: 1px solid rgba(26, 26, 26, 0.08);
}

.mode-btn {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding: 4px 16px;
  border-radius: 12px;
  transition: all 0.2s;
}

.mode-btn:hover {
  color: #000;
}

.mode-btn.active {
  background: #1a1a1a;
  color: #fff;
}

.mode-divider {
  color: #ddd;
}

.editor-body {
  flex: 1;
  overflow: hidden;
}

.edit-area {
  height: 100%;
}

.markdown-input {
  width: 100%;
  height: 100%;
  min-height: 500px;
  padding: 24px 32px;
  border: none;
  outline: none;
  font-family: 'Newsreader', serif;
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
  resize: none;
  background: transparent;
}

.markdown-input::placeholder {
  color: rgba(26, 26, 26, 0.3);
}

.preview-area {
  height: 100%;
  overflow-y: auto;
  padding: 24px 32px;
}

/* ByteMD Editor Styles */
.bytemd-editor {
  height: 100%;
  width: 100%;
}

.bytemd-editor :deep(.bytemd) {
  height: 100%;
  border: none;
}

.bytemd-editor :deep(.bytemd-toolbar) {
  border-bottom: 1px solid rgba(26, 26, 26, 0.08);
  padding: 8px 16px;
}

.bytemd-editor :deep(.bytemd-body) {
  padding: 24px 32px;
  font-family: 'Newsreader', serif;
  font-size: 18px;
  line-height: 1.8;
}

.bytemd-editor :deep(.bytemd-body textarea) {
  font-family: 'Newsreader', serif;
  font-size: 18px;
  line-height: 1.8;
}

.bytemd-viewer {
  max-width: 780px;
  font-family: 'Newsreader', serif;
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
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

.bytemd-viewer :deep(code) {
  background: #f5f4ed;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Source Code Pro', monospace;
}

.bytemd-viewer :deep(blockquote) {
  border-left: 3px solid #fabb18;
  padding-left: 16px;
  margin: 16px 0;
  font-style: italic;
}

.markdown-preview {
  max-width: 780px;
  font-family: 'Newsreader', serif;
  font-size: 18px;
  line-height: 1.8;
  color: #1a1a1a;
}

.markdown-preview :deep(h1) {
  font-size: 30px;
  margin: 24px 0 16px;
}

.markdown-preview :deep(h2) {
  font-size: 24px;
  margin: 20px 0 12px;
}

.markdown-preview :deep(h3) {
  font-size: 20px;
  margin: 16px 0 8px;
}

.markdown-preview :deep(code) {
  background: #f5f4ed;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Source Code Pro', monospace;
}

.markdown-preview :deep(blockquote) {
  border-left: 3px solid #fabb18;
  padding-left: 16px;
  margin: 16px 0;
  font-style: italic;
}

/* Preview Sidebar */
.preview-sidebar {
  flex: 1;
  max-width: 400px;
  background: #f9f9f9;
  border-radius: 38px 0 0 38px;
  padding: 43px 46px;
  position: relative;
  overflow-y: auto;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #000;
}

.preview-content {
  margin-top: 40px;
}

/* AI Insights Card */
.insights-card {
  background: rgba(228, 225, 217, 0.4);
  border: 1px solid rgba(26, 26, 26, 0.05);
  border-radius: 16px;
  padding: 23px;
  margin-bottom: 32px;
}

.insights-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.insights-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #7d341c;
}

.insights-title {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  color: #7d341c;
  text-transform: uppercase;
}

.insights-quote {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-style: italic;
  line-height: 23px;
  color: rgba(26, 26, 26, 0.8);
  margin: 0 0 16px;
}

.insights-tags {
  display: flex;
  gap: 8px;
}

.tag {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 9999px;
}

.tag-neoclassicism {
  background: rgba(181, 163, 120, 0.2);
  color: #4a4a4a;
}

.tag-historiography {
  background: rgba(148, 132, 154, 0.2);
  color: #4a4a4a;
}

/* Article Preview */
.article-preview {
  display: flex;
  flex-direction: column;
}

.preview-image {
  width: 100%;
  height: 192px;
  background: #dedede;
  opacity: 0.6;
  border-radius: 6px;
  margin-bottom: 24px;
}

.preview-title {
  font-family: 'Newsreader', serif;
  font-size: 30px;
  line-height: 36px;
  color: #1a1a1a;
  margin: 0 0 16px;
}

.preview-subtitle {
  font-family: 'Newsreader', serif;
  font-size: 20px;
  line-height: 28px;
  color: #1a1a1a;
  margin: 24px 0 12px;
}

.preview-text {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 26px;
  color: #4a4a4a;
  margin: 0 0 12px;
}

.blockquote {
  border-left: 2px solid rgba(125, 52, 28, 0.5);
  padding-left: 22px;
  margin: 24px 0 0;
  font-family: 'Newsreader', serif;
  font-size: 18px;
  font-style: italic;
  line-height: 28px;
  color: rgba(26, 26, 26, 0.8);
}

/* Status Bar */
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #ffffff;
  border-top: 1px solid rgba(26, 26, 26, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-chip {
  font-family: 'Source Code Pro', monospace;
  font-size: 12px;
  padding: 6px 16px;
  border-radius: 100px;
  cursor: pointer;
  text-transform: capitalize;
  opacity: 0.7;
  transition: all 0.2s;
}

.status-chip.ready {
  background: rgba(26, 174, 57, 0.15);
  color: #1aae39;
}

.status-chip.working {
  background: rgba(9, 127, 232, 0.15);
  color: #097fe8;
}

.status-chip.finished {
  background: rgba(33, 49, 131, 0.15);
  color: #213183;
}

.status-chip.active {
  opacity: 1;
}

.status-right {
  display: flex;
  align-items: center;
}

.status-info {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #666666;
}
</style>
