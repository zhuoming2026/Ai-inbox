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
          <span class="save-indicator" :data-state="saveState">{{ saveIndicatorLabel }}</span>

          <n-button round tertiary :disabled="!isDirty || saveState === 'saving'" @click="saveNow(false)">
            保存
          </n-button>

          <n-button
            round
            tertiary
            :disabled="frontmatterParseError || enrichStatus === 'fetching' || enrichStatus === 'success'"
            @click="triggerEnrich"
          >
            {{ enrichButtonLabel }}
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
          <div class="nuxt-editor-shell">
            <div v-if="frontmatterParseError" class="notice notice-warning">
              frontmatter 解析失败，部分属性 UI 不可用。
            </div>
            <div v-else-if="hasExternalChange" class="notice notice-info">
              文件已在外部更新，你当前保留的是本地未保存编辑。
            </div>

            <div class="editor-toolbar">
              <div class="editor-toolbar-group">
                <UButton
                  square
                  title="撤销"
                  aria-label="撤销"
                  icon="i-lucide:undo"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  disabled
                  @click="undoChange"
                />
                <UButton
                  square
                  title="重做"
                  aria-label="重做"
                  icon="i-lucide:redo"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  disabled
                  @click="redoChange"
                />
              </div>

              <div class="toolbar-divider" aria-hidden="true"></div>

              <div class="editor-toolbar-group">
                <UButton
                  v-for="item in structureActions"
                  :key="item.label"
                  square
                  :title="item.label"
                  :aria-label="item.label"
                  :icon="item.icon"
                  :color="isActionActive(item) ? 'primary' : 'neutral'"
                  :variant="isActionActive(item) ? 'soft' : 'ghost'"
                  size="sm"
                  :disabled="item.disabled"
                  @click="runAction(item)"
                />
              </div>

              <div class="toolbar-divider" aria-hidden="true"></div>

              <div class="editor-toolbar-group">
                <UButton
                  v-for="item in inlineActions"
                  :key="item.label"
                  square
                  :title="item.label"
                  :aria-label="item.label"
                  :icon="item.icon"
                  :color="isActionActive(item) ? 'primary' : 'neutral'"
                  :variant="isActionActive(item) ? 'soft' : 'ghost'"
                  size="sm"
                  @click="runAction(item)"
                />
              </div>

              <div class="toolbar-divider" aria-hidden="true"></div>

              <div class="editor-toolbar-group">
                <UButton
                  v-for="item in blockActions"
                  :key="item.label"
                  square
                  :title="item.label"
                  :aria-label="item.label"
                  :icon="item.icon"
                  :color="isActionActive(item) ? 'primary' : 'neutral'"
                  :variant="isActionActive(item) ? 'soft' : 'ghost'"
                  size="sm"
                  @click="runAction(item)"
                />
              </div>

              <div class="toolbar-divider" aria-hidden="true"></div>

              <div class="editor-toolbar-group">
                <UButton
                  square
                  title="插入链接"
                  aria-label="插入链接"
                  icon="i-lucide:link"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  disabled
                  @click="setLink"
                />
                <UButton
                  square
                  title="插入图片"
                  aria-label="插入图片"
                  icon="i-lucide:image"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="insertImage"
                />
              </div>

              <div class="toolbar-divider" aria-hidden="true"></div>

              <div class="editor-toolbar-group">
                <UDropdownMenu :items="alignMenuItems" :content="{ align: 'end' }">
                  <UButton
                    square
                    title="对齐方式"
                    aria-label="对齐方式"
                    icon="i-lucide:align-justify"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    aria-haspopup="menu"
                  />
                </UDropdownMenu>
              </div>
            </div>

            <div class="editor-workspace" :data-frontmatter-open="frontmatterExpanded">
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
                    @input="onFrontmatterInput"
                  />
                </div>
              </section>

              <div class="editor-surface" @click="focusEditor">
                <EditorContent v-if="editor" :editor="editor" class="editor-content" />
                <div v-else class="editor-loading">Loading editor...</div>
              </div>
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
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Markdown } from '@tiptap/markdown'
import {
  buildFrontmatter,
  buildRawDocument,
  getDocumentBucket,
  splitRawDocument,
  syncFrontmatterBucket,
  type InboxFrontmatter,
} from '../shared/inbox-document'

type ToolbarAction = {
  label: string
  icon?: string
  run: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
  disabled?: boolean
}

type SaveState = 'unsaved' | 'saving' | 'saved' | 'error'

const AUTO_SAVE_INTERVAL_MS = 60_000

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
const lastSavedRawDocument = ref('')
const frontmatterExpanded = ref(false)
const saveState = ref<SaveState>('saved')
const hasExternalChange = ref(false)
const pendingExternalRaw = ref<string | null>(null)

let autosaveTimer: ReturnType<typeof setInterval> | null = null
let inboxUnsubscribe: (() => void) | null = null
let savePromise: Promise<boolean> | null = null

const structureActions: ToolbarAction[] = [
  {
    label: '段落',
    icon: 'i-lucide:pilcrow',
    run: (editor) => editor.chain().focus().setParagraph().run(),
    isActive: (editor) => editor.isActive('paragraph'),
  },
  {
    label: '标题',
    icon: 'i-lucide:heading-1',
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
  },
  {
    label: '列表',
    icon: 'i-lucide:list',
    run: () => {},
    disabled: true,
  },
]

const inlineActions: ToolbarAction[] = [
  {
    label: '粗体',
    icon: 'i-lucide:bold',
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive('bold'),
  },
  {
    label: '斜体',
    icon: 'i-lucide:italic',
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive('italic'),
  },
  {
    label: '下划线',
    icon: 'i-lucide:underline',
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive('underline'),
  },
  {
    label: '删除线',
    icon: 'i-lucide:strikethrough',
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive('strike'),
  },
  {
    label: '行内代码',
    icon: 'i-lucide:code',
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive('code'),
  },
]

const blockActions: ToolbarAction[] = [
  {
    label: '引用块',
    icon: 'i-lucide:text-quote',
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive('blockquote'),
  },
  {
    label: '代码块',
    icon: 'i-lucide:square-code',
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive('codeBlock'),
  },
  {
    label: '列表',
    icon: 'i-lucide:list-ordered',
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive('bulletList'),
  },
  {
    label: '编号列表',
    icon: 'i-lucide:list-ordered',
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive('orderedList'),
  },
]

const alignMenuItems = [
  [
    {
      label: '左对齐',
      icon: 'i-lucide:align-left',
      onSelect: () => setTextAlign('left'),
    },
    {
      label: '居中',
      icon: 'i-lucide:align-center',
      onSelect: () => setTextAlign('center'),
    },
    {
      label: '右对齐',
      icon: 'i-lucide:align-right',
      onSelect: () => setTextAlign('right'),
    },
    {
      label: '两端对齐',
      icon: 'i-lucide:align-justify',
      onSelect: () => setTextAlign('justify'),
    },
  ],
]

const editor = useEditor({
  content: '',
  contentType: 'markdown',
  editorProps: {
    attributes: {
      class: 'tiptap-editor',
    },
  },
  extensions: [
    StarterKit.configure({
      codeBlock: {
        HTMLAttributes: { class: 'tiptap-code-block' },
      },
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    Link.configure({
      autolink: true,
      openOnClick: false,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Underline,
    Placeholder.configure({
      placeholder: 'Write in rich text, save as markdown.',
    }),
    Markdown,
  ],
  onUpdate: ({ editor }) => {
    bodyMarkdown.value = editor.getMarkdown()
    if (saveState.value === 'saved' || saveState.value === 'error') {
      saveState.value = 'unsaved'
    }
    hasExternalChange.value = false
  },
})

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
const enrichStatus = computed(() =>
  typeof currentFrontmatter.value.enrichStatus === 'string' ? currentFrontmatter.value.enrichStatus : 'none'
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
    enrichStatus.value,
  ].filter(Boolean)

  return pieces.join(' · ') || '展开'
})

const enrichButtonLabel = computed(() => {
  if (enrichStatus.value === 'fetching') return 'Enriching…'
  if (enrichStatus.value === 'failed') return 'Retry Enrich'
  if (enrichStatus.value === 'success') return 'Enriched'
  return 'Enrich'
})

const saveIndicatorLabel = computed(() => {
  if (saveState.value === 'saving') return '保存中'
  if (saveState.value === 'error') return '保存失败'
  if (isDirty.value) return '未保存'
  return '已保存'
})

watch(editor, (instance) => {
  if (!instance) return
  instance.commands.setContent(bodyMarkdown.value, {
    contentType: 'markdown',
    emitUpdate: false,
  })
})

watch(frontmatterParseError, (hasError) => {
  if (hasError) {
    frontmatterExpanded.value = true
  }
})

function focusEditor() {
  editor.value?.chain().focus().run()
}

function isActionActive(action: ToolbarAction) {
  if (!editor.value || !action.isActive) return false
  return action.isActive(editor.value)
}

function runAction(action: ToolbarAction) {
  if (!editor.value || action.disabled) return
  action.run(editor.value)
}

function insertImage() {
  if (!editor.value) return

  const url = window.prompt('请输入图片 URL')
  if (!url) return

  editor.value.chain().focus().setImage({ src: url.trim() }).run()
}

function undoChange() {
  editor.value?.chain().focus().undo().run()
}

function redoChange() {
  editor.value?.chain().focus().redo().run()
}

function setLink() {
  if (!editor.value) return

  const previousUrl = editor.value.getAttributes('link').href ?? ''
  const url = window.prompt('Enter link URL', previousUrl)

  if (url === null) return

  const trimmed = url.trim()
  if (!trimmed) {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  editor.value.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run()
}

function setTextAlign(alignment: 'left' | 'center' | 'right' | 'justify') {
  editor.value?.chain().focus().setTextAlign(alignment).run()
}

function toggleFrontmatterExpanded() {
  frontmatterExpanded.value = !frontmatterExpanded.value
}

function onFrontmatterInput() {
  if (saveState.value === 'saved' || saveState.value === 'error') {
    saveState.value = 'unsaved'
  }
  hasExternalChange.value = false
}

function syncEditorBody(nextBody: string) {
  bodyMarkdown.value = nextBody
  if (!editor.value) return
  editor.value.commands.setContent(nextBody, {
    contentType: 'markdown',
    emitUpdate: false,
  })
}

function applyRawDocument(raw: string, options?: { markAsSaved?: boolean; autoExpand?: boolean }) {
  const parts = splitRawDocument(raw)

  frontmatterText.value = parts.frontmatterText
  syncEditorBody(parts.body)

  if (options?.markAsSaved) {
    lastSavedRawDocument.value = buildRawDocument(parts.frontmatterText, parts.body)
    saveState.value = 'saved'
    hasExternalChange.value = false
    pendingExternalRaw.value = null
  }

  if (options?.autoExpand) {
    frontmatterExpanded.value = parts.parseError || frontmatterSyntaxError.value
  }
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

async function saveNow(showSuccessMessage = false): Promise<boolean> {
  const api = window.electronAPI
  if (!api) return false

  if (savePromise) return savePromise

  const snapshot = currentRawDocument.value
  if (!isDirty.value) {
    saveState.value = 'saved'
    return true
  }

  saveState.value = 'saving'

  savePromise = (async () => {
    try {
      await api.writeRawFile(slug, snapshot)
      lastSavedRawDocument.value = snapshot
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
      savePromise = null
    }
  })()

  return savePromise
}

async function handleExternalFileUpdate() {
  const raw = await window.electronAPI?.readRawFile(slug)
  if (typeof raw !== 'string') return

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

async function triggerEnrich() {
  if (frontmatterParseError.value || enrichStatus.value === 'fetching' || enrichStatus.value === 'success') return

  const prepared = patchFrontmatter((frontmatter) => ({
    ...frontmatter,
    enrichStatus: 'fetching',
  }))
  if (!prepared) return

  const saved = await saveNow(false)
  if (!saved) return

  try {
    await window.electronAPI?.enrichFile(slug)
    const raw = await window.electronAPI?.readRawFile(slug)
    if (typeof raw === 'string') {
      applyRawDocument(raw, {
        markAsSaved: true,
        autoExpand: true,
      })
    }
    message.success('已触发 AI enrich')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '触发 enrich 失败')
    await loadRawDocument()
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
  autosaveTimer = setInterval(() => {
    if (!isDirty.value || saveState.value === 'saving') return
    void saveNow(false)
  }, AUTO_SAVE_INTERVAL_MS)
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
  if (autosaveTimer) clearInterval(autosaveTimer)
  inboxUnsubscribe?.()
  window.removeEventListener('keydown', handleKeydown)
  editor.value?.destroy()
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
  padding: 18px 22px 22px;
}

.nuxt-editor-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(26, 26, 26, 0.08);
  border-radius: 32px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(250, 187, 24, 0.16), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(252, 249, 241, 0.9));
  box-shadow: 0 24px 46px rgba(20, 20, 20, 0.08);
}

.notice {
  margin: 16px 18px 0;
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

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(26, 26, 26, 0.08);
  background: rgba(255, 255, 255, 0.92);
  scrollbar-width: none;
}

.editor-toolbar::-webkit-scrollbar {
  display: none;
}

.editor-toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  flex-shrink: 0;
  font-size: 18px;
}

.editor-toolbar-group :deep(button) {
  min-width: 40px;
  height: 40px;
  border-radius: 12px;
  color: rgba(31, 42, 68, 0.84);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast),
    opacity var(--transition-fast);
}

.editor-toolbar-group :deep(button:hover:not(:disabled)) {
  background: rgba(31, 89, 209, 0.08);
  color: #1f59d1;
  transform: translateY(-1px);
}

.editor-toolbar-group :deep(button:disabled) {
  opacity: 0.38;
  color: rgba(31, 42, 68, 0.38);
}

.editor-toolbar-group :deep(button[aria-pressed='true']),
.editor-toolbar-group :deep(button[data-state='open']) {
  background: rgba(31, 89, 209, 0.1);
  color: #1f59d1;
}

.toolbar-divider {
  width: 1px;
  height: 28px;
  flex-shrink: 0;
  background: rgba(26, 26, 26, 0.12);
}

.editor-workspace {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #ffffff;
}

.frontmatter-panel {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 3;
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
  overflow: auto;
  cursor: text;
  transition: padding-right var(--transition-slow);
  background: #ffffff;
}

.editor-workspace[data-frontmatter-open='true'] .editor-surface {
  padding-right: min(360px, 32vw);
}

.editor-loading {
  padding: 32px;
  color: var(--text-secondary);
}

:deep(.editor-content) {
  display: flex;
  flex: 1 1 auto;
  min-height: 100%;
  height: 100%;
  background: #ffffff;
}

:deep(.tiptap-editor) {
  flex: 1 1 auto;
  width: 100%;
  min-height: 100%;
  height: 100%;
  background: #ffffff;
  box-sizing: border-box;
  padding: 34px 40px 72px;
  outline: none;
  color: #1f2a44;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 1.02rem;
  line-height: 1.8;
}

:deep(.tiptap-editor > *:first-child) {
  margin-top: 0;
}

:deep(.tiptap-editor p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-placeholder);
  pointer-events: none;
  height: 0;
}

:deep(.tiptap-editor h1),
:deep(.tiptap-editor h2),
:deep(.tiptap-editor h3) {
  margin: 1.4em 0 0.6em;
  color: #16213d;
  line-height: 1.2;
}

:deep(.tiptap-editor h1) {
  font-size: 3.5rem;
  letter-spacing: -0.04em;
}

:deep(.tiptap-editor h2) {
  font-size: 2.2rem;
  letter-spacing: -0.03em;
}

:deep(.tiptap-editor h3) {
  font-size: 1.45rem;
}

:deep(.tiptap-editor p),
:deep(.tiptap-editor ul),
:deep(.tiptap-editor ol),
:deep(.tiptap-editor blockquote),
:deep(.tiptap-editor pre) {
  margin: 0.8em 0;
}

:deep(.tiptap-editor ul),
:deep(.tiptap-editor ol) {
  padding-left: 1.5em;
}

:deep(.tiptap-editor blockquote) {
  padding-left: 1.1rem;
  border-left: 1px solid rgba(26, 26, 26, 0.14);
  color: rgba(31, 42, 68, 0.74);
}

:deep(.tiptap-editor a) {
  color: #1f59d1;
  text-decoration: underline;
}

:deep(.tiptap-editor code) {
  padding: 0.14rem 0.38rem;
  border-radius: 0.4rem;
  background: rgba(31, 89, 209, 0.08);
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  font-size: 0.92em;
}

:deep(.tiptap-editor pre) {
  padding: 1rem 1.2rem;
  border-radius: 1rem;
  background: #1f2430;
  color: #f8fafc;
  overflow-x: auto;
}

:deep(.tiptap-editor pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
}

:deep(.tiptap-editor hr) {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid rgba(26, 26, 26, 0.1);
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

  .edit-panel {
    padding: var(--space-4);
  }

  .frontmatter-panel {
    left: 14px;
    right: 14px;
    width: auto;
  }

  .editor-workspace[data-frontmatter-open='true'] .editor-surface {
    padding-right: 0;
    padding-top: 240px;
  }

  :deep(.tiptap-editor) {
    padding: 22px 18px 48px;
  }
}
</style>
