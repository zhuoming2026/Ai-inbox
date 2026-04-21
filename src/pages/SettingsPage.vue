<template>
  <div class="settings-page">
    <header class="header">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <div class="header-copy">
        <h1 class="title">设置</h1>
        <p class="subtitle">把应用配置拆成清晰的几个工作区，后面继续扩展也不会乱。</p>
      </div>
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
          <span class="sidebar-hint">{{ section.hint }}</span>
        </button>
      </aside>

      <main class="settings-content">
        <section v-if="activeSection === 'general'" class="panel">
          <div class="panel-header">
            <h2 class="panel-title">常规</h2>
            <p class="panel-description">先放应用最基础的行为和路径设置，避免它们混进 AI 或主题里。</p>
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
            <p class="panel-description">把主题内容和切换逻辑拆开，后面做主题系统时会更稳。</p>
          </div>

          <div class="setting-group">
            <h3 class="group-title">切换逻辑</h3>
            <div class="segmented-row">
              <button
                v-for="mode in themeModes"
                :key="mode.value"
                type="button"
                class="segment-btn"
                :class="{ active: settings.themeMode === mode.value }"
                @click="settings.themeMode = mode.value"
              >
                {{ mode.label }}
              </button>
            </div>
            <p class="field-hint">当前生效：{{ activeThemeSummary }}</p>
          </div>

          <div class="setting-group">
            <h3 class="group-title">浅色主题</h3>
            <div class="theme-grid">
              <button
                v-for="option in lightThemeOptions"
                :key="option.value"
                type="button"
                class="theme-card"
                :class="{ active: settings.lightTheme === option.value }"
                @click="settings.lightTheme = option.value"
              >
                <span class="theme-card-name">{{ option.label }}</span>
                <span class="theme-card-hint">{{ option.hint }}</span>
              </button>
            </div>
          </div>

          <div class="setting-group">
            <h3 class="group-title">深色主题</h3>
            <div class="theme-grid compact">
              <button
                v-for="option in darkThemeOptions"
                :key="option.value"
                type="button"
                class="theme-card"
                :class="{ active: settings.darkTheme === option.value }"
                @click="settings.darkTheme = option.value"
              >
                <span class="theme-card-name">{{ option.label }}</span>
                <span class="theme-card-hint">{{ option.hint }}</span>
              </button>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'ai'" class="panel">
          <div class="panel-header">
            <h2 class="panel-title">AI</h2>
            <p class="panel-description">这块只管理模型连接和 Enrich 行为，不再混进别的配置。</p>
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
            <p class="panel-description">集中管理对外接口和给其他客户端的接入配置。</p>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'

type SettingsSection = 'general' | 'appearance' | 'ai' | 'mcp'
type ThemeMode = 'light' | 'dark' | 'system'
type LightThemePreset = 'light'
type DarkThemePreset = 'dark'

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
}

const settingSections = [
  { key: 'general' as const, label: '常规', hint: '目录与基础行为' },
  { key: 'appearance' as const, label: '外观', hint: '主题与切换逻辑' },
  { key: 'ai' as const, label: 'AI', hint: '模型与 Enrich' },
  { key: 'mcp' as const, label: 'MCP', hint: '服务与接入配置' },
]

const themeModes = [
  { label: '浅色', value: 'light' as const },
  { label: '深色', value: 'dark' as const },
  { label: '跟随系统', value: 'system' as const },
]

const lightThemeOptions = [
  { label: 'Default Light', value: 'light' as const, hint: '标准黑白基线，后面所有浅色预设都从这套派生' },
]

const darkThemeOptions = [
  { label: 'Default Dark', value: 'dark' as const, hint: '先保留一套稳定暗色，后面再扩展' },
]

const settings = ref<AppSettings | null>(null)
const activeSection = ref<SettingsSection>('appearance')
const mcpRunning = ref(false)
const mcpError = ref<string | null>(null)
const message = useMessage()

onMounted(async () => {
  const loaded = await window.electronAPI?.getSettings()
  settings.value = normalizeSettings(loaded || {})
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

const activeThemeSummary = computed(() => {
  if (!settings.value) return ''
  if (settings.value.themeMode === 'system') {
    return `跟随系统，在浅色时使用 ${labelForLightTheme(settings.value.lightTheme)}，在深色时使用 ${labelForDarkTheme(settings.value.darkTheme)}`
  }
  return settings.value.themeMode === 'light'
    ? `固定使用 ${labelForLightTheme(settings.value.lightTheme)}`
    : `固定使用 ${labelForDarkTheme(settings.value.darkTheme)}`
})

function normalizeSettings(raw: Record<string, unknown>): AppSettings {
  let themeMode: ThemeMode = 'system'
  let lightTheme: LightThemePreset = 'light'
  let darkTheme: DarkThemePreset = 'dark'

  if (raw.themeMode === 'light' || raw.themeMode === 'dark' || raw.themeMode === 'system') {
    themeMode = raw.themeMode
  }

  if (raw.lightTheme === 'light') {
    lightTheme = raw.lightTheme
  }

  if (raw.darkTheme === 'dark') {
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
  }
}

function serializeSettings(current: AppSettings) {
  return { ...current }
}

function labelForLightTheme(theme: LightThemePreset) {
  return lightThemeOptions.find((option) => option.value === theme)?.label || theme
}

function labelForDarkTheme(theme: DarkThemePreset) {
  return darkThemeOptions.find((option) => option.value === theme)?.label || theme
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
  gap: var(--space-4);
  padding: var(--space-4) var(--space-8);
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
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}

.back-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.header-copy {
  min-width: 0;
}

.title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.15;
}

.subtitle {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
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
  grid-template-columns: 220px minmax(0, 1fr);
  gap: var(--space-8);
  padding: var(--space-8);
}

.settings-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.sidebar-item {
  border: 1px solid transparent;
  border-radius: 18px;
  background: transparent;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
}

.sidebar-item:hover {
  background: var(--surface-panel-soft);
  border-color: var(--border-default);
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
  color: var(--text-primary);
}

.sidebar-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.settings-content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding-right: var(--space-2);
}

.panel {
  max-width: 860px;
}

.panel-header {
  margin-bottom: var(--space-6);
}

.panel-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.1;
}

.panel-description {
  margin-top: 10px;
  max-width: 560px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.setting-group + .setting-group {
  margin-top: var(--space-8);
}

.group-title {
  margin-bottom: var(--space-4);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
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
  padding: 11px 14px;
  border: 1px solid var(--border-color-light);
  border-radius: 16px;
  background: var(--surface-control);
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
  background: var(--surface-panel);
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
  color: var(--color-primary);
}

.field-hint {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.theme-grid.compact {
  grid-template-columns: minmax(0, 280px);
}

.theme-card {
  border: 1px solid var(--border-default);
  border-radius: 24px;
  background: var(--surface-panel);
  padding: 18px 16px;
  text-align: left;
  cursor: pointer;
}

.theme-card:hover {
  border-color: var(--border-accent-soft);
  transform: translateY(-1px);
}

.theme-card.active {
  border-color: var(--border-accent-soft);
  box-shadow: var(--shadow-panel);
  background: var(--surface-panel-soft);
}

.theme-card-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.theme-card-hint {
  display: block;
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
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
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--surface-control-hover);
  color: var(--text-primary);
  font-size: 12px;
}

.btn-copy:hover {
  background: var(--color-link);
  color: white;
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

@media (max-width: 1080px) {
  .body {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }

  .settings-sidebar {
    flex-direction: row;
    overflow: auto;
    padding-bottom: var(--space-2);
  }

  .sidebar-item {
    min-width: 168px;
  }

  .theme-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
