<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="article-page">
      <header class="header">
        <div class="header-main">
          <button class="back-btn" @click="goBack">
            <n-icon><ArrowBackOutline /></n-icon>
          </button>
          <div>
            <p class="eyebrow">Detail</p>
            <h1 class="logo">Ai-In<span class="logo-x">box</span></h1>
          </div>
        </div>
        <div class="header-actions">
          <n-button
            v-if="articleBucket === 'deleted'"
            round
            secondary
            type="warning"
            @click="restoreToInbox"
          >
            Restore to Inbox
          </n-button>
          <n-button
            v-else
            round
            secondary
            type="warning"
            @click="toggleCollect"
          >
            {{ articleBucket === 'collected' ? 'Uncollect' : 'Collect' }}
          </n-button>
          <n-button
            v-if="articleBucket !== 'deleted'"
            round
            tertiary
            type="error"
            @click="moveToDeleted"
          >
            Delete
          </n-button>
        </div>
      </header>

      <section class="article-summary">
        <div class="summary-main">
          <div class="summary-tags">
            <span class="bucket-badge" :class="articleBucket">{{ getBucketLabel(articleBucket) }}</span>
            <n-tag v-if="articleTypeLabel" size="small" :bordered="false">{{ articleTypeLabel }}</n-tag>
            <n-tag size="small" :bordered="false" :type="getEnrichTagType(enrichStatus)">{{ getEnrichLabel(enrichStatus) }}</n-tag>
          </div>
          <h2 class="article-title">{{ articleTitle }}</h2>
          <p class="article-meta">
            <span>Created {{ createdAt || '--' }}</span>
            <span>Updated {{ updatedAt || '--' }}</span>
            <span>{{ slug }}</span>
          </p>
          <div v-if="articleTags.length" class="article-tags">
            <n-tag
              v-for="tag in articleTags"
              :key="tag"
              size="small"
              :bordered="false"
              class="article-tag"
            >{{ tag }}</n-tag>
          </div>
        </div>
        <div class="summary-side">
          <p class="summary-caption">Lifecycle</p>
          <p class="summary-note">{{ lifecycleHint }}</p>
          <n-button
            round
            strong
            secondary
            :disabled="enrichStatus === 'fetching' || enrichStatus === 'success'"
            @click="triggerEnrich"
          >
            {{ enrichStatus === 'failed' ? 'Retry AI Enrich' : 'AI Enrich' }}
          </n-button>
        </div>
      </section>

      <main class="editor-area">
        <section class="edit-panel">
          <div class="panel-label">Edit</div>
          <textarea
            v-model="content"
            class="markdown-textarea"
            placeholder="Start writing..."
            @input="onContentChange"
          ></textarea>
        </section>

        <section class="preview-panel">
          <div class="panel-label">Preview</div>
          <div class="bytemd-viewer" v-html="renderedContent"></div>
        </section>
      </main>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { marked } from 'marked'
import {
  NButton,
  NConfigProvider,
  NIcon,
  NTag,
  useMessage,
  type GlobalThemeOverrides,
} from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import type { InboxDocument } from '../shared/inbox-document'
import {
  getBucketLabel,
  getDocumentBucket,
  getDocumentDate,
  getDocumentTags,
  getDocumentTitle,
  syncFrontmatterBucket,
} from '../shared/inbox-document'

const route = useRoute()
const router = useRouter()
const slug = route.params.slug as string
const message = useMessage()

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#fabb18',
    fontFamily: 'PingFang SC, SF Pro Text, Helvetica Neue, Noto Sans SC, system-ui, -apple-system, sans-serif',
  },
}

const article = ref<InboxDocument | null>(null)
const content = ref('')
const lastSaved = ref('')
let saveTimeout: ReturnType<typeof setTimeout> | null = null

const articleBucket = computed(() => article.value ? getDocumentBucket(article.value.frontmatter) : 'inbox')
const articleTitle = computed(() => article.value ? getDocumentTitle(article.value) : 'Untitled')
const articleTags = computed(() => article.value ? getDocumentTags(article.value.frontmatter) : [])
const createdAt = computed(() => article.value ? getDocumentDate(article.value.frontmatter, 'created') : '')
const updatedAt = computed(() => article.value ? getDocumentDate(article.value.frontmatter, 'updated') : '')
const enrichStatus = computed(() =>
  article.value && typeof article.value.frontmatter.enrichStatus === 'string'
    ? article.value.frontmatter.enrichStatus
    : 'none'
)
const articleTypeLabel = computed(() => article.value?.type ? article.value.type.toUpperCase() : '')
const lifecycleHint = computed(() => {
  if (articleBucket.value === 'collected') {
    return '这条内容已经被纳入 Collected，可继续编辑，也可以随时退回 Inbox。'
  }
  if (articleBucket.value === 'deleted') {
    return '这条内容当前在 Deleted 中，恢复后会回到 Inbox。'
  }
  return '这条内容当前还在 Inbox，适合继续整理、enrich 或 Collect。'
})

const renderedContent = computed(() => marked.parse(content.value || ''))

async function loadArticle() {
  const data = await window.electronAPI?.readFile(slug)
  if (!data) {
    message.error('内容不存在或已被移除')
    router.replace('/')
    return
  }

  article.value = data
  content.value = data.body
  lastSaved.value = data.body
}

function onContentChange() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    void saveArticle()
  }, 500)
}

async function saveArticle() {
  if (!article.value || content.value === lastSaved.value) return

  try {
    const nextFrontmatter = {
      ...article.value.frontmatter,
      updated: new Date().toISOString().split('T')[0],
    }

    await window.electronAPI?.updateFile(slug, {
      frontmatter: nextFrontmatter,
      body: content.value,
    })

    article.value = {
      ...article.value,
      frontmatter: nextFrontmatter,
      body: content.value,
    }
    lastSaved.value = content.value
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  }
}

async function updateBucket(bucket: 'inbox' | 'collected' | 'deleted', successMessage: string) {
  if (!article.value) return

  await saveArticle()

  try {
    await window.electronAPI?.setBucket(slug, bucket)
    article.value = {
      ...article.value,
      frontmatter: syncFrontmatterBucket({
        ...article.value.frontmatter,
        updated: new Date().toISOString().split('T')[0],
      }, bucket),
    }
    message.success(successMessage)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '状态更新失败')
  }
}

async function toggleCollect() {
  await updateBucket(
    articleBucket.value === 'collected' ? 'inbox' : 'collected',
    articleBucket.value === 'collected' ? '已取消 Collect' : '已加入 Collect'
  )
}

async function moveToDeleted() {
  await updateBucket('deleted', '已移到 Deleted')
}

async function restoreToInbox() {
  await updateBucket('inbox', '已恢复到 Inbox')
}

async function triggerEnrich() {
  if (!article.value || enrichStatus.value === 'fetching' || enrichStatus.value === 'success') return

  await saveArticle()

  try {
    article.value = {
      ...article.value,
      frontmatter: {
        ...article.value.frontmatter,
        enrichStatus: 'fetching',
      },
    }
    await window.electronAPI?.enrichFile(slug)
    await loadArticle()
    message.success('已触发 AI enrich')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '触发 enrich 失败')
    await loadArticle()
  }
}

function goBack() {
  router.back()
}

function getEnrichTagType(status: string): 'success' | 'info' | 'warning' | 'default' {
  const map: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    none: 'default',
    fetching: 'info',
    success: 'success',
    failed: 'warning',
  }
  return map[status] || 'default'
}

function getEnrichLabel(status: string) {
  const map: Record<string, string> = {
    none: 'Raw',
    fetching: 'Fetching',
    success: 'Success',
    failed: 'Failed',
  }
  return map[status] || 'Raw'
}

onMounted(() => {
  void loadArticle()
})

onBeforeRouteLeave(async () => {
  if (saveTimeout) clearTimeout(saveTimeout)
  await saveArticle()
})

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
  void saveArticle()
})
</script>

<style scoped>
.article-page {
  width: 100%;
  height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(250, 187, 24, 0.1), transparent 24%),
    var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-8) var(--space-4);
  border-bottom: 1px solid rgba(64, 72, 87, 0.08);
  flex-shrink: 0;
}

.header-main {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
}

.back-btn {
  width: var(--btn-height-md);
  height: var(--btn-height-md);
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  color: var(--text-primary);
}

.back-btn:hover {
  background: var(--bg-secondary);
  transform: translateX(-1px);
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

.article-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: var(--space-6);
  padding: 0 var(--space-8) var(--space-5);
  flex-shrink: 0;
}

.summary-main,
.summary-side {
  border-radius: 24px;
  border: 1px solid rgba(64, 72, 87, 0.08);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px);
  padding: var(--space-5);
}

.summary-tags {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.bucket-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(64, 72, 87, 0.08);
  color: var(--text-secondary);
}

.bucket-badge.collected {
  background: rgba(250, 187, 24, 0.2);
  color: #8a5b00;
}

.bucket-badge.deleted {
  background: rgba(120, 125, 137, 0.12);
  color: #6d7480;
}

.article-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.08;
  color: var(--text-primary);
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin: var(--space-4) 0 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.article-tags {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-4);
}

.article-tag {
  background: rgba(250, 187, 24, 0.1);
}

.summary-caption {
  margin: 0 0 var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-primary);
}

.summary-note {
  margin: 0 0 var(--space-4);
  color: var(--text-secondary);
  line-height: 1.7;
}

.editor-area {
  flex: 1;
  display: flex;
  min-height: 0;
  border-top: 1px solid rgba(64, 72, 87, 0.06);
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
  border-right: 1px solid rgba(64, 72, 87, 0.08);
}

.panel-label {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-muted);
  padding: var(--space-3) var(--space-6);
  border-bottom: 1px solid rgba(64, 72, 87, 0.08);
  background: rgba(255, 255, 255, 0.72);
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
  background: rgba(255, 255, 255, 0.56);
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
  background: rgba(255, 251, 240, 0.52);
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
  background: rgba(255, 255, 255, 0.82);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sharp);
  font-family: var(--font-mono);
  font-size: var(--text-base);
}

.bytemd-viewer :deep(pre) {
  background: rgba(255, 255, 255, 0.92);
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
  color: var(--text-secondary);
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

@media (max-width: 1100px) {
  .header,
  .article-summary {
    padding-left: var(--space-5);
    padding-right: var(--space-5);
  }

  .article-summary {
    grid-template-columns: 1fr;
  }

  .editor-area {
    flex-direction: column;
  }

  .edit-panel {
    border-right: none;
    border-bottom: 1px solid rgba(64, 72, 87, 0.08);
  }
}

@media (max-width: 720px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
