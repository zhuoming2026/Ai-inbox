<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="article-layout">
      <AppSidebar />
      <div class="article-page">
        <header class="header">
        <div class="header-main">
          <button class="back-btn" type="button" @click="goBack">
            <n-icon><ArrowBackOutline /></n-icon>
          </button>

          <div class="header-meta" :title="workspaceFilePath || documentTitle">
            <span class="document-chip">{{ documentTitle }}</span>
          </div>
        </div>

        <div class="header-actions">
          <span class="save-indicator" :data-state="saveState">{{ saveIndicatorLabel }}</span>

          <n-button size="small" secondary :disabled="!isDirty || saveState === 'saving'" @click="saveNow(false)">
            Save
          </n-button>

          <n-button
            v-if="!isWorkspaceArticle && articleBucket === 'deleted'"
            round
            secondary
            type="warning"
            :disabled="frontmatterParseError"
            @click="restoreToInbox"
          >
            Restore
          </n-button>
          <n-button
            v-else-if="!isWorkspaceArticle"
            round
            secondary
            type="warning"
            :disabled="frontmatterParseError"
            @click="toggleCollect"
          >
            {{ articleBucket === 'collected' ? 'Uncollect' : 'Collect' }}
          </n-button>

          <n-button
            v-if="!isWorkspaceArticle && articleBucket !== 'deleted'"
            round
            tertiary
            type="error"
            :disabled="frontmatterParseError"
            @click="moveToDeleted"
          >
            Delete
          </n-button>

          <n-popover
            ref="themePopupRef"
            trigger="click"
            placement="bottom-end"
            :width="320"
          >
            <template #trigger>
              <button class="theme-btn" type="button" title="主题">
                <n-icon><ColorPaletteOutline /></n-icon>
              </button>
            </template>
            <div class="theme-popup">
              <div class="theme-popup-header">主题</div>
              <div class="theme-popup-row">
                <span class="theme-popup-label">主题</span>
                <select class="form-input" v-model="localThemeId" @change="handleThemeSelectChange">
                  <option v-for="opt in editableThemeOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
                </select>
              </div>
              <div class="theme-popup-row">
                <span class="theme-popup-label">强调色</span>
                <div class="color-input">
                  <input class="color-swatch" type="color" v-model="localThemeConfig!.tokens.system.accent" @input="applyLocalTheme" />
                  <input class="form-input" type="text" v-model="localThemeConfig!.tokens.system.accent" @change="applyLocalTheme" />
                </div>
              </div>
              <div class="theme-popup-row">
                <span class="theme-popup-label">背景</span>
                <div class="color-input">
                  <input class="color-swatch" type="color" v-model="localThemeConfig!.tokens.app.surfaces.page" @input="applyLocalTheme" />
                  <input class="form-input" type="text" v-model="localThemeConfig!.tokens.app.surfaces.page" @change="applyLocalTheme" />
                </div>
              </div>
              <div class="theme-popup-row">
                <span class="theme-popup-label">前景</span>
                <div class="color-input">
                  <input class="color-swatch" type="color" v-model="localThemeConfig!.tokens.app.text.primary" @input="applyLocalTheme" />
                  <input class="form-input" type="text" v-model="localThemeConfig!.tokens.app.text.primary" @change="applyLocalTheme" />
                </div>
              </div>
              <div class="theme-popup-row">
                <span class="theme-popup-label">界面字体</span>
                <select class="form-input" v-model="localThemeConfig!.tokens.fonts.ui" @change="applyLocalTheme">
                  <option v-for="font in systemFonts" :key="font" :value="font">{{ font }}</option>
                </select>
              </div>
            </div>
          </n-popover>
        </div>
      </header>

      <main class="editor-area">
        <section class="edit-panel">
          <div class="editor-shell">
            <div v-if="!isWorkspaceArticle && frontmatterParseError" class="notice notice-warning">
              frontmatter 解析失败，部分属性 UI 不可用。
            </div>
            <div v-else-if="hasExternalChange" class="notice notice-info">
              文件已在外部更新，你当前保留的是本地未保存编辑。
            </div>

            <!-- frontmatter-panel 提升到 editor-shell 层，作为真浮层 -->
            <section v-if="!isWorkspaceArticle" class="frontmatter-panel" :data-open="frontmatterExpanded">
              <button class="frontmatter-toggle" type="button" @click="toggleFrontmatterExpanded">
                <span class="frontmatter-toggle-title">文档属性</span>
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

            <div class="editor-workspace" :data-frontmatter-open="showFrontmatterOverlay">
              <section class="editor-canvas">
                <ArticleBodyEditor
                  v-model="bodyMarkdown"
                  :typography-theme="activeThemeId"
                  :code-theme="editorCodeTheme"
                />
              </section>
            </div>
          </div>
        </section>
      </main>

      <footer v-if="isWorkspaceArticle" class="article-status-bar">
        <span class="status-item status-path" :title="workspaceFilePath">{{ workspaceStatusPath }}</span>
        <span class="status-item">Markdown</span>
        <span class="status-item">{{ markdownLineCount }} 行</span>
        <span class="status-item">{{ markdownWordCount }} 字</span>
        <span class="status-item">{{ saveIndicatorLabel }}</span>
        <span class="status-item">更新 {{ workspaceUpdatedLabel }}</span>
      </footer>
      </div>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import {
  NButton,
  NConfigProvider,
  NIcon,
  NPopover,
  useMessage,
  type GlobalThemeOverrides,
} from 'naive-ui'
import { ArrowBackOutline, ColorPaletteOutline } from '@vicons/ionicons5'
import ArticleBodyEditor from '../components/ArticleBodyEditor.vue'
import AppSidebar from '../components/AppSidebar.vue'
import type { EditorCodeTheme } from '../modules/rich-editor'
import { useWorkspaceStore } from '../stores/workspace'
import type { WorkspaceFileTreeNode } from '../shared/v2-workspace'
import {
  buildFrontmatter,
  buildRawDocument,
  extractMarkdownH1,
  getAiTitle,
  getContentTitle,
  getDocumentBucket,
  parseFrontmatter,
  splitRawDocument,
  syncFrontmatterBucket,
  type InboxFrontmatter,
} from '../shared/inbox-document'
import { defaultThemeConfigs, listThemeOptions, type ThemePresetConfig, type ThemePresetId } from '../styles/theme-presets'
import { useTheme } from '../composables/useTheme'

type SaveState = 'unsaved' | 'saving' | 'saved' | 'error'

const AUTO_SAVE_DEBOUNCE_MS = 1500
const LOCAL_WRITE_ECHO_TTL_MS = 5000

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const slug = computed(() => route.params.slug as string)
const workspaceFilePath = computed(() => {
  const param = route.params.encodedPath
  return typeof param === 'string' ? safeDecode(param) : ''
})
const isWorkspaceArticle = computed(() => !!workspaceFilePath.value)
const documentKey = computed(() => workspaceFilePath.value || slug.value)
const documentFilename = computed(() => {
  if (workspaceFilePath.value) {
    return workspaceFilePath.value.split('/').pop()?.replace(/\.md$/i, '') || 'Untitled'
  }
  return slug.value || 'Untitled'
})
const message = useMessage()

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const resolvedThemeTokens = ref({
  primaryColor: '#f2c94c',
  primaryColorHover: '#f5d76a',
  primaryColorPressed: '#d9a928',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
})

const themeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    primaryColor: resolvedThemeTokens.value.primaryColor,
    primaryColorHover: resolvedThemeTokens.value.primaryColorHover,
    primaryColorPressed: resolvedThemeTokens.value.primaryColorPressed,
    fontFamily: resolvedThemeTokens.value.fontFamily,
  },
}))

function refreshResolvedThemeTokens() {
  if (typeof window === 'undefined') return
  const styles = getComputedStyle(document.documentElement)
  resolvedThemeTokens.value = {
    primaryColor: styles.getPropertyValue('--action-primary-bg').trim() || '#f2c94c',
    primaryColorHover: styles.getPropertyValue('--action-primary-bg-hover').trim() || '#f5d76a',
    primaryColorPressed: styles.getPropertyValue('--action-primary-bg-pressed').trim() || '#d9a928',
    fontFamily: styles.getPropertyValue('--font-body').trim() || '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  }
}

const frontmatterText = ref('')
const bodyMarkdown = ref('')
const documentHadFrontmatter = ref(false)
const activeThemeId = ref<string>('light')
const editorCodeTheme = ref<EditorCodeTheme>('github')
const lastSavedRawDocument = ref('')
const frontmatterExpanded = ref(false)
const saveState = ref<SaveState>('saved')
const hasExternalChange = ref(false)
const pendingExternalRaw = ref<string | null>(null)
const themePopupRef = ref<InstanceType<typeof NPopover> | null>(null)
const localThemeConfig = ref<ThemePresetConfig | null>(null)
const localThemeId = ref<ThemePresetId>('light')

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let inboxUnsubscribe: (() => void) | null = null
let savePromise: Promise<boolean> | null = null
let suppressDirtyTracking = false
let queuedSaveAfterCurrent = false
let activeSaveSnapshot: string | null = null
let recentLocalWrite: { raw: string; timestamp: number } | null = null

const { applyThemeFromSettings } = useTheme()

const themeConfigs = ref<Record<string, ThemePresetConfig>>({})

const editableThemeOptions = computed(() => listThemeOptions(themeConfigs.value))

const systemFonts = [
  'PingFang SC', 'SF Pro Display', 'Helvetica Neue', 'Noto Sans SC',
  'Microsoft YaHei', 'SimSun', 'SimHei', 'Arial',
]

function loadThemeToPopup() {
  const id = localThemeId.value
  localThemeConfig.value = JSON.parse(JSON.stringify(themeConfigs.value[id] || defaultThemeConfigs.light))
}

function handleThemeSelectChange() {
  loadThemeToPopup()
}

async function applyLocalTheme() {
  if (!localThemeConfig.value || !localThemeId.value) return
  const id = localThemeId.value
  const config = JSON.parse(JSON.stringify(localThemeConfig.value))

  // 保存到 themeConfigs 并同步 settings
  themeConfigs.value = { ...themeConfigs.value, [id]: config }

  const settings = await window.electronAPI?.getSettings()
  if (!settings) return
  if (config.variant === 'dark') {
    settings.darkTheme = id
    settings.themeMode = 'dark'
  } else {
    settings.lightTheme = id
    settings.themeMode = 'light'
  }
  settings.customThemes = themeConfigs.value
  await window.electronAPI?.saveSettings(settings)
  window.dispatchEvent(new CustomEvent('settings-changed', { detail: settings }))
  await applyThemeFromSettings(settings)
  refreshResolvedThemeTokens()
}

const currentRawDocument = computed(() => composeRawDocument())
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
const frontmatterParseError = computed(() =>
  documentHadFrontmatter.value && (parsedDocument.value.parseError || frontmatterSyntaxError.value)
)
const currentFrontmatter = computed(() =>
  frontmatterParseError.value ? ({} as InboxFrontmatter) : parsedDocument.value.frontmatter
)
const showFrontmatterOverlay = computed(() => !isWorkspaceArticle.value && frontmatterExpanded.value)

const articleBucket = computed(() => getDocumentBucket(currentFrontmatter.value))
const currentWorkspaceNode = computed(() => {
  if (!workspaceFilePath.value) return null
  for (const tree of workspaceStore.trees) {
    const match = findWorkspaceNode(tree.nodes, workspaceFilePath.value)
    if (match) return match
  }
  return null
})
const workspaceStatusPath = computed(() => currentWorkspaceNode.value?.relativePath || documentFilename.value)
const workspaceUpdatedLabel = computed(() => {
  const updatedAt = currentWorkspaceNode.value?.updatedAt
  if (!updatedAt) return '未记录'
  const timestamp = Date.parse(updatedAt)
  if (Number.isNaN(timestamp)) return '未记录'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
})
const markdownLineCount = computed(() => {
  if (!bodyMarkdown.value) return 0
  return bodyMarkdown.value.replace(/(?:\r\n|\r|\n)+$/, '').split(/\r\n|\r|\n/).length
})
const markdownWordCount = computed(() => countMarkdownWords(bodyMarkdown.value))
const documentTitle = computed(() => {
  const bodyTitle = extractMarkdownH1(bodyMarkdown.value)
  if (isWorkspaceArticle.value) {
    return bodyTitle || documentFilename.value
  }

  return typeof currentFrontmatter.value.title === 'string' && currentFrontmatter.value.title.trim()
    ? currentFrontmatter.value.title
    : bodyTitle || documentFilename.value
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

function findWorkspaceNode(nodes: WorkspaceFileTreeNode[], path: string): WorkspaceFileTreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node
    if (node.children?.length) {
      const child = findWorkspaceNode(node.children, path)
      if (child) return child
    }
  }
  return null
}

function countMarkdownWords(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/[#>*_\-[\]()~]/g, ' ')

  const cjk = text.match(/[\u3400-\u9fff]/g)?.length || 0
  const words = text.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length || 0
  return cjk + words
}

function composeRawDocument() {
  return documentHadFrontmatter.value
    ? buildRawDocument(frontmatterText.value, bodyMarkdown.value)
    : bodyMarkdown.value
}

function applyRawDocument(raw: string, options?: { markAsSaved?: boolean; autoExpand?: boolean }) {
  if (isWorkspaceArticle.value) {
    suppressDirtyTracking = true
    documentHadFrontmatter.value = false
    frontmatterText.value = ''
    bodyMarkdown.value = raw.replace(/\r\n/g, '\n')

    if (options?.markAsSaved) {
      lastSavedRawDocument.value = bodyMarkdown.value
      saveState.value = 'saved'
      hasExternalChange.value = false
      pendingExternalRaw.value = null
    }

    frontmatterExpanded.value = false

    queueMicrotask(() => {
      suppressDirtyTracking = false
    })
    return
  }

  const parts = splitRawDocument(raw)

  suppressDirtyTracking = true
  documentHadFrontmatter.value = parts.hasFrontmatter
  frontmatterText.value = parts.frontmatterText
  bodyMarkdown.value = parts.body

  if (options?.markAsSaved) {
    lastSavedRawDocument.value = parts.hasFrontmatter ? buildRawDocument(parts.frontmatterText, parts.body) : parts.body
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
  const raw = workspaceFilePath.value
    ? await window.electronAPI?.workspace?.readFile(workspaceFilePath.value)
    : await window.electronAPI?.readRawFile(slug.value)
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
  const themeId = settings?.themeMode === 'dark'
    ? settings?.darkTheme || 'dark'
    : settings?.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? settings?.darkTheme || 'dark'
      : settings?.lightTheme || 'light'
  activeThemeId.value = themeId

  const config = settings?.customThemes?.[themeId]
  const codeValue = config?.codeThemeId || settings?.editorCodeTheme
  if (codeValue === 'night') {
    editorCodeTheme.value = 'night'
  } else {
    editorCodeTheme.value = 'github'
  }
}

function syncBodyH1ToFrontmatter() {
  if (!documentHadFrontmatter.value) return
  const { frontmatter } = parseFrontmatter(buildRawDocument(frontmatterText.value, bodyMarkdown.value))
  const h1 = extractMarkdownH1(bodyMarkdown.value)
  if (!h1) return

  const existingContentTitle = getContentTitle(frontmatter)
  const existingAiTitle = getAiTitle(frontmatter)

  if (h1 !== existingContentTitle) {
    const updated: InboxFrontmatter = { ...frontmatter, contentTitle: h1 }
    if (!existingAiTitle) {
      updated.title = h1
      updated.titleSource = 'content'
    }
    frontmatterText.value = buildFrontmatterText(updated)
  }
}

function buildFrontmatterText(frontmatter: InboxFrontmatter): string {
  return Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')
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

  if (!isWorkspaceArticle.value) {
    syncBodyH1ToFrontmatter()
  }
  const snapshot = composeRawDocument()
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
      if (workspaceFilePath.value) {
        await api.workspace.writeFile(workspaceFilePath.value, snapshot)
        void workspaceStore.loadTrees()
      } else {
        await api.writeRawFile(slug.value, snapshot)
      }
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
  const raw = workspaceFilePath.value
    ? await window.electronAPI?.workspace?.readFile(workspaceFilePath.value)
    : await window.electronAPI?.readRawFile(slug.value)
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
  if (!documentHadFrontmatter.value) {
    message.info('V2 纯 Markdown 文件的卡片状态将在 Home 中通过 metadata 管理。')
    return false
  }

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

async function saveBeforeRouteChange() {
  if (!isDirty.value) return true
  return saveNow(false)
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveNow(true)
  }
}

function handleSettingsChanged() {
  refreshResolvedThemeTokens()
  void loadEditorAppearanceSettings()
  void loadThemeSettings()
}

async function loadThemeSettings() {
  const settings = await window.electronAPI?.getSettings()
  if (settings?.customThemes) {
    themeConfigs.value = settings.customThemes
  } else {
    themeConfigs.value = defaultThemeConfigs
  }
  const themeId = settings?.themeMode === 'dark'
    ? settings?.darkTheme || 'dark'
    : settings?.lightTheme || 'light'
  localThemeId.value = themeId
  loadThemeToPopup()
}

onMounted(() => {
  refreshResolvedThemeTokens()
  void workspaceStore.refresh()
  void loadRawDocument()
  void loadEditorAppearanceSettings()
  void loadThemeSettings()
  inboxUnsubscribe = window.electronAPI?.onInboxUpdate(() => {
    void handleExternalFileUpdate()
  }) || null
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('settings-changed', handleSettingsChanged)
})

watch(documentKey, () => {
  void loadRawDocument()
})

onBeforeRouteUpdate(async () => {
  return saveBeforeRouteChange()
})

onBeforeRouteLeave(async () => {
  return saveBeforeRouteChange()
})

onUnmounted(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  inboxUnsubscribe?.()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('settings-changed', handleSettingsChanged)
})
</script>

<style scoped>
.article-page {
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.article-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 40px;
  padding: 4px 12px;
  border-bottom: 1px solid rgba(42, 37, 24, 0.1);
  background: rgba(250, 249, 246, 0.92);
  backdrop-filter: blur(14px);
  flex-shrink: 0;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header-meta {
  display: flex;
  align-items: center;
  min-width: 0;
}

.document-chip {
  height: 28px;
  max-width: min(240px, 34vw);
  border-radius: 8px;
  border: 1px solid rgba(66, 60, 44, 0.12);
  background: rgba(255, 254, 250, 0.78);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.editor-appearance-controls {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: nowrap;
}

.editor-appearance-field {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.editor-appearance-label {
  font-size: 11px;
  color: var(--editor-toolbar-icon, #6b7280);
  white-space: nowrap;
  flex-shrink: 0;
}

.editor-appearance-select {
  min-width: 90px;
  height: var(--editor-control-height, 2rem);
  padding: 0 24px 0 8px;
  border: 1px solid var(--editor-toolbar-border, var(--border-control, rgba(64, 72, 87, 0.12)));
  border-radius: var(--editor-control-radius, 0.7rem);
  background: var(--editor-toolbar-bg, var(--bg-card, #ffffff));
  color: var(--editor-toolbar-icon, var(--text-primary, #333639));
  font-size: 11px;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  flex-shrink: 0;
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
  color: var(--status-success-text);
}

.save-indicator[data-state='saving'] {
  color: var(--status-warning-text);
}

.save-indicator[data-state='error'] {
  color: var(--status-danger-text);
}

.back-btn {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(66, 60, 44, 0.12);
  background: rgba(255, 254, 250, 0.78);
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

.article-status-bar {
  min-height: 26px;
  flex: 0 0 26px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 14px;
  border-top: 1px solid rgba(42, 37, 24, 0.1);
  background: rgba(250, 249, 246, 0.92);
  color: var(--text-tertiary);
  font-size: 11.5px;
  line-height: 1;
  white-space: nowrap;
}

.status-item {
  flex: 0 0 auto;
}

.status-path {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
}

.edit-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  height: 100%;
  padding: 0;
}

.editor-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #fffefa;
}

.notice {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 13px;
  line-height: 1.4;
}

.notice-warning {
  background: var(--status-warning-bg);
  color: var(--status-warning-text);
}

.notice-info {
  background: var(--status-info-bg);
  color: var(--status-info-text);
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
  top: 78px;
  right: 28px;
  z-index: 40;
  width: min(340px, calc(100% - 36px));
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform var(--transition-slow), opacity var(--transition-slow);
}

.frontmatter-panel[data-open='false'] {
  width: min(108px, calc(100% - 36px));
}

.frontmatter-toggle {
  width: 100%;
  border: none;
  border-radius: 999px;
  background: var(--editor-frontmatter-bg);
  padding: 8px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--editor-frontmatter-shadow);
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  text-align: center;
  transition: box-shadow 0.15s, background 0.15s;
}

.frontmatter-toggle:hover {
  background: var(--editor-frontmatter-hover-bg);
  box-shadow: var(--editor-frontmatter-shadow);
}

.frontmatter-toggle-title {
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.frontmatter-body {
  border-radius: 24px;
  background: var(--editor-frontmatter-body-bg);
  border: 1px solid var(--editor-frontmatter-border);
  box-shadow: var(--editor-frontmatter-shadow);
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

.theme-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-control);
  background: rgba(255, 254, 250, 0.78);
  cursor: pointer;
  font-size: 16px;
  color: var(--text-body);
  border-radius: 8px;
  transition: all var(--transition-base);
}

.theme-btn:hover {
  background: var(--surface-control-hover);
  border-color: var(--border-control-hover);
}

.theme-popup {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.theme-popup-header {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-body);
  margin-bottom: var(--space-1);
}

.theme-popup-row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
}

.theme-popup-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.color-input {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: center;
}

.color-swatch {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border-control);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  appearance: none;
  -webkit-appearance: none;
}

.color-swatch::-webkit-color-swatch-wrapper { padding: 0; }
.color-swatch::-webkit-color-swatch { border: none; border-radius: 7px; }
.color-swatch::-moz-color-swatch { border: none; border-radius: 7px; }

.form-input {
  padding: 5px 10px;
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  background: var(--surface-neutral-faint);
  color: var(--text-primary);
  font-size: 13px;
  transition: border-color var(--transition-base);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-link);
}
</style>
