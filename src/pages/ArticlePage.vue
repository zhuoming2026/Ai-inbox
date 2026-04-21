<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="article-page">
      <header class="header">
        <div class="header-main">
          <button class="back-btn" type="button" @click="goBack">
            <n-icon><ArrowBackOutline /></n-icon>
          </button>
        </div>

        <div class="header-actions">
          <span class="save-indicator" :data-state="saveState">{{ saveIndicatorLabel }}</span>

          <n-button
            round
            tertiary
            :disabled="enrichStatus === 'fetching' || enrichStatus === 'success'"
            @click="triggerEnrich"
          >
            {{ enrichButtonLabel }}
          </n-button>

          <n-button
            v-if="articleBucket === 'deleted'"
            round
            secondary
            type="warning"
            @click="restoreToInbox"
          >
            Restore
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

      <main class="editor-area">
        <section class="edit-panel">
          <div class="nuxt-editor-shell">
            <div class="editor-toolbar">
              <div class="editor-toolbar-group">
                <UButton
                  v-for="item in inlineActions"
                  :key="item.label"
                  :label="item.label"
                  :color="isActionActive(item) ? 'primary' : 'neutral'"
                  :variant="isActionActive(item) ? 'soft' : 'ghost'"
                  size="sm"
                  @click="runAction(item)"
                />
              </div>

              <USeparator orientation="vertical" class="toolbar-separator" />

              <div class="editor-toolbar-group">
                <UButton
                  v-for="item in blockActions"
                  :key="item.label"
                  :label="item.label"
                  :color="isActionActive(item) ? 'primary' : 'neutral'"
                  :variant="isActionActive(item) ? 'soft' : 'ghost'"
                  size="sm"
                  @click="runAction(item)"
                />
              </div>

              <USeparator orientation="vertical" class="toolbar-separator" />

              <div class="editor-toolbar-group">
                <UButton
                  label="Link"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="setLink"
                />
                <UButton
                  label="Clear"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="clearFormatting"
                />
              </div>
            </div>

            <div class="editor-surface" @click="focusEditor">
              <EditorContent v-if="editor" :editor="editor" class="editor-content" />
              <div v-else class="editor-loading">Loading editor...</div>
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
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from '@tiptap/markdown'
import type { Editor } from '@tiptap/core'
import type { InboxDocument } from '../shared/inbox-document'
import {
  getDocumentBucket,
  syncFrontmatterBucket,
} from '../shared/inbox-document'

type ToolbarAction = {
  label: string
  run: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
}

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
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
let saveTimeout: ReturnType<typeof setTimeout> | null = null

const inlineActions: ToolbarAction[] = [
  {
    label: 'Bold',
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive('bold'),
  },
  {
    label: 'Italic',
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive('italic'),
  },
  {
    label: 'Strike',
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive('strike'),
  },
  {
    label: 'Code',
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive('code'),
  },
]

const blockActions: ToolbarAction[] = [
  {
    label: 'H1',
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
  },
  {
    label: 'H2',
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
  },
  {
    label: 'Bullet',
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive('bulletList'),
  },
  {
    label: 'Numbered',
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive('orderedList'),
  },
  {
    label: 'Quote',
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive('blockquote'),
  },
  {
    label: 'Rule',
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
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
    Link.configure({
      autolink: true,
      openOnClick: false,
    }),
    Placeholder.configure({
      placeholder: 'Write in rich text, save as markdown.',
    }),
    Markdown,
  ],
  onUpdate: ({ editor }) => {
    content.value = editor.getMarkdown()
    onContentChange()
  },
})

const articleBucket = computed(() => article.value ? getDocumentBucket(article.value.frontmatter) : 'inbox')
const enrichStatus = computed(() =>
  article.value && typeof article.value.frontmatter.enrichStatus === 'string'
    ? article.value.frontmatter.enrichStatus
    : 'none'
)

const enrichButtonLabel = computed(() => {
  if (enrichStatus.value === 'fetching') return 'Enriching…'
  if (enrichStatus.value === 'failed') return 'Retry Enrich'
  if (enrichStatus.value === 'success') return 'Enriched'
  return 'Enrich'
})

const saveIndicatorLabel = computed(() => {
  if (saveState.value === 'saving') return 'Saving...'
  if (saveState.value === 'saved') return 'Saved'
  if (saveState.value === 'error') return 'Save failed'
  return 'Editing'
})

watch(
  () => article.value?.body ?? '',
  (nextBody) => {
    if (!editor.value) return

    const currentMarkdown = editor.value.getMarkdown()
    if (nextBody === currentMarkdown) return

    editor.value.commands.setContent(nextBody, {
      contentType: 'markdown',
      emitUpdate: false,
    })
  }
)

function focusEditor() {
  editor.value?.chain().focus().run()
}

function isActionActive(action: ToolbarAction) {
  if (!editor.value || !action.isActive) return false
  return action.isActive(editor.value)
}

function runAction(action: ToolbarAction) {
  if (!editor.value) return
  action.run(editor.value)
}

function clearFormatting() {
  if (!editor.value) return
  editor.value.chain().focus().unsetAllMarks().clearNodes().run()
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
  saveState.value = 'saved'
}

function onContentChange() {
  saveState.value = 'idle'
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    void saveArticle()
  }, 500)
}

async function saveArticle() {
  if (!article.value || content.value === lastSaved.value) return

  try {
    saveState.value = 'saving'
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
    saveState.value = 'saved'
  } catch (error) {
    saveState.value = 'error'
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

function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveArticle()
  }
}

onMounted(() => {
  void loadArticle()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeRouteLeave(async () => {
  if (saveTimeout) clearTimeout(saveTimeout)
  await saveArticle()
})

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
  window.removeEventListener('keydown', handleKeydown)
  editor.value?.destroy()
  void saveArticle()
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
  min-height: 58px;
  padding: 12px var(--space-8);
  border-bottom: 1px solid var(--border-strong);
  background: rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(14px);
  flex-shrink: 0;
}

.header-main {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.save-indicator {
  min-width: 72px;
  padding: 0 10px;
  font-size: 12px;
  line-height: 1;
  color: var(--text-secondary);
  text-align: right;
}

.save-indicator[data-state='saved'] {
  color: #1aae39;
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
  padding: var(--space-5);
}

.nuxt-editor-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(26, 26, 26, 0.08);
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(250, 187, 24, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.82));
  box-shadow: 0 18px 40px rgba(20, 20, 20, 0.08);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(26, 26, 26, 0.08);
  background: rgba(255, 255, 255, 0.86);
}

.editor-toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.toolbar-separator {
  height: 24px;
}

.editor-surface {
  flex: 1;
  min-height: 0;
  overflow: auto;
  cursor: text;
}

.editor-loading {
  padding: 32px;
  color: var(--text-secondary);
}

:deep(.editor-content) {
  min-height: 100%;
}

:deep(.tiptap-editor) {
  min-height: 100%;
  padding: 28px 32px 64px;
  outline: none;
  color: var(--text-body);
  font-family: var(--font-editor);
  font-size: var(--text-base);
  line-height: 1.82;
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
  color: var(--text-primary);
  line-height: 1.2;
}

:deep(.tiptap-editor h1) {
  font-size: clamp(2rem, 3vw, 2.8rem);
}

:deep(.tiptap-editor h2) {
  font-size: clamp(1.5rem, 2.4vw, 2rem);
}

:deep(.tiptap-editor h3) {
  font-size: 1.25rem;
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
  padding-left: 1rem;
  border-left: 3px solid rgba(250, 187, 24, 0.8);
  color: var(--text-secondary);
}

:deep(.tiptap-editor a) {
  color: #7d341c;
  text-decoration: underline;
}

:deep(.tiptap-editor code) {
  padding: 0.14rem 0.38rem;
  border-radius: 0.4rem;
  background: rgba(125, 52, 28, 0.08);
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
    gap: var(--space-3);
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .edit-panel {
    padding: var(--space-4);
  }

  :deep(.tiptap-editor) {
    padding: 22px 18px 48px;
  }
}
</style>
