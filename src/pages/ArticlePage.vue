<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="article-page">
      <header class="header">
        <div class="header-main">
          <button class="back-btn" type="button" @click="goBack">
            <n-icon><ArrowBackOutline /></n-icon>
          </button>

          <div class="header-meta">
            <h1 class="header-title">{{ documentTitle }}</h1>
          </div>
        </div>

        <div class="header-actions">
          <div class="editor-appearance-controls">
            <label class="editor-appearance-field">
              <span class="editor-appearance-label">正文</span>
              <select class="editor-appearance-select" :value="editorTypographyTheme" @change="onTypographyThemeChange">
                <option v-for="theme in typographyThemeOptions" :key="theme.value" :value="theme.value">{{ theme.label }}</option>
              </select>
            </label>
            <label class="editor-appearance-field">
              <span class="editor-appearance-label">代码</span>
              <select class="editor-appearance-select" :value="editorCodeTheme" @change="onCodeThemeChange">
                <option v-for="theme in codeThemeOptions" :key="theme.value" :value="theme.value">{{ theme.label }}</option>
              </select>
            </label>
          </div>

          <span class="save-indicator" :data-state="saveState">{{ saveIndicatorLabel }}</span>

          <n-button round tertiary :disabled="!isDirty || saveState === 'saving'" @click="saveNow(false)">
            保存
          </n-button>

          <n-button
            v-if="articleBucket === 'deleted'"
            round
            secondary
            type="warning"
            :disabled="frontmatterParseError"
            @click="restoreToInbox"
          >
            Restore
          </n-button>
          <n-button
            v-else
            round
            secondary
            type="warning"
            :disabled="frontmatterParseError"
            @click="toggleCollect"
          >
            {{ articleBucket === 'collected' ? 'Uncollect' : 'Collect' }}
          </n-button>

          <n-button
            v-if="articleBucket !== 'deleted'"
            round
            tertiary
            type="error"
            :disabled="frontmatterParseError"
            @click="moveToDeleted"
          >
            Delete
          </n-button>
        </div>
      </header>

      <main class="editor-area">
        <section class="edit-panel">
          <div class="editor-shell">
            <div v-if="frontmatterParseError" class="notice notice-warning">
              frontmatter 解析失败，部分属性 UI 不可用。
            </div>
            <div v-else-if="hasExternalChange" class="notice notice-info">
              文件已在外部更新，你当前保留的是本地未保存编辑。
            </div>

            <!-- frontmatter-panel 提升到 editor-shell 层，作为真浮层 -->
            <section class="frontmatter-panel" :data-open="frontmatterExpanded">
              <button class="frontmatter-toggle" type="button" @click="toggleFrontmatterExpanded">
                <span class="frontmatter-toggle-title">文档属性</span>
                <span class="frontmatter-toggle-meta">
                  {{ frontmatterExpanded ? '收起' : frontmatterSummary }}
                </span>
              </button>

              <div v-if="frontmatterExpanded" class="frontmatter-body">
                <textarea
                  v-model="frontmatterText"
                  class="frontmatter-textarea"
                  placeholder="title: 标题&#10;status: ready&#10;bucket: inbox"
                  spellcheck="false"
                />
              </div>
            </section>

            <div class="editor-workspace" :data-frontmatter-open="frontmatterExpanded">
              <section class="editor-canvas">
                <ArticleBodyEditor
                  v-model="bodyMarkdown"
                  :typography-theme="editorTypographyTheme"
                  :code-theme="editorCodeTheme"
                />
              </section>
            </div>
          </div>
        </section>
      </main>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  NButton,
  NConfigProvider,
  NIcon,
  useMessage,
  type GlobalThemeOverrides,
} from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import ArticleBodyEditor from '../components/ArticleBodyEditor.vue'
import type { EditorCodeTheme, TypographyTheme } from '../modules/rich-editor'
import {
  buildFrontmatter,
  buildRawDocument,
  getDocumentBucket,
  splitRawDocument,
  syncFrontmatterBucket,
  type InboxFrontmatter,
} from '../shared/inbox-document'

type SaveState = 'unsaved' | 'saving' | 'saved' | 'error'

const AUTO_SAVE_DEBOUNCE_MS = 1500
const LOCAL_WRITE_ECHO_TTL_MS = 5000

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

const frontmatterText = ref('')
const bodyMarkdown = ref('')
const editorTypographyTheme = ref<TypographyTheme>('typora-github')
const editorCodeTheme = ref<EditorCodeTheme>('github')
const lastSavedRawDocument = ref('')
const frontmatterExpanded = ref(false)
const saveState = ref<SaveState>('saved')
const hasExternalChange = ref(false)
const pendingExternalRaw = ref<string | null>(null)

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let inboxUnsubscribe: (() => void) | null = null
let savePromise: Promise<boolean> | null = null
let suppressDirtyTracking = false
let queuedSaveAfterCurrent = false
let activeSaveSnapshot: string | null = null
let recentLocalWrite: { raw: string; timestamp: number } | null = null

const typographyThemeOptions: Array<{ label: string; value: TypographyTheme }> = [
  { label: 'Typora GitHub', value: 'typora-github' },
  { label: 'Newsprint', value: 'serif' },
  { label: 'Default', value: 'default' },
]

const codeThemeOptions: Array<{ label: string; value: EditorCodeTheme }> = [
  { label: 'GitHub', value: 'github' },
  { label: 'Night', value: 'night' },
  { label: 'Paper', value: 'paper' },
  { label: 'Maize', value: 'maize' },
]

const currentRawDocument = computed(() => buildRawDocument(frontmatterText.value, bodyMarkdown.value))
const isDirty = computed(() => currentRawDocument.value !== lastSavedRawDocument.value)

const frontmatterSyntaxError = computed(() =>
  frontmatterText.value
    .split('\n')
    .map((line) => line.trim())
    .some((line) => {
      if (!line || line.startsWith('#')) return false
      return !line.includes(':')
    })
)

const parsedDocument = computed(() => splitRawDocument(currentRawDocument.value))
const frontmatterParseError = computed(() => parsedDocument.value.parseError || frontmatterSyntaxError.value)
const currentFrontmatter = computed(() =>
  frontmatterParseError.value ? ({} as InboxFrontmatter) : parsedDocument.value.frontmatter
)

const articleBucket = computed(() => getDocumentBucket(currentFrontmatter.value))
const articleStatus = computed(() =>
  typeof currentFrontmatter.value.status === 'string' ? currentFrontmatter.value.status : 'ready'
)
const documentTitle = computed(() =>
  typeof currentFrontmatter.value.title === 'string' && currentFrontmatter.value.title.trim()
    ? currentFrontmatter.value.title
    : slug
)
const frontmatterSummary = computed(() => {
  if (frontmatterParseError.value) return '存在格式问题'

  const pieces = [
    articleBucket.value,
    articleStatus.value,
  ].filter(Boolean)

  return pieces.join(' · ') || '展开'
})

const saveIndicatorLabel = computed(() => {
  if (saveState.value === 'saving') return '保存中'
  if (saveState.value === 'error') return '保存失败'
  if (isDirty.value) return '未保存'
  return '已保存'
})

watch(frontmatterParseError, (hasError) => {
  if (hasError) {
    frontmatterExpanded.value = true
  }
})

watch(currentRawDocument, (nextRaw, previousRaw) => {
  if (nextRaw === previousRaw || suppressDirtyTracking) return

  if (saveState.value === 'saved' || saveState.value === 'error') {
    saveState.value = 'unsaved'
  }

  hasExternalChange.value = false
  scheduleAutoSave()
})

function scheduleAutoSave(delay = AUTO_SAVE_DEBOUNCE_MS) {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  if (!isDirty.value) return

  autosaveTimer = setTimeout(() => {
    autosaveTimer = null

    if (!isDirty.value) return
    if (savePromise) {
      queuedSaveAfterCurrent = true
      return
    }

    void saveNow(false)
  }, delay)
}

function toggleFrontmatterExpanded() {
  frontmatterExpanded.value = !frontmatterExpanded.value
}

function markRecentLocalWrite(raw: string) {
  recentLocalWrite = {
    raw,
    timestamp: Date.now(),
  }
}

function isRecentLocalWrite(raw: string) {
  return !!recentLocalWrite
    && recentLocalWrite.raw === raw
    && Date.now() - recentLocalWrite.timestamp < LOCAL_WRITE_ECHO_TTL_MS
}

function applyRawDocument(raw: string, options?: { markAsSaved?: boolean; autoExpand?: boolean }) {
  const parts = splitRawDocument(raw)

  suppressDirtyTracking = true
  frontmatterText.value = parts.frontmatterText
  bodyMarkdown.value = parts.body

  if (options?.markAsSaved) {
    lastSavedRawDocument.value = buildRawDocument(parts.frontmatterText, parts.body)
    saveState.value = 'saved'
    hasExternalChange.value = false
    pendingExternalRaw.value = null
  }

  if (options?.autoExpand) {
    frontmatterExpanded.value = parts.parseError || frontmatterSyntaxError.value
  }

  queueMicrotask(() => {
    suppressDirtyTracking = false
  })
}

async function loadRawDocument() {
  const raw = await window.electronAPI?.readRawFile(slug)
  if (typeof raw !== 'string') {
    message.error('内容不存在或已被移除')
    router.replace('/')
    return
  }

  applyRawDocument(raw, {
    markAsSaved: true,
    autoExpand: true,
  })
}

async function loadEditorAppearanceSettings() {
  const settings = await window.electronAPI?.getSettings()
  const typographyValue = settings?.editorTypographyTheme
  const codeValue = settings?.editorCodeTheme

  if (typographyValue === 'default' || typographyValue === 'serif' || typographyValue === 'typora-github') {
    editorTypographyTheme.value = typographyValue
  }

  if (codeValue === 'github' || codeValue === 'night' || codeValue === 'paper' || codeValue === 'maize') {
    editorCodeTheme.value = codeValue
  }
}

async function persistEditorAppearanceSettings(patch: Partial<{ editorTypographyTheme: TypographyTheme; editorCodeTheme: EditorCodeTheme }>) {
  const current = await window.electronAPI?.getSettings()
  if (!current) return

  const next = {
    ...current,
    ...patch,
  }

  await window.electronAPI?.saveSettings(next)
  window.dispatchEvent(new CustomEvent('settings-changed', { detail: next }))
}

async function onTypographyThemeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value !== 'default' && value !== 'serif' && value !== 'typora-github') return
  editorTypographyTheme.value = value
  await persistEditorAppearanceSettings({ editorTypographyTheme: value })
}

async function onCodeThemeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value !== 'github' && value !== 'night' && value !== 'paper' && value !== 'maize') return
  editorCodeTheme.value = value
  await persistEditorAppearanceSettings({ editorCodeTheme: value })
}

async function saveNow(showSuccessMessage = false): Promise<boolean> {
  const api = window.electronAPI
  if (!api) return false

  if (savePromise) {
    if (activeSaveSnapshot !== currentRawDocument.value) {
      queuedSaveAfterCurrent = true
    }
    return savePromise
  }

  const snapshot = currentRawDocument.value
  if (!isDirty.value) {
    saveState.value = 'saved'
    return true
  }

  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
  }

  saveState.value = 'saving'
  activeSaveSnapshot = snapshot
  markRecentLocalWrite(snapshot)

  savePromise = (async () => {
    try {
      await api.writeRawFile(slug, snapshot)
      lastSavedRawDocument.value = snapshot
      markRecentLocalWrite(snapshot)
      pendingExternalRaw.value = null
      hasExternalChange.value = false
      saveState.value = currentRawDocument.value === snapshot ? 'saved' : 'unsaved'
      if (showSuccessMessage) {
        message.success('已保存')
      }
      return true
    } catch (error) {
      saveState.value = 'error'
      message.error(error instanceof Error ? error.message : '保存失败')
      return false
    } finally {
      const shouldFlushQueuedSave = queuedSaveAfterCurrent || currentRawDocument.value !== lastSavedRawDocument.value
      queuedSaveAfterCurrent = false
      activeSaveSnapshot = null
      savePromise = null
      if (shouldFlushQueuedSave && saveState.value !== 'error') {
        scheduleAutoSave(250)
      }
    }
  })()

  return savePromise
}

async function handleExternalFileUpdate() {
  const raw = await window.electronAPI?.readRawFile(slug)
  if (typeof raw !== 'string') return

  if (raw === lastSavedRawDocument.value || raw === activeSaveSnapshot || isRecentLocalWrite(raw)) {
    return
  }

  if (raw === currentRawDocument.value && raw === lastSavedRawDocument.value) {
    return
  }

  if (isDirty.value) {
    if (pendingExternalRaw.value === raw) return

    pendingExternalRaw.value = raw
    hasExternalChange.value = true

    const shouldReload = window.confirm(
      '该文件已在外部发生变化。\n\n点击“确定”将重新加载磁盘版本；点击“取消”将保留当前编辑内容。'
    )

    if (shouldReload) {
      applyRawDocument(raw, {
        markAsSaved: true,
        autoExpand: true,
      })
      message.info('已重新加载磁盘版本')
    }
    return
  }

  applyRawDocument(raw, {
    markAsSaved: true,
    autoExpand: frontmatterParseError.value,
  })
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function patchFrontmatter(
  updater: (frontmatter: InboxFrontmatter) => InboxFrontmatter
) {
  if (frontmatterParseError.value) {
    frontmatterExpanded.value = true
    message.error('frontmatter 解析失败，请先修复文档属性。')
    return false
  }

  const nextFrontmatter = updater({
    ...currentFrontmatter.value,
    updated: getToday(),
  })
  const nextRaw = buildFrontmatter(nextFrontmatter, bodyMarkdown.value)

  applyRawDocument(nextRaw, {
    markAsSaved: false,
    autoExpand: true,
  })
  saveState.value = 'unsaved'
  return true
}

async function toggleCollect() {
  const nextBucket = articleBucket.value === 'collected' ? 'inbox' : 'collected'
  const success = patchFrontmatter((frontmatter) => syncFrontmatterBucket(frontmatter, nextBucket))
  if (!success) return

  const saved = await saveNow(false)
  if (saved) {
    message.success(nextBucket === 'collected' ? '已加入 Collect' : '已取消 Collect')
  }
}

async function moveToDeleted() {
  const success = patchFrontmatter((frontmatter) => syncFrontmatterBucket(frontmatter, 'deleted'))
  if (!success) return

  const saved = await saveNow(false)
  if (saved) {
    message.success('已移到 Deleted')
  }
}

async function restoreToInbox() {
  const success = patchFrontmatter((frontmatter) => syncFrontmatterBucket(frontmatter, 'inbox'))
  if (!success) return

  const saved = await saveNow(false)
  if (saved) {
    message.success('已恢复到 Inbox')
  }
}

function goBack() {
  router.back()
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveNow(true)
  }
}

onMounted(() => {
  void loadRawDocument()
  void loadEditorAppearanceSettings()
  inboxUnsubscribe = window.electronAPI?.onInboxUpdate(() => {
    void handleExternalFileUpdate()
  }) || null
  window.addEventListener('keydown', handleKeydown)
})

onBeforeRouteLeave(async () => {
  if (!isDirty.value) return true
  return saveNow(false)
})

onUnmounted(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  inboxUnsubscribe?.()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.article-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 76px;
  padding: 14px var(--space-8);
  border-bottom: 1px solid var(--border-strong);
  background:
    linear-gradient(180deg, rgba(255, 253, 247, 0.94), rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(18px);
  flex-shrink: 0;
}

.header-main {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}

.header-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.header-title {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.editor-appearance-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 999px;
  border: 1px solid var(--border-control);
  background: var(--surface-control);
}

.editor-appearance-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.editor-appearance-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.editor-appearance-select {
  min-width: 118px;
  height: 30px;
  padding: 0 28px 0 10px;
  border: 1px solid var(--border-control);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.editor-appearance-select:focus {
  border-color: var(--color-primary);
}

.save-indicator {
  min-width: 52px;
  font-size: 12px;
  line-height: 1;
  color: var(--text-secondary);
  text-align: right;
}

.save-indicator[data-state='saved'] {
  color: #1aae39;
}

.save-indicator[data-state='saving'] {
  color: #7d341c;
}

.save-indicator[data-state='error'] {
  color: #d14343;
}

.back-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border-control);
  background: var(--surface-control);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  color: var(--text-primary);
}

.back-btn:hover {
  background: var(--surface-control-hover);
  transform: translateX(-1px);
}

.editor-area {
  flex: 1;
  min-height: 0;
  display: flex;
}

.edit-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  height: 100%;
  padding: 18px 22px 22px;
}

.editor-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.notice {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 13px;
  line-height: 1.4;
}

.notice-warning {
  background: rgba(250, 173, 20, 0.12);
  color: #8d5b00;
}

.notice-info {
  background: rgba(9, 127, 232, 0.1);
  color: #0a5cb6;
}

.editor-workspace {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.frontmatter-panel {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 40;
  width: min(340px, calc(100% - 36px));
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform var(--transition-slow), opacity var(--transition-slow);
}

.frontmatter-panel[data-open='false'] {
  width: min(260px, calc(100% - 36px));
}

.frontmatter-toggle {
  width: 100%;
  border: none;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  box-shadow: 0 18px 34px rgba(62, 45, 12, 0.12);
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.frontmatter-toggle-title {
  font-weight: 600;
  letter-spacing: 0.01em;
}

.frontmatter-toggle-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.frontmatter-body {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(26, 26, 26, 0.06);
  box-shadow: 0 24px 48px rgba(48, 35, 14, 0.14);
  overflow: hidden;
}

.frontmatter-textarea {
  width: 100%;
  min-height: 220px;
  border: none;
  padding: 18px 18px 20px;
  resize: vertical;
  outline: none;
  background: transparent;
  color: var(--text-body);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.72;
}

.editor-surface {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  /* No padding挤压 — frontmatter panel floats over the editor */
}

.editor-canvas {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

@media (max-width: 1100px) {
  .header {
    padding-left: var(--space-5);
    padding-right: var(--space-5);
  }
}

@media (max-width: 720px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-main {
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .editor-appearance-controls {
    width: 100%;
    justify-content: space-between;
    border-radius: 18px;
  }

  .editor-appearance-field {
    flex: 1;
    min-width: 0;
  }

  .editor-appearance-select {
    min-width: 0;
    width: 100%;
  }

  .edit-panel {
    padding: var(--space-4);
  }

  .frontmatter-panel {
    left: 14px;
    right: 14px;
    width: auto;
  }

  /* frontmatter panel 移动端同样浮空，不挤压 editor */
}
</style>
