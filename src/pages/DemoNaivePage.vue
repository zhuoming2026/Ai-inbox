<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="demo-naive" :class="{ dark: isDark, 'is-dark': isDark }">
      <!-- Header -->
      <header class="demo-header">
        <div class="demo-header__left">
          <div class="demo-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="currentColor" class="logo-bg" />
              <path d="M7 8h10M7 12h7M7 16h5" stroke="white" stroke-width="2" stroke-linecap="round" />
            </svg>
            <span class="demo-logo__name">Rich Editor</span>
          </div>
        </div>

        <div class="demo-header__center">
          <!-- Editable toggle -->
          <n-button
            size="small"
            :type="editable ? 'primary' : 'default'"
            :tertiary="editable"
            :outline="!editable"
            @click="editable = !editable"
          >
            {{ editable ? 'Editable' : 'Readonly' }}
          </n-button>

          <n-divider vertical style="height: 20px; margin: 0 8px;" />

          <!-- Content type switcher -->
          <n-button-group size="small">
            <n-button
              v-for="opt in contentTypeOptions"
              :key="opt.value"
              :type="contentType === opt.value ? 'primary' : 'default'"
              :tertiary="contentType !== opt.value"
              :ghost="contentType !== opt.value"
              @click="contentType = opt.value"
            >
              {{ opt.label }}
            </n-button>
          </n-button-group>
        </div>

        <div class="demo-header__right">
          <!-- Dark mode toggle -->
          <n-tooltip trigger="hover" placement="bottom">
            <template #trigger>
              <button class="demo-icon-btn" type="button" @click="toggleDark">
                <n-icon size="18">
                  <component :is="isDark ? SunnyOutline : MoonOutline" />
                </n-icon>
              </button>
            </template>
            {{ isDark ? 'Light mode' : 'Dark mode' }}
          </n-tooltip>

          <n-divider vertical style="height: 20px; margin: 0 8px;" />

          <!-- GitHub -->
          <n-tooltip trigger="hover" placement="bottom">
            <template #trigger>
              <a
                class="demo-icon-btn"
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </template>
            View on GitHub
          </n-tooltip>
        </div>
      </header>

      <!-- Editor area -->
      <main class="demo-main">
        <div class="demo-editor-wrap">
          <RichEditor
            v-model="content"
            :content-type="contentType"
            :editable="editable"
            placeholder="Write, type '/' for commands..."
            min-height="calc(100vh - 64px)"
            max-width="768px"
            :on-insert-image="handleInsertImage"
          />
        </div>
      </main>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NButton,
  NButtonGroup,
  NConfigProvider,
  NDivider,
  NIcon,
  NTooltip,
  type GlobalThemeOverrides,
} from 'naive-ui'
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5'
import { RichEditor } from '@/modules/rich-editor'

// ─── Content ─────────────────────────────────────────────────────────────────

const content = ref(`# Rich Editor Demo :sparkles:

A powerful rich text editor built with **TipTap** & **Vue 3**.

> Click on the text to select it and see the bubble toolbar. Type \`/\` anywhere for quick commands.

---

## Rich Text Editing

Full formatting support: **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, and \`inline code\`.

### Code Blocks

\`\`\`js
const greeting = 'hello world'
console.log(greeting)
\`\`\`

### Lists

1. Numbered lists for sequential items
2. With automatic numbering

- Bullet lists work too
  - With nested items
  - At multiple levels

- [x] Task lists for todos
- [ ] Mark items as complete

### Tables

Insert and edit tables with row/column controls.

| Feature | Description | Status |
| ------- | ----------- | ------ |
| Tables | Full table support | ✅ |
| Markdown | Content serialization | ✅ |

### Bubble & Fixed Toolbars

Select text to see the bubble toolbar with formatting options. The fixed toolbar at the top provides quick access to common actions.

### Slash Commands

Type \`/\` anywhere to access quick insertion commands for headings, lists, code blocks, tables, and more.

---

Visit the documentation to learn more.
`)

// ─── Editor state ───────────────────────────────────────────────────────────

const contentType = ref<'html' | 'json' | 'markdown'>('markdown')
const editable = ref(true)

const contentTypeOptions = [
  { label: 'Markdown', value: 'markdown' as const },
  { label: 'HTML', value: 'html' as const },
  { label: 'JSON', value: 'json' as const },
]

// ─── Dark mode ─────────────────────────────────────────────────────────────

const isDark = ref(false)

function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

// Watch initial dark state from document
watch(() => document.documentElement.getAttribute('data-theme'), (theme) => {
  isDark.value = theme === 'dark'
}, { immediate: true })

// ─── Image insertion ───────────────────────────────────────────────────────

async function handleInsertImage(): Promise<string> {
  const url = window.prompt('Enter image URL:')
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    new URL(trimmed)
    return trimmed
  } catch {
    return ''
  }
}

// ─── Theme overrides ────────────────────────────────────────────────────────

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#6366f1',
    fontFamily: "PingFang SC, SF Pro Text, 'Helvetica Neue', Noto Sans SC, system-ui, sans-serif",
  },
}
</script>

<style scoped>
/* ─── Page shell ─────────────────────────────────────────────────────────── */

.demo-naive {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #111827);
  transition: background 0.2s, color 0.2s;
}

.demo-naive.is-dark {
  background: #111827;
  color: #f9fafb;
}

/* ─── Header ─────────────────────────────────────────────────────────────── */

.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-strong, #e5e7eb);
  background: var(--bg-primary, #ffffff);
  flex-shrink: 0;
  gap: 16px;
}

.demo-naive.is-dark .demo-header {
  background: #1f2937;
  border-color: #374151;
}

.demo-header__left,
.demo-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 160px;
}

.demo-header__right {
  justify-content: flex-end;
}

.demo-header__center {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ─── Logo ────────────────────────────────────────────────────────────────── */

.demo-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary, #111827);
  text-decoration: none;
  user-select: none;
}

.demo-naive.is-dark .demo-logo {
  color: #f9fafb;
}

.demo-logo svg {
  flex-shrink: 0;
}

.logo-bg {
  color: #6366f1;
}

/* ─── Icon button ─────────────────────────────────────────────────────────── */

.demo-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.demo-icon-btn:hover {
  background: var(--surface-neutral-soft, rgba(0,0,0,0.05));
  color: var(--text-primary, #111827);
}

.demo-naive.is-dark .demo-icon-btn {
  color: #9ca3af;
}

.demo-naive.is-dark .demo-icon-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #f9fafb;
}

/* ─── Editor area ─────────────────────────────────────────────────────────── */

.demo-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.demo-editor-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
}

/* Center the editor like the demo */
.demo-editor-wrap :deep(.rich-editor) {
  width: 100%;
  max-width: 768px;
  margin: 0 auto;
  flex: 1;
  height: 100%;
  border-radius: 12px;
  border: 1px solid var(--editor-border, #e5e7eb);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.demo-naive.is-dark .demo-editor-wrap :deep(.rich-editor) {
  border-color: #374151;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.demo-editor-wrap :deep(.rich-editor:focus-within) {
  border-color: #6366f1;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.15);
}

/* ─── Loading ─────────────────────────────────────────────────────────────── */

.demo-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-muted, #9ca3af);
  font-size: 14px;
}
</style>
