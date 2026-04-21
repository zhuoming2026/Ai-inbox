<template>
  <div class="settings-page">
    <header class="header">
      <button class="back-btn" type="button" aria-label="返回" @click="$router.back()">
        <n-icon><ChevronBackOutline /></n-icon>
      </button>
      <h1 class="title">设置</h1>
      <button class="save-btn" @click="handleSaveClick">保存更改</button>
    </header>

    <div class="body" v-if="settings">
      <aside class="settings-sidebar">
        <button
          v-for="section in settingSections"
          :key="section.key"
          type="button"
          class="sidebar-item"
          :class="{ active: activeSection === section.key }"
          @click="activeSection = section.key"
        >
          <span class="sidebar-label">{{ section.label }}</span>
        </button>
      </aside>

      <main class="settings-content">
        <section v-if="activeSection === 'general'" class="panel">
          <div class="panel-header">
            <h2 class="panel-title">常规</h2>
          </div>

          <div class="setting-group">
            <h3 class="group-title">内容目录</h3>
            <div class="form-grid">
              <label class="form-label">
                <span class="label-text">ai-inbox 目录</span>
                <input class="form-input" type="text" v-model="settings.inboxPath" />
              </label>
              <label class="form-label">
                <span class="label-text">归档目录</span>
                <input class="form-input" type="text" v-model="settings.archivePath" />
              </label>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'appearance'" class="panel">
          <div class="panel-header">
            <h2 class="panel-title">外观</h2>
          </div>

          <div class="setting-group">
            <div class="theme-routing-card">
              <div class="theme-routing-header">
                <h3 class="appearance-config-title">主题</h3>
                <div class="segmented-row">
                  <button
                    v-for="mode in themeModes"
                    :key="mode.value"
                    type="button"
                    class="segment-btn"
                    :class="{ active: settings.themeMode === mode.value }"
                    @click="updateAppearance({ themeMode: mode.value })"
                  >
                    {{ mode.label }}
                  </button>
                </div>
              </div>

              <div class="scene-list">
                <div class="scene-row">
                  <span class="scene-label">浅色场景</span>
                  <select class="form-input scene-select" :value="settings.lightTheme" @change="updateAppearance({ lightTheme: (($event.target as HTMLSelectElement).value as ThemePresetId) })">
                    <option v-for="preset in editablePresets" :key="`light-${preset.id}`" :value="preset.id">{{ preset.label }}</option>
                  </select>
                </div>
                <div class="scene-row">
                  <span class="scene-label">深色场景</span>
                  <select class="form-input scene-select" :value="settings.darkTheme" @change="updateAppearance({ darkTheme: (($event.target as HTMLSelectElement).value as ThemePresetId) })">
                    <option v-for="preset in editablePresets" :key="`dark-${preset.id}`" :value="preset.id">{{ preset.label }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="appearance-config-card">
            <div class="appearance-list">
              <div class="appearance-row appearance-row-actions">
                <span class="appearance-label">预设主题</span>
                <div class="appearance-config-actions appearance-input">
                  <select class="form-input preset-header-select" v-model="selectedPreset">
                    <option v-for="preset in editablePresets" :key="`header-${preset.id}`" :value="preset.id">{{ preset.label }}</option>
                  </select>
                  <button class="btn-copy" type="button" @click="triggerAppearanceImport">导入</button>
                  <button class="btn-copy" type="button" @click="copyAppearanceTheme">导出</button>
                  <button class="btn-copy" type="button" @click="resetAppearancePreset">重置</button>
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">代码主题</span>
                <input class="form-input appearance-input" type="text" v-model="selectedPresetConfig.codeThemeId" @change="persistAppearanceSettings(false)" />
              </div>
              <div class="appearance-row">
                <span class="appearance-label">强调色</span>
                <div class="color-input appearance-input">
                  <input class="color-swatch" type="color" v-model="selectedPresetConfig.theme.accent" @input="persistAppearanceSettings(false)" />
                  <input class="form-input" type="text" v-model="selectedPresetConfig.theme.accent" @change="persistAppearanceSettings(false)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">背景</span>
                <div class="color-input appearance-input">
                  <input class="color-swatch" type="color" v-model="selectedPresetConfig.theme.surface" @input="persistAppearanceSettings(false)" />
                  <input class="form-input" type="text" v-model="selectedPresetConfig.theme.surface" @change="persistAppearanceSettings(false)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">前景</span>
                <div class="color-input appearance-input">
                  <input class="color-swatch" type="color" v-model="selectedPresetConfig.theme.ink" @input="persistAppearanceSettings(false)" />
                  <input class="form-input" type="text" v-model="selectedPresetConfig.theme.ink" @change="persistAppearanceSettings(false)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">界面字体</span>
                <input class="form-input appearance-input" type="text" v-model="selectedPresetConfig.theme.fonts.ui" @change="persistAppearanceSettings(false)" />
              </div>
              <div class="appearance-row">
                <span class="appearance-label">代码字体</span>
                <input class="form-input appearance-input" type="text" v-model="selectedPresetConfig.theme.fonts.code" @change="persistAppearanceSettings(false)" />
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'ai'" class="panel">
          <div class="panel-header">
            <h2 class="panel-title">AI</h2>
          </div>

          <div class="setting-group">
            <h3 class="group-title">连接配置</h3>
            <div class="form-grid">
              <label class="form-label">
                <span class="label-text">服务商</span>
                <select class="form-input" v-model="settings.aiProvider">
                  <option value="minimax">MiniMax</option>
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama</option>
                </select>
              </label>
              <label class="form-label">
                <span class="label-text">模型</span>
                <input class="form-input" type="text" v-model="settings.model" placeholder="gpt-4o-mini" />
              </label>
              <label class="form-label full-span">
                <span class="label-text">API Key</span>
                <input class="form-input" type="password" v-model="settings.apiKey" placeholder="sk-..." />
              </label>
              <label class="form-label full-span">
                <span class="label-text">基础 URL（可选）</span>
                <input class="form-input" type="text" v-model="settings.baseUrl" placeholder="https://api.openai.com/v1" />
              </label>
            </div>
          </div>

          <div class="setting-group">
            <h3 class="group-title">处理策略</h3>
            <div class="form-grid">
              <label class="form-label">
                <span class="label-text">AI 模式</span>
                <select class="form-input" v-model="settings.aiProcessingMode">
                  <option value="off">关闭</option>
                  <option value="enhance" :disabled="!settings.aiConnectionVerified">自动 Enrich</option>
                </select>
              </label>
              <div class="status-block">
                <span class="label-text">连接状态</span>
                <span :class="['status-dot', settings.aiConnectionVerified ? 'running' : 'stopped']">
                  {{ settings.aiConnectionVerified ? '已验证' : '未验证' }}
                </span>
              </div>
            </div>
            <div class="action-row">
              <button class="btn-primary" @click="testConnection">测试连接</button>
            </div>
          </div>
        </section>

        <section v-else class="panel">
          <div class="panel-header">
            <h2 class="panel-title">MCP</h2>
          </div>

          <div class="setting-group">
            <h3 class="group-title">服务状态</h3>
            <div class="form-grid">
              <label class="form-label">
                <span class="label-text">HTTP 端口</span>
                <input class="form-input" type="number" v-model="settings.mcpHttpPort" />
              </label>
              <div class="status-block">
                <span class="label-text">对外接口状态</span>
                <span :class="['status-dot', mcpRunning ? 'running' : 'stopped']">
                  {{ mcpRunning ? '运行中' : '已停止' }}
                </span>
              </div>
            </div>
            <div v-if="mcpError" class="error-text">{{ mcpError }}</div>
            <div class="action-row">
              <button class="btn-secondary" @click="startMcp" :disabled="mcpRunning">启动对外 MCP</button>
              <button class="btn-secondary" @click="stopMcp" :disabled="!mcpRunning">停止对外 MCP</button>
            </div>
          </div>

          <div class="setting-group">
            <div class="config-box">
              <div class="config-header">
                <span class="label-text">MCP Config</span>
                <button class="btn-copy" @click="copyConfig">复制</button>
              </div>
              <textarea class="config-textarea" readonly :value="mcpConfig" rows="10"></textarea>
            </div>
          </div>
        </section>
      </main>
    </div>

    <div v-if="showAppearanceImport" class="modal-mask" @click.self="closeAppearanceImport">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">导入主题</h3>
          <button class="modal-close" type="button" @click="closeAppearanceImport">×</button>
        </div>
        <textarea
          v-model="appearanceImportText"
          class="modal-textarea"
          placeholder='codex-theme-v1:{"codeThemeId":"absolutely","theme":{"accent":"#cc7d5e"}}'
          rows="3"
        ></textarea>
        <div class="modal-actions">
          <button class="btn-secondary" type="button" @click="closeAppearanceImport">取消</button>
          <button class="save-btn" type="button" @click="applyAppearanceImport">导入主题</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { NIcon, useMessage } from 'naive-ui'
import { ChevronBackOutline } from '@vicons/ionicons5'
import { useTheme } from '../composables/useTheme'
import { defaultThemeConfigs, normalizeThemeConfigs, themePresetMeta, type ThemePresetConfig, type ThemePresetId } from '../styles/theme-presets'

type SettingsSection = 'general' | 'appearance' | 'ai' | 'mcp'
type ThemeMode = 'light' | 'dark' | 'system'
type LightThemePreset = ThemePresetId
type DarkThemePreset = ThemePresetId

interface AppSettings {
  inboxPath: string
  archivePath: string
  mcpHttpPort: number
  aiProvider: string
  apiKey: string
  model: string
  baseUrl: string
  aiProcessingMode: 'off' | 'enhance'
  aiConnectionVerified: boolean
  themeMode: ThemeMode
  lightTheme: LightThemePreset
  darkTheme: DarkThemePreset
  customThemes: Record<ThemePresetId, ThemePresetConfig>
}

const settingSections = [
  { key: 'general' as const, label: '常规' },
  { key: 'appearance' as const, label: '外观' },
  { key: 'ai' as const, label: 'AI' },
  { key: 'mcp' as const, label: 'MCP' },
]

const themeModes = [
  { label: '浅色', value: 'light' as const },
  { label: '深色', value: 'dark' as const },
  { label: '跟随系统', value: 'system' as const },
]

const settings = ref<AppSettings | null>(null)
const activeSection = ref<SettingsSection>('appearance')
const selectedPreset = ref<ThemePresetId>('light')
const mcpRunning = ref(false)
const mcpError = ref<string | null>(null)
const showAppearanceImport = ref(false)
const appearanceImportText = ref('')
const message = useMessage()
const { applyThemeFromSettings } = useTheme()

onMounted(async () => {
  const loaded = await window.electronAPI?.getSettings()
  settings.value = normalizeSettings(loaded || {})
  selectedPreset.value = settings.value.themeMode === 'dark' ? settings.value.darkTheme : settings.value.lightTheme
  await refreshMcpStatus()
})

watch(
  () => settings.value ? [settings.value.aiProvider, settings.value.apiKey, settings.value.model, settings.value.baseUrl] : [],
  (next, prev) => {
    if (!settings.value || !prev.length) return
    if (JSON.stringify(next) !== JSON.stringify(prev)) {
      settings.value.aiConnectionVerified = false
      if (settings.value.aiProcessingMode === 'enhance') {
        settings.value.aiProcessingMode = 'off'
      }
    }
  }
)

const mcpConfig = computed(() => JSON.stringify({
  mcpServers: {
    'ai-inbox': {
      command: 'node',
      args: ['/Applications/AI-inbox.app/Contents/Resources/mcp-child.js']
    },
    'ai-inbox-http': {
      url: `http://localhost:${settings.value?.mcpHttpPort || 3100}/mcp`
    }
  }
}, null, 2))

const editablePresets = themePresetMeta

const selectedPresetConfig = computed(() => {
  if (!settings.value) {
    return defaultThemeConfigs[selectedPreset.value]
  }
  return settings.value.customThemes[selectedPreset.value]
})

const selectedPresetLabel = computed(() => {
  return editablePresets.find((preset) => preset.id === selectedPreset.value)?.label || selectedPreset.value
})

const selectedPresetExportText = computed(() => {
  return `codex-theme-v1:${JSON.stringify(selectedPresetConfig.value)}`
})

function normalizeSettings(raw: Record<string, unknown>): AppSettings {
  let themeMode: ThemeMode = 'system'
  let lightTheme: LightThemePreset = 'light'
  let darkTheme: DarkThemePreset = 'dark'

  if (raw.themeMode === 'light' || raw.themeMode === 'dark' || raw.themeMode === 'system') {
    themeMode = raw.themeMode
  }

  if (raw.lightTheme === 'light' || raw.lightTheme === 'notion' || raw.lightTheme === 'claude') {
    lightTheme = raw.lightTheme
  }

  if (raw.darkTheme === 'light' || raw.darkTheme === 'dark' || raw.darkTheme === 'notion' || raw.darkTheme === 'claude') {
    darkTheme = raw.darkTheme
  }

  return {
    inboxPath: String(raw.inboxPath || '~/ai-inbox'),
    archivePath: String(raw.archivePath || '~/lzm/llm-wiki/MyNote'),
    mcpHttpPort: Number(raw.mcpHttpPort || 3100),
    aiProvider: String(raw.aiProvider || 'minimax'),
    apiKey: String(raw.apiKey || ''),
    model: String(raw.model || ''),
    baseUrl: String(raw.baseUrl || ''),
    aiProcessingMode: raw.aiProcessingMode === 'enhance' ? 'enhance' : 'off',
    aiConnectionVerified: Boolean(raw.aiConnectionVerified),
    themeMode,
    lightTheme,
    darkTheme,
    customThemes: normalizeThemeConfigs(raw.customThemes),
  }
}

function serializeSettings(current: AppSettings) {
  return { ...current }
}

async function updateAppearance(patch: Partial<Pick<AppSettings, 'themeMode' | 'lightTheme' | 'darkTheme'>>) {
  if (!settings.value) return
  Object.assign(settings.value, patch)
  if (patch.themeMode === 'dark') {
    selectedPreset.value = settings.value.darkTheme
  } else if (patch.themeMode === 'light') {
    selectedPreset.value = settings.value.lightTheme
  }
  if (patch.lightTheme) {
    selectedPreset.value = patch.lightTheme
  }
  if (patch.darkTheme) {
    selectedPreset.value = patch.darkTheme
  }
  await persistAppearanceSettings(false)
}

async function persistAppearanceSettings(showMessage = false) {
  if (!settings.value) return
  await applyThemeFromSettings(settings.value)
  await saveSettings(showMessage)
}

function triggerAppearanceImport() {
  appearanceImportText.value = ''
  showAppearanceImport.value = true
}

function closeAppearanceImport() {
  showAppearanceImport.value = false
  appearanceImportText.value = ''
}

async function applyAppearanceImport() {
  if (!settings.value || !appearanceImportText.value.trim()) return
  try {
    const raw = appearanceImportText.value.trim()
    const jsonText = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw
    const parsed = JSON.parse(jsonText)
    const normalized = normalizeThemeConfigs({ [selectedPreset.value]: parsed })
    settings.value.customThemes[selectedPreset.value] = normalized[selectedPreset.value]
    await persistAppearanceSettings(false)
    message.success(`${selectedPresetLabel.value} 已导入`)
    closeAppearanceImport()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导入外观配置失败')
  }
}

async function copyAppearanceTheme() {
  await navigator.clipboard.writeText(selectedPresetExportText.value)
  message.success(`${selectedPresetLabel.value} 已复制`)
}

async function resetAppearancePreset() {
  if (!settings.value) return
  settings.value.customThemes[selectedPreset.value] = JSON.parse(JSON.stringify(defaultThemeConfigs[selectedPreset.value]))
  await persistAppearanceSettings(false)
  message.success(`${selectedPresetLabel.value} 已重置`)
}

async function testConnection() {
  if (!settings.value) return
  try {
    const result = await window.electronAPI?.testAiConnection({
      aiProvider: settings.value.aiProvider,
      apiKey: settings.value.apiKey,
      model: settings.value.model,
      baseUrl: settings.value.baseUrl,
    })
    settings.value.aiConnectionVerified = true
    message.success(result?.message || 'AI 连接成功')
    await saveSettings(false)
  } catch (error) {
    settings.value.aiConnectionVerified = false
    settings.value.aiProcessingMode = 'off'
    message.error(error instanceof Error ? error.message : 'AI 测试失败')
  }
}

async function copyConfig() {
  await navigator.clipboard.writeText(mcpConfig.value)
  message.success('MCP 配置已复制')
}

async function saveSettings(showMessage = true) {
  if (!settings.value) return
  const plainSettings = serializeSettings(JSON.parse(JSON.stringify(settings.value)))
  await window.electronAPI?.saveSettings(plainSettings)
  window.dispatchEvent(new CustomEvent('settings-changed', { detail: plainSettings }))
  if (showMessage) {
    message.success('设置已保存')
  }
  await refreshMcpStatus()
}

function handleSaveClick() {
  return saveSettings(true)
}

async function refreshMcpStatus() {
  const status = await window.electronAPI?.getMcpStatus()
  mcpRunning.value = Boolean(status?.running)
  mcpError.value = status?.error || null
}

async function startMcp() {
  const status = await window.electronAPI?.startMcp()
  mcpRunning.value = Boolean(status?.running)
  mcpError.value = status?.error || null
  if (status?.running) {
    message.success('MCP 已启动')
  } else if (status?.error) {
    message.error(status.error)
  }
}

async function stopMcp() {
  const status = await window.electronAPI?.stopMcp()
  mcpRunning.value = Boolean(status?.running)
  mcpError.value = status?.error || null
  message.success('MCP 已停止')
}
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-8) var(--space-3);
  border-bottom: 1px solid var(--border-color-light);
  flex-shrink: 0;
}

.back-btn,
.save-btn,
.segment-btn,
.theme-card,
.sidebar-item {
  transition: all var(--transition-base);
}

.back-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-control);
  background: var(--surface-control);
  cursor: pointer;
  font-size: 18px;
  color: var(--text-body);
  border-radius: 999px;
}

.back-btn:hover {
  background: var(--surface-control-hover);
  border-color: var(--border-control-hover);
}

.title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.15;
}

.save-btn {
  margin-left: auto;
  padding: 10px 16px;
  border: 1px solid var(--border-accent-soft);
  border-radius: 999px;
  background: var(--surface-accent-soft);
  color: var(--text-accent);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.save-btn:hover {
  background: var(--surface-accent-soft-hover);
}

.body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  gap: var(--space-6);
  padding: 0 var(--space-8) var(--space-8);
  overflow: hidden;
}

.settings-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  position: sticky;
  top: 0;
  align-self: stretch;
  height: 100%;
  padding: var(--space-5) var(--space-3) 0 0;
  border-right: 1px solid var(--border-strong);
}

.sidebar-item {
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.sidebar-item:hover {
  background: var(--surface-control);
  border-color: var(--border-control);
}

.sidebar-item.active {
  background: var(--surface-panel);
  border-color: var(--border-accent-soft);
  box-shadow: var(--shadow-panel);
}

.sidebar-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-body);
}

.settings-content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
  padding: var(--space-5) var(--space-2) 0 var(--space-3);
}

.settings-content::-webkit-scrollbar {
  display: none;
}

.panel {
  max-width: 860px;
}

.panel-header {
  margin-bottom: var(--space-5);
}

.panel-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
}

.setting-group + .setting-group {
  margin-top: var(--space-5);
}

.group-title {
  margin-bottom: var(--space-4);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.theme-routing-card {
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  background: transparent;
  overflow: hidden;
}

.theme-routing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-strong);
}

.scene-list,
.appearance-list {
  display: flex;
  flex-direction: column;
}

.scene-row,
.appearance-row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
  padding: 11px var(--space-4);
}

.scene-row + .scene-row,
.appearance-row + .appearance-row {
  border-top: 1px solid var(--border-strong);
}

.scene-label,
.appearance-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-body);
}

.scene-select,
.appearance-input {
  justify-self: end;
  width: min(100%, 360px);
}

.appearance-config-card {
  margin-top: var(--space-6);
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  background: transparent;
  overflow: hidden;
}

.appearance-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-strong);
}

.appearance-config-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-body);
}

.appearance-config-meta {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.appearance-config-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-2);
  flex-shrink: 0;
}

.preset-header-select {
  width: 188px;
  flex: 0 0 188px;
  background: var(--surface-neutral-soft);
  border-color: var(--border-control);
}

.appearance-row-actions .appearance-input {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: auto;
  max-width: 100%;
}

.color-input {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: var(--space-3);
  align-items: center;
}

.color-swatch {
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--border-control);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  appearance: none;
  -webkit-appearance: none;
}

.color-swatch::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-swatch::-webkit-color-swatch {
  border: none;
  border-radius: 10px;
}

.color-swatch::-moz-color-swatch {
  border: none;
  border-radius: 10px;
}

.toggle-row,
.range-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 44px;
  color: var(--text-body);
}

.range-row input[type='range'] {
  flex: 1;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.form-label,
.status-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.full-span {
  grid-column: 1 / -1;
}

.label-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 9px 18px 9px 12px;
  border: 1px solid var(--border-color-light);
  border-radius: 12px;
  background: var(--surface-neutral-faint);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color var(--transition-base), background var(--transition-base);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-link);
  background: var(--surface-control-hover);
}

.form-input::placeholder {
  color: var(--text-placeholder);
}

.segmented-row {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: var(--surface-neutral-faint);
  border: 1px solid var(--border-default);
}

.segment-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  cursor: pointer;
}

.segment-btn.active {
  background: var(--surface-accent-soft-hover);
  color: var(--text-accent);
}

.status-block {
  justify-content: flex-end;
}

.status-dot {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
  color: var(--text-secondary);
}

.status-dot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.running::before {
  background: var(--color-success);
}

.status-dot.stopped::before {
  background: var(--color-error);
}

.action-row {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.error-text {
  margin-top: var(--space-3);
  font-size: 13px;
  color: var(--color-danger-text);
  line-height: 1.5;
}

.config-box {
  border: 1px solid var(--border-color-light);
  border-radius: 20px;
  overflow: hidden;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--surface-panel-soft);
  border-bottom: 1px solid var(--border-color-light);
}

.config-textarea {
  width: 100%;
  padding: var(--space-4);
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  font-family: var(--font-mono);
  line-height: 1.6;
  resize: vertical;
}

.config-textarea:focus {
  outline: none;
}

.btn-copy,
.btn-primary,
.btn-secondary {
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all var(--transition-base);
}

.btn-copy {
  padding: 5px 10px;
  border-radius: 999px;
  background: transparent;
  color: var(--text-body);
  font-size: 12px;
  border: 1px solid var(--border-control);
}

.btn-copy:hover {
  background: var(--surface-control-hover);
  color: var(--text-body);
}

.btn-primary {
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--color-success);
  color: white;
  font-size: 14px;
}

.btn-primary:hover {
  opacity: 0.92;
}

.btn-secondary {
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--surface-control);
  color: var(--text-primary);
  font-size: 14px;
}

.btn-secondary:hover {
  background: var(--color-link);
  color: white;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  z-index: 20;
}

.modal-card {
  width: min(100%, 560px);
  border-radius: 24px;
  background: var(--surface-panel);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
  padding: var(--space-5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-body);
}

.modal-close {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.modal-textarea {
  width: 100%;
  margin-top: var(--space-4);
  padding: 12px 14px;
  border: 1px solid var(--border-accent-soft);
  border-radius: 16px;
  background: var(--surface-control-hover);
  color: var(--text-body);
  font-size: 14px;
  line-height: 1.6;
  resize: none;
}

.modal-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.modal-actions {
  margin-top: var(--space-4);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

@media (max-width: 1080px) {
  .body {
    grid-template-columns: 1fr;
    gap: var(--space-5);
    overflow: auto;
    padding-top: var(--space-5);
  }

  .settings-sidebar {
    position: static;
    flex-direction: row;
    height: auto;
    overflow: auto;
    padding: 0 0 var(--space-2);
    border-right: none;
    border-bottom: 1px solid var(--border-strong);
    padding-bottom: var(--space-2);
  }

  .sidebar-item {
    min-width: 168px;
  }

  .form-grid,
  .scene-row,
  .appearance-row {
    grid-template-columns: 1fr;
  }

  .settings-content {
    padding: 0;
  }

  .theme-routing-header {
    flex-direction: column;
    align-items: stretch;
  }

  .scene-select,
  .appearance-input {
    width: 100%;
    justify-self: stretch;
  }

  .preset-header-select {
    width: 100%;
    flex-basis: auto;
  }

  .appearance-row-actions .appearance-input,
  .appearance-config-actions {
    width: 100%;
    justify-content: stretch;
  }
}
</style>
