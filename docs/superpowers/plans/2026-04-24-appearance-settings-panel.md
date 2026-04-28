# AppearanceSettingsPanel 抽取与复用实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 SettingsPage 的外观面板抽成 `AppearanceSettingsPanel.vue` 组件，同时在 ArticlePage 主题按钮浮窗中复用同一组件，实现一处改动同步生效。

**Architecture:** 新建 `src/components/AppearanceSettingsPanel.vue`，将 SettingsPage 的外观 section 模板、样式、逻辑完整迁移。组件接受 `compact` prop，ArticlePage 通过 `n-popover` 触发并传入 compact 模式。

**Tech Stack:** Vue 3 + TypeScript + Naive UI + Electron IPC

---

## File Map

| 文件 | 职责 |
|------|------|
| `src/components/AppearanceSettingsPanel.vue` | **新建** — 外观面板本体，含模板/样式/逻辑 |
| `src/pages/SettingsPage.vue` | **修改** — 替换外观 section 为 `<AppearanceSettingsPanel />` |
| `src/pages/ArticlePage.vue` | **修改** — 将轻量 theme-popup 替换为 `<AppearanceSettingsPanel compact />` |

---

## Task 1: 创建 AppearanceSettingsPanel.vue 骨架

**Files:**
- Create: `src/components/AppearanceSettingsPanel.vue`

- [ ] **Step 1: 创建文件并写入 import 与基础结构**

```vue
<template>
  <section class="panel appearance-panel" :class="{ 'is-compact': compact }">
    <!-- 完整外观 section 从 SettingsPage.vue 迁移 -->
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, shallowRef } from 'vue'
import { useMessage } from 'naive-ui'
import { useTheme } from '../composables/useTheme'
import { useImportedThemes } from '../composables/useImportedThemes'
import {
  defaultThemeConfigs,
  isBaseThemeId,
  listThemeOptions,
  normalizeThemeConfig,
  normalizeThemeConfigs,
  slugifyThemeName,
  type ThemePresetConfig,
  type ThemePresetId,
} from '../styles/theme-presets'
import type { TyporaThemeImportDraft } from '../shared/imported-theme'

const props = defineProps<{
  compact?: boolean
}>()

const emit = defineEmits<{
  saved: []
}>()

const message = useMessage()
const { applyThemeFromSettings } = useTheme()
const { previewTypora } = useImportedThemes()
```

- [ ] **Step 2: 迁移 themeModes、editablePresets、selectedPreset、selectedPresetConfig、systemFonts、monoFonts**

这些状态从 SettingsPage 迁移进来（见 SettingsPage.vue:530-577）。

```ts
const themeModes = [
  { label: '浅色', value: 'light' as const },
  { label: '深色', value: 'dark' as const },
  { label: '跟随系统', value: 'system' as const },
]

const systemFonts = [
  'PingFang SC', 'SF Pro Display', 'Helvetica Neue', 'Noto Sans SC',
  'Microsoft YaHei', 'SimSun', 'SimHei', 'Arial', 'Georgia', 'Times New Roman',
]

const monoFonts = [
  'SF Mono', 'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'Source Code Pro',
]

// settings 从 electron API 读取，组件内部持有
const settings = ref<Record<string, any> | null>(null)
const selectedPreset = ref<ThemePresetId>('light')

const editablePresets = computed(() => listThemeOptions(settings.value?.customThemes || defaultThemeConfigs))

const selectedPresetConfig = computed(() => {
  if (!settings.value) return defaultThemeConfigs[selectedPreset.value] || defaultThemeConfigs.light
  return settings.value.customThemes[selectedPreset.value] || defaultThemeConfigs.light
})

const selectedPresetLabel = computed(() => {
  return editablePresets.value.find((p) => p.id === selectedPreset.value)?.label || selectedPreset.value
})

const isSelectedBaseTheme = computed(() => isBaseThemeId(selectedPreset.value))
```

- [ ] **Step 3: 迁移外观相关方法**

从 SettingsPage.vue:764-1028 迁移以下函数：

```ts
async function persistAppearanceSettings(showMessage = false) {
  if (!settings.value) return
  await applyThemeFromSettings(settings.value)
  const plain = JSON.parse(JSON.stringify(settings.value))
  await window.electronAPI?.saveSettings(plain)
  window.dispatchEvent(new CustomEvent('settings-changed', { detail: plain }))
  emit('saved')
  if (showMessage) message.success('设置已保存')
}

async function updateAppearance(patch: Partial<{ themeMode: string; lightTheme: ThemePresetId; darkTheme: ThemePresetId }>) {
  if (!settings.value) return
  Object.assign(settings.value, patch)
  const current = settings.value
  if (patch.themeMode === 'dark') selectedPreset.value = current.darkTheme
  else if (patch.themeMode === 'light') selectedPreset.value = current.lightTheme
  if (patch.lightTheme) selectedPreset.value = patch.lightTheme
  if (patch.darkTheme) selectedPreset.value = patch.darkTheme
  current.activeThemeId = resolveSelectedTheme(current)
  await persistAppearanceSettings(false)
}

function resolveSelectedTheme(current: Record<string, any>) {
  if (current.themeMode === 'dark') return current.darkTheme || 'dark'
  if (current.themeMode === 'light') return current.lightTheme || 'light'
  return current.lightTheme || 'light'
}

async function applySelectedTheme() {
  if (!settings.value) return
  const config = selectedPresetConfig.value
  if (config.variant === 'dark') {
    settings.value.darkTheme = selectedPreset.value
    settings.value.themeMode = 'dark'
  } else {
    settings.value.lightTheme = selectedPreset.value
    settings.value.themeMode = 'light'
  }
  settings.value.activeThemeId = selectedPreset.value
  await persistAppearanceSettings(false)
}

// 导入相关
const showAppearanceImport = ref(false)
const appearanceImportText = ref('')
const appearanceImportName = ref('')
const appearanceImportWarnings = ref<string[]>([])

function triggerAppearanceImport() {
  appearanceImportText.value = ''
  appearanceImportName.value = ''
  appearanceImportWarnings.value = []
  showAppearanceImport.value = true
}

function closeAppearanceImport() {
  showAppearanceImport.value = false
  appearanceImportText.value = ''
  appearanceImportName.value = ''
  appearanceImportWarnings.value = []
}

function stripThemeFileComments(raw: string) {
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').trim()
}

function collectExtraThemeKeys(value: unknown, prefix = ''): string[] {
  const schema = {
    id: true, name: true, codeThemeId: true, variant: true,
    tokens: defaultThemeConfigs.light.tokens,
    articleCss: true, codeCss: true,
  } as Record<string, unknown>
  const schemaAtPath = prefix
    ? prefix.split('.').reduce<unknown>((cur, key) => (
        typeof cur === 'object' && cur !== null && !Array.isArray(cur)
          ? (cur as Record<string, unknown>)[key] : undefined
      ), schema)
    : schema
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return []
  if (typeof schemaAtPath !== 'object' || schemaAtPath === null || Array.isArray(schemaAtPath)) return []
  const allowedKeys = Object.keys(schemaAtPath)
  const extras: string[] = []
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (!allowedKeys.includes(key)) { extras.push(path); continue }
    extras.push(...collectExtraThemeKeys(nested, path))
  }
  return extras
}

function parseThemeImport(rawText: string, nameFallback: string) {
  const jsonText = stripThemeFileComments(rawText).replace(/^codex-theme-v[12]:\s*/, '')
  const parsed = JSON.parse(jsonText)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('主题文件格式错误：根节点必须是对象')
  if (!('tokens' in parsed)) throw new Error('主题文件格式错误：必须包含 tokens 字段')
  if (typeof (parsed as any).tokens !== 'object') throw new Error('主题文件格式错误：tokens 必须是对象')

  const extraWarnings = collectExtraThemeKeys(parsed).map((k) => `未使用的字段: ${k}`)
  const missingWarnings: string[] = []
  const normalizedLight = normalizeThemeConfig('__check__', {}, defaultThemeConfigs.light)
  const checkTokens = (parsed as any).tokens || {}
  const lightTokens = normalizedLight.tokens

  const checkFields: Array<[string, unknown, unknown]> = [
    ['tokens.system.accent', checkTokens.system?.accent, lightTokens.system.accent],
    ['tokens.app.surfaces.page', checkTokens.app?.surfaces?.page, lightTokens.app.surfaces.page],
    ['tokens.app.text.primary', checkTokens.app?.text?.primary, lightTokens.app.text.primary],
    ['tokens.fonts.ui', checkTokens.fonts?.ui, lightTokens.fonts.ui],
    ['tokens.fonts.body', checkTokens.fonts?.body, lightTokens.fonts.body],
    ['tokens.fonts.heading', checkTokens.fonts?.heading, lightTokens.fonts.heading],
    ['tokens.fonts.code', checkTokens.fonts?.code, lightTokens.fonts.code],
  ]
  for (const [field, actual, fallback] of checkFields) {
    if (actual === undefined && fallback !== undefined) {
      missingWarnings.push(`缺失字段已补齐: ${field}（使用默认值）`)
    }
  }

  const warnings = [...missingWarnings, ...extraWarnings]
  const name = appearanceImportName.value.trim() || (typeof (parsed as any).name === 'string' ? (parsed as any).name : nameFallback)
  const id = slugifyThemeName(name, Object.keys(settings.value?.customThemes || {}))
  const config = normalizeThemeConfig(id, { ...parsed, id, name }, defaultThemeConfigs.light)
  return { id, config, warnings }
}

function installTheme(id: string, config: ThemePresetConfig, activate: boolean) {
  if (!settings.value) return
  settings.value.customThemes[id] = { ...config, id }
  if (activate) {
    if (config.variant === 'dark') {
      settings.value.darkTheme = id
      settings.value.themeMode = 'dark'
    } else {
      settings.value.lightTheme = id
      settings.value.themeMode = 'light'
    }
    settings.value.activeThemeId = id
    selectedPreset.value = id
  }
}

async function applyAppearanceImport(activate: boolean) {
  if (!settings.value || !appearanceImportText.value.trim()) return
  try {
    const { id, config, warnings } = parseThemeImport(appearanceImportText.value.trim(), '导入主题')
    appearanceImportWarnings.value = warnings
    if (warnings.length > 0) message.warning(`主题已导入，忽略 ${warnings.length} 个未使用字段`)
    installTheme(id, config, activate)
    await persistAppearanceSettings(false)
    message.success(activate ? '主题已导入并应用' : '主题已导入')
    closeAppearanceImport()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导入外观配置失败')
  }
}

async function copyAppearanceTheme() {
  if (!settings.value) return
  const source = selectedPresetConfig.value
  const name = `${selectedPresetLabel.value}-复制`
  const id = slugifyThemeName(name, Object.keys(settings.value.customThemes))
  settings.value.customThemes[id] = JSON.parse(JSON.stringify({ ...source, id, name }))
  selectedPreset.value = id
  await persistAppearanceSettings(false)
  message.success(`${name} 已创建`)
}

async function resetAppearancePreset() {
  if (!settings.value) return
  if (!isSelectedBaseTheme.value) return
  settings.value.customThemes[selectedPreset.value] = JSON.parse(JSON.stringify(defaultThemeConfigs[selectedPreset.value] || defaultThemeConfigs.light))
  await persistAppearanceSettings(false)
  message.success(`${selectedPresetLabel.value} 已重置`)
}

async function deleteSelectedTheme() {
  if (!settings.value) return
  const id = selectedPreset.value
  if (isBaseThemeId(id)) { message.error('基础主题不可删除'); return }
  delete settings.value.customThemes[id]
  if (settings.value.lightTheme === id) settings.value.lightTheme = 'light'
  if (settings.value.darkTheme === id) settings.value.darkTheme = 'dark'
  if (settings.value.activeThemeId === id) settings.value.activeThemeId = settings.value.lightTheme
  selectedPreset.value = resolveSelectedTheme(settings.value)
  await persistAppearanceSettings(false)
  message.success('主题已删除')
}
```

- [ ] **Step 4: 迁移 Typora 导入相关**

```ts
const showImportDialog = ref(false)
const importDraft = shallowRef<TyporaThemeImportDraft | null>(null)
const pendingImportConfig = shallowRef<ThemePresetConfig | null>(null)
const importWarnings = ref<string[]>([])
const importNameInput = ref('')
const importLoading = ref(false)

async function handleImportTypora() {
  importLoading.value = true
  try {
    const result = await previewTypora()
    if (!result.ok || !result.draft) return
    importDraft.value = result.draft
    importNameInput.value = result.draft.name
    importWarnings.value = result.draft.warnings
    pendingImportConfig.value = normalizeThemeConfig(result.draft.id, {
      id: result.draft.id,
      name: result.draft.name,
      variant: result.draft.metadata.isDark ? 'dark' : 'light',
      tokens: result.draft.themeConfig?.tokens,
      articleCss: result.draft.css,
      codeCss: result.draft.css,
    }, result.draft.metadata.isDark ? defaultThemeConfigs.dark : defaultThemeConfigs.light)
    showImportDialog.value = true
  } finally {
    importLoading.value = false
  }
}

async function confirmImport(activate: boolean) {
  if (!pendingImportConfig.value || !settings.value) return
  importLoading.value = true
  try {
    const name = importNameInput.value.trim() || pendingImportConfig.value.name || 'Typora 主题'
    const id = slugifyThemeName(name, Object.keys(settings.value.customThemes))
    const oldId = pendingImportConfig.value.id || importDraft.value?.id || id
    const config = JSON.parse(JSON.stringify({
      ...pendingImportConfig.value,
      id, name,
      articleCss: (pendingImportConfig.value.articleCss || '').split(oldId).join(id),
      codeCss: (pendingImportConfig.value.codeCss || '').split(oldId).join(id),
    })) as ThemePresetConfig
    installTheme(id, config, activate)
    showImportDialog.value = false
    importDraft.value = null
    pendingImportConfig.value = null
    message.success(activate ? '主题已导入并启用' : '主题已导入')
    await persistAppearanceSettings(false)
  } finally {
    importLoading.value = false
  }
}

function cancelImport() {
  showImportDialog.value = false
  importDraft.value = null
  pendingImportConfig.value = null
  importWarnings.value = []
  importNameInput.value = ''
}
```

- [ ] **Step 5: 迁移源码编辑器相关**

```ts
const themeSourceText = ref('')
const themeSourceDirty = ref(false)
const themeSourceError = ref('')

const sourceEditorStatus = computed(() => themeSourceDirty.value ? '源码未应用' : '源码已同步')

watch(selectedPreset, () => { loadThemeSourceFromSelected() })

watch(selectedPresetConfig, () => {
  if (!themeSourceDirty.value) loadThemeSourceFromSelected()
}, { deep: true })

function serializeThemeSource(config: ThemePresetConfig) {
  return JSON.stringify({
    name: config.name,
    variant: config.variant,
    codeThemeId: config.codeThemeId,
    tokens: config.tokens,
    articleCss: config.articleCss || '',
    codeCss: config.codeCss || '',
  }, null, 2)
}

function loadThemeSourceFromSelected() {
  themeSourceText.value = serializeThemeSource(selectedPresetConfig.value)
  themeSourceDirty.value = false
  themeSourceError.value = ''
}

function markThemeSourceDirty() {
  themeSourceDirty.value = true
  themeSourceError.value = ''
}

async function copyThemeSource() {
  await navigator.clipboard.writeText(themeSourceText.value)
  message.success('主题源码已复制')
}

async function applyThemeSourceToSelected() {
  if (!settings.value) return
  try {
    const jsonText = stripThemeFileComments(themeSourceText.value).replace(/^codex-theme-v[12]:\s*/, '')
    const parsed = JSON.parse(jsonText)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('主题源码必须是 JSON 对象')
    const id = selectedPreset.value
    const fallback = selectedPresetConfig.value.variant === 'dark' ? defaultThemeConfigs.dark : defaultThemeConfigs.light
    const config = normalizeThemeConfig(id, { ...parsed, id }, fallback)
    settings.value.customThemes[id] = config
    if (config.variant === 'dark') {
      settings.value.darkTheme = id
      settings.value.themeMode = 'dark'
    } else {
      settings.value.lightTheme = id
      settings.value.themeMode = 'light'
    }
    settings.value.activeThemeId = id
    themeSourceDirty.value = false
    themeSourceError.value = ''
    await persistAppearanceSettings(false)
    loadThemeSourceFromSelected()
    message.success('主题源码已应用')
  } catch (error) {
    themeSourceError.value = error instanceof Error ? error.message : '主题源码解析失败'
    message.error(themeSourceError.value)
  }
}
```

- [ ] **Step 6: 初始化 settings**

```ts
onMounted(async () => {
  const loaded = await window.electronAPI?.getSettings()
  const normalized = normalizeThemeConfigs(loaded?.customThemes)
  settings.value = {
    ...loaded,
    customThemes: normalized,
  }
  selectedPreset.value = resolveSelectedTheme(settings.value)
  loadThemeSourceFromSelected()
})
```

---

## Task 2: 迁移模板到 AppearanceSettingsPanel.vue

**Files:**
- Modify: `src/components/AppearanceSettingsPanel.vue` (add template)

- [ ] **Step 1: 添加模板主体结构**

从 SettingsPage.vue:46-328 的外观 section 模板（去掉外层 `<section v-else-if="activeSection === 'appearance'" class="panel">`），直接写入 `<section class="panel appearance-panel">`。

模板包含：
- `.panel-header` + `.panel-title: "外观"`
- `.setting-group > .theme-routing-card`
- `.appearance-config-card`
- `showAppearanceImport` 弹窗（从 SettingsPage.vue:448-476）
- `showImportDialog` 弹窗（从 SettingsPage.vue:423-446）

```vue
<template>
  <section class="panel appearance-panel" :class="{ 'is-compact': compact }">
    <div class="panel-header">
      <h2 class="panel-title">外观</h2>
    </div>

    <div class="setting-group">
      <div class="theme-routing-card">
        <!-- theme-routing-card 内容（SettingsPage.vue:51-83） -->
      </div>
    </div>

    <div class="appearance-config-card">
      <!-- 完整 appearance-config-card（SettingsPage.vue:86-327） -->
    </div>

    <!-- 导入弹窗（SettingsPage.vue:448-476） -->
    <!-- Typora 导入弹窗（SettingsPage.vue:423-446） -->
  </section>
</template>
```

**注意：** 模板中所有 `settings.` 替换为 `settings.value.`（因为现在是 ref）；`selectedPresetConfig.value.tokens.xxx` 保持 `.value`（computed 已经是 value）。

---

## Task 3: 迁移外观相关样式

**Files:**
- Modify: `src/components/AppearanceSettingsPanel.vue` (add `<style scoped>`)

- [ ] **Step 1: 迁移外观面板样式**

从 SettingsPage.vue:1222-1738 迁移外观相关样式：

需要迁移的 class（与 appearance panel 直接相关）：
- `.panel`
- `.panel-header`
- `.panel-title`
- `.theme-routing-card`
- `.theme-routing-header`
- `.segmented-row`
- `.segment-btn`
- `.scene-list`
- `.scene-row`
- `.scene-label`
- `.scene-select`
- `.appearance-config-card`
- `.appearance-config-header`
- `.appearance-config-title`
- `.appearance-config-meta`
- `.appearance-config-actions`
- `.appearance-list`
- `.appearance-row`
- `.appearance-row-actions`
- `.appearance-section-header`
- `.section-label`
- `.appearance-label`
- `.appearance-input`
- `.color-input`
- `.color-swatch`
- `.accent-preview`
- `.accent-focus-sample`, `.accent-star-sample`, `.accent-link-sample`
- `.primary-control-preview`
- `.preview-primary-button`, `.preview-today-button`, `.preview-edit-tag`, `.preview-filter-button`, `.preview-save-button`, `.preview-segment-button`
- `.preset-header-select`
- `.source-editor-block`
- `.source-editor-actions`
- `.source-editor-state`
- `.source-editor-state.error`
- `.source-apply-btn`
- `.theme-source-textarea`
- `.modal-mask`, `.modal-card`, `.modal-header`, `.modal-title`, `.modal-close`
- `.import-warnings`, `.warning-list`
- `.btn-copy`, `.btn-copy.danger`
- `.import-dialog-body`
- `.modal-name-field`
- `.modal-textarea`
- `.modal-actions`

同时迁移 `.form-input`, `.color-swatch`, `.segmented-row`, `.segment-btn` 的样式（已在 SettingsPage 中定义）。

compact 模式补充样式：

```css
.appearance-panel.is-compact {
  padding: 0;
  box-shadow: none;
  background: transparent;
}

.appearance-panel.is-compact .panel-header {
  margin-bottom: 12px;
}

.appearance-panel.is-compact .appearance-row {
  grid-template-columns: 96px minmax(0, 1fr);
}
```

---

## Task 4: 在 SettingsPage 中使用 AppearanceSettingsPanel

**Files:**
- Modify: `src/pages/SettingsPage.vue`

- [ ] **Step 1: 添加 import**

在 SettingsPage.vue script setup 区域添加：

```ts
import AppearanceSettingsPanel from '../components/AppearanceSettingsPanel.vue'
```

- [ ] **Step 2: 替换外观 section**

将 SettingsPage.vue:46-328 的外观 section 替换为：

```vue
<AppearanceSettingsPanel
  v-else-if="activeSection === 'appearance'"
  @saved="loadSettings"
/>
```

- [ ] **Step 3: 删除迁移的状态和方法**

从 SettingsPage.vue 删除以下内容（已迁移到组件）：
- `themeModes` 常量（:530-534）
- `selectedPreset` ref（:538）
- `showAppearanceImport`, `appearanceImportText`, `appearanceImportName`, `appearanceImportWarnings`（:541-544）
- `showImportDialog`, `importDraft`, `pendingImportConfig`, `importWarnings`, `importNameInput`, `importLoading`（:545-550）
- `themeSourceText`, `themeSourceDirty`, `themeSourceError`（:551-553）
- `systemFonts`, `monoFonts`（:556-577）
- `editablePresets` computed（:615）
- `selectedPresetConfig` computed（:617-622）
- `selectedPresetLabel` computed（:624-626）
- `isSelectedBaseTheme` computed（:628）
- `sourceEditorStatus` computed（:630）
- `watch(selectedPreset)`（:632-634）
- `watch(selectedPresetConfig)`（:636-644）
- `resolveSelectedTheme`（:646-650）
- `serializeThemeSource`（:706-715）
- `loadThemeSourceFromSelected`（:717-721）
- `markThemeSourceDirty`（:723-726）
- `copyThemeSource`（:728-731）
- `applyThemeSourceToSelected`（:733-762）
- `updateAppearance`（:764-780）
- `persistAppearanceSettings`（:782-786）
- `applySelectedTheme`（:788-800）
- `triggerAppearanceImport`, `closeAppearanceImport`（:802-814）
- `stripThemeFileComments`（:816-818）
- `collectExtraThemeKeys`（:820-851）
- `parseThemeImport`（:853-896）
- `installTheme`（:898-912）
- `applyAppearanceImport`（:914-929）
- `copyAppearanceTheme`（:931-944）
- `resetAppearancePreset`（:946-952）
- `deleteSelectedTheme`（:954-968）
- `handleImportTypora`（:970-995）
- `confirmImport`（:997-1020）
- `cancelImport`（:1022-1028）
- `<style scoped>` 中的外观相关样式（约 520 行）

- [ ] **Step 4: 添加 loadSettings 函数（或复用 handleSettingsChanged）**

如果 `handleSettingsChanged` 已经 reload settings，可以直接用。如果需要单独实现：

```ts
async function loadSettings() {
  const loaded = await window.electronAPI?.getSettings()
  // SettingsPage 主逻辑可能不需要刷新 appearance，这一步可选
}
```

**注意：** 删除前先确认这些状态/方法没有被其他 section 依赖（general/ai/mcp section 不使用外观相关状态）。

---

## Task 5: 替换 ArticlePage 的主题浮窗

**Files:**
- Modify: `src/pages/ArticlePage.vue`

- [ ] **Step 1: 添加 import**

```ts
import AppearanceSettingsPanel from '../components/AppearanceSettingsPanel.vue'
```

- [ ] **Step 2: 替换 n-popover 内容**

将 ArticlePage.vue:54-101 的主题浮窗替换为：

```vue
<n-popover
  trigger="click"
  placement="bottom-end"
  :width="520"
  scrollable
>
  <template #trigger>
    <button class="theme-btn" type="button" title="主题">
      <n-icon><ColorPaletteOutline /></n-icon>
    </button>
  </template>

  <div class="article-appearance-popover">
    <AppearanceSettingsPanel compact @saved="handleAppearanceSaved" />
  </div>
</n-popover>
```

- [ ] **Step 3: 删除旧状态和方法**

删除 ArticlePage.vue 中的：
- `themePopupRef` ref（:218）
- `localThemeConfig` ref（:219）
- `localThemeId` ref（:220）
- `themeConfigs` ref + `loadThemeSettings`（:232, 581-593）
- `editableThemeOptions` computed（:234）
- `systemFonts`（:236-239）
- `loadThemeToPopup`（:241-244）
- `handleThemeSelectChange`（:246-248）
- `applyLocalTheme`（:250-272）

- [ ] **Step 4: 添加 handleAppearanceSaved**

```ts
async function handleAppearanceSaved() {
  const settings = await window.electronAPI?.getSettings()
  await applyThemeFromSettings(settings)
  refreshResolvedThemeTokens()
  // activeThemeId 已经在 loadEditorAppearanceSettings 中通过 settings 同步
  const themeId = settings?.themeMode === 'dark'
    ? settings?.darkTheme || 'dark'
    : settings?.lightTheme || 'light'
  activeThemeId.value = themeId
}
```

- [ ] **Step 5: 删除 theme-popup 相关样式**

删除 ArticlePage.vue `<style scoped>` 中的：
- `.theme-popup`（:960-965）
- `.theme-popup-header`（:967-972）
- `.theme-popup-row`（:974-979）
- `.theme-popup-label`（:981-985）
- `.color-input`（:987-992）— 如果其他位置没有用到

**注意：** 确保删除后 `color-input` 没有其他地方用到（模板中已无）。

---

## Task 6: 验证与回归

- [ ] **Step 1: 运行构建**

```bash
cd /Users/zhuoming/lzm/CodeZone/ai-inbox-app && npm run build 2>&1 | head -60
```

预期：无编译错误。

- [ ] **Step 2: 手动验证**

1. 打开 Settings 页，切到"外观"，确认各控件可用，修改后保存
2. 打开任意文章页，点击主题按钮，确认浮窗展示完整外观面板
3. 在文章页浮窗中修改颜色/字体，确认文章页即时变化
4. 回到 Settings 页确认值同步
5. 刷新应用后设置保留

---

## 自检清单

1. **Spec 覆盖：** 每个 task 都对应 spec 中的一个步骤
2. **无 placeholder：** 无 "TBD"、"TODO"、未填写的代码段
3. **类型一致：** 所有函数名、参数、prop 在各 task 间一致
4. **迁移完整：** SettingsPage 中所有 appearance 相关逻辑均已迁移到组件
5. **ArticlePage 旧逻辑清理：** localThemeId、localThemeConfig、themeConfigs 等旧状态已删除