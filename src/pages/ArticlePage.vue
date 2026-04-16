<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="article-page">
        <div class="page-background">
          <!-- Main Column: Markdown Editor -->
          <div class="main-column">
            <!-- Logo -->
            <h1 class="logo">Ai-In<span class="logo-x">bo</span>X</h1>

            <!-- Markdown Editor -->
            <div class="editor-container">
              <div class="editor-scroll">
                <pre class="markdown-source">{{ markdownSource }}</pre>
              </div>
            </div>
          </div>

          <!-- Right Sidebar: Preview Panel -->
          <div class="preview-wrapper">
            <!-- Mode Switcher (positioned to the left of preview panel) -->
            <div class="mode-switcher">
              <span class="mode-label" :class="{ active: mode === 'raw' }">Raw</span>
              <span class="slider-icon">◁</span>
              <span class="slider-line"></span>
              <span class="slider-icon">▷</span>
              <span class="mode-label" :class="{ active: mode === 'preview' }">Preview</span>
            </div>

            <aside class="preview-panel">
              <!-- Close Button (positioned near left edge) -->
              <button class="close-btn" @click="$router.back()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M15 9L9 15M9 9l6 6" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>

              <!-- Preview Content -->
              <div class="preview-content">
                <!-- AI Insights Card -->
                <div class="insights-card">
                  <div class="insights-header">
                    <svg class="insights-icon" width="13" height="13" viewBox="0 0 13 13">
                      <circle cx="6.5" cy="6.5" r="6.5" fill="#7d341c"/>
                    </svg>
                    <span class="insights-title">AI INSIGHTS</span>
                  </div>
                  <p class="insights-quote">
                    "This article posits that library design is not merely functional but symbolic of the hierarchical nature of human knowledge in the Enlightenment era."
                  </p>
                  <div class="insights-tags">
                    <span class="insight-tag tag-neoclassicism">NEOCLASSICISM</span>
                    <span class="insight-tag tag-historiography">HISTORIOGRAPHY</span>
                  </div>
                </div>

                <!-- Article Preview -->
                <div class="article-preview">
                  <div class="preview-image">
                    <img src="../image/mo1m2i4k-m2yvc8n.png" alt="Architecture" />
                  </div>
                  <h2 class="preview-title">The Architecture of<br/>Neoclassical Libraries</h2>

                  <div class="preview-body">
                    <p class="preview-paragraph">
                      Neoclassicism in library architecture represents more than a stylistic choice; it was a physical manifestation of the <span class="highlight">Enlightenment</span> ideals. The grand central domes and symmetrical wings were designed to reflect the perceived order of the universe.
                    </p>

                    <p class="preview-subtitle">Spatial Distribution</p>

                    <p class="preview-paragraph">
                      Unlike modern modular spaces, the 19th-century library was a fixed hierarchy. Theology and Law occupied the upper galleries, physically elevating the "foundational" disciplines, while Science—then termed Natural Philosophy—was often positioned in peripheral cabinets.
                    </p>

                    <div class="blockquote">
                      <p>"To build a library is to build a map of the mind.<br/>Every bookshelf is a synapse, every corridor a pathway of logic."</p>
                    </div>

                    <p class="preview-paragraph">
                      In the modern digital age, we lack these physical anchors. The "AI-Inbox" aims to restore this tactile sense of hierarchy to your digital information stream...
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  type GlobalThemeOverrides,
} from 'naive-ui'

const route = useRoute()
const router = useRouter()
const slug = route.params.slug as string

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#fabb18',
    fontFamily: 'Inter, PingFang SC, sans-serif',
  },
}

const mode = ref<'raw' | 'preview'>('preview')
const article = ref<any>(null)
const currentStatus = ref('ready')
const statuses = ['ready', 'working', 'finished']

const markdownSource = computed(() => {
  if (!article.value) return ''
  const { title, created, tags, source, related, body } = article.value
  const lines = [
    'type: source',
    `title: "${title || 'Untitled'}"`,
    `created: ${created || ''}`,
    `updated: ${new Date().toISOString().split('T')[0]}`,
    `tags: [${(tags || []).join(', ')}]`,
    `source: ${source || 'app'}`,
    'related:',
    ...(related || []).map((r: string) => `  - ${r}`),
    '---',
    '',
    body || '',
  ]
  return lines.join('\n')
})

onMounted(async () => {
  const data = await window.electronAPI?.readFile(slug)
  if (data) {
    article.value = data
    currentStatus.value = data.status || 'ready'
  }
})

async function setStatus(status: string) {
  currentStatus.value = status
  if (article.value) {
    article.value.status = status
    await window.electronAPI?.updateFile(slug, article.value)
  }
}

async function archive() {
  await window.electronAPI?.archiveFile(slug)
  router.push('/')
}

async function deleteDoc() {
  await window.electronAPI?.deleteFile(slug)
  router.push('/')
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
  min-height: calc(100vh - 60px);
}

/* Main Column */
.main-column {
  flex: 1;
  min-width: 0;
  padding: 37px 54px 47px 27px;
  display: flex;
  flex-direction: column;
}

/* Logo */
.logo {
  font-family: 'Acme', sans-serif;
  font-size: 36px;
  color: #000000;
  margin: 0 0 0 25px;
  line-height: 46px;
}

.logo-x {
  color: #fabb18;
}

/* Editor */
.editor-container {
  flex: 1;
  margin-top: 108px;
  overflow: hidden;
}

.editor-scroll {
  height: 100%;
  overflow-y: auto;
}

.markdown-source {
  font-family: 'Inclusive Sans', 'Inter', sans-serif;
  font-size: 32px;
  letter-spacing: 3px;
  line-height: 1.5;
  color: #000000;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

/* Preview Wrapper */
.preview-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
}

/* Mode Switcher */
.mode-switcher {
  position: absolute;
  top: 55px;
  left: -174px;
  display: flex;
  align-items: center;
  width: 358px;
  height: 35px;
  z-index: 10;
}

.mode-label {
  font-family: 'Acme', sans-serif;
  font-size: 28px;
  color: #000000;
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 0.2s;
}

.mode-label.active {
  opacity: 1;
}

.slider-icon {
  margin-left: 106px;
  font-size: 16px;
  color: #000;
}

.slider-line {
  display: inline-block;
  width: 100px;
  height: 2px;
  background: linear-gradient(to right, #000 0%, #000 30%, transparent 30%, transparent 70%, #000 70%, #000 100%);
  background-size: 10px 2px;
  margin: 0 12px;
}

/* Preview Panel */
.preview-panel {
  width: 986px;
  height: 1769px;
  flex-shrink: 0;
  background: #f9f9f9;
  border-radius: 38px 0 0 38px;
  padding: 43px 46px 47px;
  position: relative;
}

/* Close Button */
.close-btn {
  position: absolute;
  top: 43px;
  left: 859px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
}

/* Preview Content */
.preview-content {
  margin-top: 56px;
  padding: 32px;
  overflow-y: auto;
  height: calc(100% - 100px);
}

/* AI Insights Card */
.insights-card {
  width: 827px;
  border: 1px solid rgba(26, 26, 26, 0.05);
  border-radius: 16px;
  background: rgba(228, 225, 217, 0.4);
  padding: 23px;
  row-gap: 15px;
}

.insights-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.insights-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
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
  margin: 0 0 15px;
  width: 777px;
}

.insights-tags {
  display: flex;
  gap: 8px;
  padding-top: 16px;
}

.insight-tag {
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
  margin-top: 45px;
}

.preview-image {
  width: 827px;
  height: 192px;
  border-radius: 6px;
  overflow: hidden;
  opacity: 0.6;
  margin-bottom: 32px;
}

.preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-title {
  font-family: 'Newsreader', serif;
  font-size: 30px;
  line-height: 36px;
  color: #1a1a1a;
  margin: 0;
  width: 827px;
}

.preview-body {
  padding-top: 24px;
}

.preview-paragraph {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 26px;
  color: #4a4a4a;
  margin: 0;
  width: 827px;
}

.preview-subtitle {
  font-family: 'Newsreader', serif;
  font-size: 20px;
  line-height: 28px;
  color: #1a1a1a;
  margin: 24px 0 16px;
}

.highlight {
  color: #4a4a4a;
}

.blockquote {
  border-left: 2px solid rgba(125, 52, 28, 0.5);
  padding: 8px 0 8px 22px;
  margin: 32px 0;
}

.blockquote p {
  font-family: 'Newsreader', serif;
  font-size: 18px;
  font-style: italic;
  line-height: 28px;
  color: rgba(26, 26, 26, 0.8);
  width: 326px;
  margin: 0;
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
