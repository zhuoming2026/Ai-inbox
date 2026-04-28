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
                  <select class="form-input preset-header-select" v-model="selectedPreset" @change="applySelectedTheme">
                    <option v-for="preset in editablePresets" :key="`header-${preset.id}`" :value="preset.id">{{ preset.label }}</option>
                  </select>
                  <button class="btn-copy" type="button" @click="triggerAppearanceImport">导入</button>
                  <button class="btn-copy" type="button" @click="copyAppearanceTheme">复制</button>
                  <button class="btn-copy" type="button" @click="handleImportTypora">Typora 导入</button>
                  <button v-if="isSelectedBaseTheme" class="btn-copy" type="button" @click="resetAppearancePreset">重置</button>
                  <button v-else class="btn-copy danger" type="button" @click="deleteSelectedTheme">删除</button>
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">主题名称</span>
                <input class="form-input appearance-input" type="text" v-model="selectedPresetConfig.name" @change="persistAppearanceSettings(false)" />
              </div>

              <!-- App 样式 -->
              <div class="appearance-section-header">
                <span class="section-label">App 样式</span>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">强调色</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.system.accent" @update:model-value="setColorToken('system.accent', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">强调色预览</span>
                <div class="accent-preview appearance-input">
                  <span class="accent-focus-sample">Focus</span>
                  <span class="accent-star-sample">★</span>
                  <span class="accent-link-sample">Link</span>
                </div>
              </div>
              <div class="appearance-section-header">
                <span class="section-label">主要按钮</span>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">按钮背景</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.app.actions.primary.bg" @update:model-value="setColorToken('app.actions.primary.bg', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">按钮悬停背景</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.app.actions.primary.bgHover" @update:model-value="setColorToken('app.actions.primary.bgHover', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">按钮文字</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.app.actions.primary.text" @update:model-value="setColorToken('app.actions.primary.text', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">按钮边框</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.app.actions.primary.border" @update:model-value="setColorToken('app.actions.primary.border', $event)" />
                </div>
              </div>
              <div class="appearance-row preview-row">
                <span class="appearance-label">主色预览</span>
                <div class="primary-control-preview appearance-input">
                  <button type="button" class="preview-primary-button">Inbox</button>
                  <button type="button" class="preview-today-button">Today</button>
                  <span class="preview-edit-tag">Edit</span>
                  <button type="button" class="preview-filter-button">All</button>
                  <button type="button" class="preview-save-button">保存更改</button>
                  <button type="button" class="preview-segment-button">浅色</button>
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">背景</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.app.surfaces.page" @update:model-value="setColorToken('app.surfaces.page', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">前景</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.app.text.primary" @update:model-value="setColorToken('app.text.primary', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">面板色</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.app.surfaces.panel" @update:model-value="setColorToken('app.surfaces.panel', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">控件色</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.app.surfaces.control" @update:model-value="setColorToken('app.surfaces.control', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">圆角</span>
                <input class="form-input appearance-input" type="text" v-model="selectedPresetConfig.tokens.radius.lg" @change="persistAppearanceSettings(false)" placeholder="如: 12px" />
              </div>

              <!-- 字体 -->
              <div class="appearance-section-header">
                <span class="section-label">字体</span>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">界面字体</span>
                <select class="form-input appearance-input" v-model="selectedPresetConfig.tokens.fonts.ui" @change="persistAppearanceSettings(false)">
                  <option v-for="font in systemFonts" :key="font" :value="font">{{ font }}</option>
                </select>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">文章正文字体</span>
                <select class="form-input appearance-input" v-model="selectedPresetConfig.tokens.fonts.body" @change="persistAppearanceSettings(false)">
                  <option value="">跟随界面字体</option>
                  <option v-for="font in systemFonts" :key="font" :value="font">{{ font }}</option>
                </select>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">标题字体</span>
                <select class="form-input appearance-input" v-model="selectedPresetConfig.tokens.fonts.heading" @change="persistAppearanceSettings(false)">
                  <option value="">跟随界面字体</option>
                  <option v-for="font in systemFonts" :key="font" :value="font">{{ font }}</option>
                </select>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">代码字体</span>
                <select class="form-input appearance-input" v-model="selectedPresetConfig.tokens.fonts.code" @change="persistAppearanceSettings(false)">
                  <option v-for="font in monoFonts" :key="font" :value="font">{{ font }}</option>
                </select>
              </div>

              <!-- 文章正文样式 -->
              <div class="appearance-section-header">
                <span class="section-label">文章正文</span>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">标题颜色</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.article.heading" @update:model-value="setColorToken('article.heading', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">链接色</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.article.link" @update:model-value="setColorToken('article.link', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">引用背景</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.blocks.blockquoteBg" @update:model-value="setColorToken('blocks.blockquoteBg', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">引用边框</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.blocks.blockquoteBorder" @update:model-value="setColorToken('blocks.blockquoteBorder', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">表格边框</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.blocks.tableBorder" @update:model-value="setColorToken('blocks.tableBorder', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">表头背景</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.blocks.tableHeaderBg" @update:model-value="setColorToken('blocks.tableHeaderBg', $event)" />
                </div>
              </div>

              <!-- 代码区样式 -->
              <div class="appearance-section-header">
                <span class="section-label">代码区</span>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">inline 代码背景</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.code.inlineBg" @update:model-value="setColorToken('code.inlineBg', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">inline 代码文字</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.code.inlineText" @update:model-value="setColorToken('code.inlineText', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">代码块背景</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.code.blockBg" @update:model-value="setColorToken('code.blockBg', $event)" />
                </div>
              </div>
              <div class="appearance-row">
                <span class="appearance-label">代码块文字</span>
                <div class="color-input appearance-input">
                  <ColorField class="appearance-input" :model-value="selectedPresetConfig.tokens.code.blockText" @update:model-value="setColorToken('code.blockText', $event)" />
                </div>
              </div>

              <div class="appearance-section-header">
                <span class="section-label">源码</span>
              </div>
              <div class="source-editor-block">
                <div class="source-editor-actions">
                  <span class="source-editor-state" :class="{ error: Boolean(themeSourceError) }">{{ themeSourceError || sourceEditorStatus }}</span>
                  <button class="btn-copy" type="button" @click="loadThemeSourceFromSelected">重新载入</button>
                  <button class="btn-copy" type="button" @click="copyThemeSource">复制源码</button>
                  <button class="save-btn source-apply-btn" type="button" @click="applyThemeSourceToSelected">应用源码</button>
                </div>
                <textarea
                  v-model="themeSourceText"
                  class="theme-source-textarea"
                  spellcheck="false"
                  @input="markThemeSourceDirty"
                ></textarea>
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

    <div v-if="showImportDialog" class="modal-mask" @click.self="cancelImport">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">导入主题</h3>
          <button class="modal-close" type="button" @click="cancelImport">×</button>
        </div>
        <div class="import-dialog-body">
          <label class="form-label">
            <span class="label-text">主题名</span>
            <input class="form-input" type="text" v-model="importNameInput" />
          </label>
          <div v-if="importWarnings.length > 0" class="import-warnings">
            <span class="label-text">注意事项</span>
            <ul class="warning-list">
              <li v-for="(w, i) in importWarnings" :key="i">{{ w }}</li>
            </ul>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" type="button" @click="confirmImport(false)" :disabled="importLoading">仅导入</button>
          <button class="save-btn" type="button" @click="confirmImport(true)" :disabled="importLoading">导入并启用</button>
        </div>
      </div>
    </div>

    <div v-if="showAppearanceImport" class="modal-mask" @click.self="closeAppearanceImport">
      <div class="modal-card">
        <div class="modal-header">
        <h3 class="modal-title">导入主题文件</h3>
        <button class="modal-close" type="button" @click="closeAppearanceImport">×</button>
      </div>
      <label class="form-label modal-name-field">
        <span class="label-text">主题名</span>
        <input class="form-input" type="text" v-model="appearanceImportName" />
      </label>
      <textarea
        v-model="appearanceImportText"
        class="modal-textarea"
        placeholder="粘贴 ai-inbox theme v2 JSON"
        rows="8"
      ></textarea>
      <div v-if="appearanceImportWarnings.length > 0" class="import-warnings">
        <span class="label-text">注意事项</span>
        <ul class="warning-list">
          <li v-for="(w, i) in appearanceImportWarnings" :key="i">{{ w }}</li>
        </ul>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" type="button" @click="closeAppearanceImport">取消</button>
        <button class="btn-secondary" type="button" @click="applyAppearanceImport(false)">导入</button>
        <button class="save-btn" type="button" @click="applyAppearanceImport(true)">导入并应用</button>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, shallowRef, watch } from 'vue'
import { NIcon, useMessage } from 'naive-ui'
import { ChevronBackOutline } from '@vicons/ionicons5'
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
import type { EditorCodeTheme, TypographyTheme } from '../modules/rich-editor'

type SettingsSection = 'general' | 'appearance' | 'ai' | 'mcp'
type ThemeMode = 'light' | 'dark' | 'system'
type LightThemePreset = string
type DarkThemePreset = string

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
  editorTypographyTheme: TypographyTheme
  editorCodeTheme: EditorCodeTheme
  activeThemeId: string
  customThemes: Record<string, ThemePresetConfig>
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
const appearanceImportName = ref('')
const appearanceImportWarnings = ref<string[]>([])
const showImportDialog = ref(false)
const importDraft = shallowRef<TyporaThemeImportDraft | null>(null)
const pendingImportConfig = shallowRef<ThemePresetConfig | null>(null)
const importWarnings = ref<string[]>([])
const importNameInput = ref('')
const importLoading = ref(false)
const themeSourceText = ref('')
const themeSourceDirty = ref(false)
const themeSourceError = ref('')
const message = useMessage()

const systemFonts = [
  'PingFang SC',
  'SF Pro Display',
  'Helvetica Neue',
  'Noto Sans SC',
  'Microsoft YaHei',
  'SimSun',
  'SimHei',
  'Arial',
  'Georgia',
  'Times New Roman',
]

const monoFonts = [
  'SF Mono',
  'JetBrains Mono',
  'Fira Code',
  'Menlo',
  'Monaco',
  'Consolas',
  'Source Code Pro',
]

const { applyThemeFromSettings } = useTheme()
const { previewTypora } = useImportedThemes()

interface RgbaColor {
  r: number
  g: number
  b: number
  a: number
}

interface HsvaColor {
  h: number
  s: number
  v: number
  a: number
}

const fallbackColor: RgbaColor = { r: 250, g: 187, b: 24, a: 1 }
const editableColorTokenPaths = [
  'system.accent',
  'app.actions.primary.bg',
  'app.actions.primary.bgHover',
  'app.actions.primary.text',
  'app.actions.primary.border',
  'app.surfaces.page',
  'app.text.primary',
  'app.surfaces.panel',
  'app.surfaces.control',
  'article.heading',
  'article.link',
  'blocks.blockquoteBg',
  'blocks.blockquoteBorder',
  'blocks.tableBorder',
  'blocks.tableHeaderBg',
  'code.inlineBg',
  'code.inlineText',
  'code.blockBg',
  'code.blockText',
]

function clampChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function clampAlpha(value: number) {
  return Math.min(1, Math.max(0, value))
}

function formatAlpha(value: number) {
  return String(Number(clampAlpha(value).toFixed(2)))
}

function formatRgba(color: RgbaColor) {
  return `rgba(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(color.b)}, ${formatAlpha(color.a)})`
}

function parseHexColor(value: string): RgbaColor | null {
  const cleaned = value.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3,8}$/.test(cleaned)) return null

  if (cleaned.length === 3 || cleaned.length === 4) {
    const [r, g, b, a = 'f'] = cleaned.split('')
    return {
      r: parseInt(`${r}${r}`, 16),
      g: parseInt(`${g}${g}`, 16),
      b: parseInt(`${b}${b}`, 16),
      a: parseInt(`${a}${a}`, 16) / 255,
    }
  }

  if (cleaned.length === 6 || cleaned.length === 8) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
      a: cleaned.length === 8 ? parseInt(cleaned.slice(6, 8), 16) / 255 : 1,
    }
  }

  return null
}

function parseRgbColor(value: string): RgbaColor | null {
  const match = value.trim().match(/^rgba?\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)(?:\s*,\s*([.\d]+)\s*)?\)$/i)
  if (!match) return null
  const r = Number(match[1])
  const g = Number(match[2])
  const b = Number(match[3])
  const a = match[4] === undefined ? 1 : Number(match[4])
  if (![r, g, b, a].every(Number.isFinite)) return null
  return {
    r,
    g,
    b,
    a,
  }
}

function parseCssColor(value: string): RgbaColor | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.startsWith('#') ? parseHexColor(trimmed) : parseRgbColor(trimmed)
}

function normalizeColorValue(value: string, fallback = fallbackColor) {
  return formatRgba(parseCssColor(value) || fallback)
}

function rgbaToHsva(color: RgbaColor): HsvaColor {
  const r = clampChannel(color.r) / 255
  const g = clampChannel(color.g) / 255
  const b = clampChannel(color.b) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0

  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
    a: clampAlpha(color.a),
  }
}

function hsvaToRgba(color: HsvaColor): RgbaColor {
  const h = ((color.h % 360) + 360) % 360
  const s = clampAlpha(color.s)
  const v = clampAlpha(color.v)
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
    a: clampAlpha(color.a),
  }
}

function getTokenAtPath(tokens: ThemePresetConfig['tokens'], path: string) {
  const parts = path.split('.')
  let obj: any = tokens
  for (const part of parts) {
    obj = obj?.[part]
  }
  return obj
}

function setTokenAtPath(tokens: ThemePresetConfig['tokens'], path: string, value: string) {
  const parts = path.split('.')
  let obj: any = tokens
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]]
  }
  obj[parts[parts.length - 1]] = value
}

function normalizeEditableColorTokens(config: ThemePresetConfig) {
  for (const path of editableColorTokenPaths) {
    const value = getTokenAtPath(config.tokens, path)
    if (typeof value !== 'string') continue
    const parsed = parseCssColor(value)
    if (parsed) {
      setTokenAtPath(config.tokens, path, formatRgba(parsed))
    }
  }
}

const ColorField = defineComponent({
  name: 'ColorField',
  props: {
    modelValue: {
      type: String,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const pickerOpen = ref(false)
    const parsedColor = computed(() => parseCssColor(props.modelValue) || fallbackColor)
    const hsvaColor = computed(() => rgbaToHsva(parsedColor.value))
    const alphaPercent = computed(() => Math.round(hsvaColor.value.a * 100))
    const hueColor = computed(() => formatRgba(hsvaToRgba({ h: hsvaColor.value.h, s: 1, v: 1, a: 1 })))
    const pickerStyle = computed(() => ({
      '--picker-hue-color': hueColor.value,
      '--picker-thumb-x': `${hsvaColor.value.s * 100}%`,
      '--picker-thumb-y': `${(1 - hsvaColor.value.v) * 100}%`,
    }))

    const emitColor = (color: RgbaColor) => {
      emit('update:modelValue', formatRgba(color))
    }

    const emitHsva = (next: Partial<HsvaColor>) => {
      emitColor(hsvaToRgba({ ...hsvaColor.value, ...next }))
    }

    const updateSaturationValue = (event: PointerEvent) => {
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      emitHsva({
        s: clampAlpha((event.clientX - rect.left) / rect.width),
        v: 1 - clampAlpha((event.clientY - rect.top) / rect.height),
      })
    }

    return () => h('div', { class: 'color-field' }, [
      h('button', {
        class: 'color-swatch',
        type: 'button',
        style: { background: formatRgba(parsedColor.value) },
        onClick: () => {
          pickerOpen.value = !pickerOpen.value
        },
      }),
      h('input', {
        class: 'form-input color-text-input',
        type: 'text',
        value: normalizeColorValue(props.modelValue),
        onChange: (event: Event) => {
          emit('update:modelValue', normalizeColorValue((event.target as HTMLInputElement).value, parsedColor.value))
        },
      }),
      pickerOpen.value && h('div', { class: 'color-popover', style: pickerStyle.value }, [
        h('div', {
          class: 'color-plane',
          onPointerdown: (event: PointerEvent) => {
            ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
            updateSaturationValue(event)
          },
          onPointermove: (event: PointerEvent) => {
            if (event.buttons === 1) updateSaturationValue(event)
          },
        }, [
          h('span', { class: 'color-plane-thumb' }),
        ]),
        h('div', { class: 'color-popover-row' }, [
          h('span', { class: 'color-popover-label' }, '色相'),
          h('input', {
            class: 'color-hue-slider',
            type: 'range',
            min: '0',
            max: '360',
            step: '1',
            value: Math.round(hsvaColor.value.h),
            onInput: (event: Event) => {
              emitHsva({ h: Number((event.target as HTMLInputElement).value) })
            },
          }),
        ]),
        h('div', { class: 'color-popover-row' }, [
          h('span', { class: 'color-popover-label' }, '透明度'),
          h('input', {
            class: 'color-alpha-slider',
            type: 'range',
            min: '0',
            max: '100',
            step: '1',
            value: alphaPercent.value,
            onInput: (event: Event) => {
              emitHsva({ a: Number((event.target as HTMLInputElement).value) / 100 })
            },
          }),
          h('span', { class: 'color-alpha-value' }, `${alphaPercent.value}%`),
        ]),
      ]),
    ])
  },
})

function setColorToken(path: string, value: string) {
  setTokenAtPath(selectedPresetConfig.value.tokens, path, normalizeColorValue(value))
  persistAppearanceSettings(false)
}

onMounted(async () => {
  const loaded = await window.electronAPI?.getSettings()
  settings.value = normalizeSettings(loaded || {})
  selectedPreset.value = resolveSelectedTheme(settings.value)
  loadThemeSourceFromSelected()
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

const editablePresets = computed(() => listThemeOptions(settings.value?.customThemes || defaultThemeConfigs))

const selectedPresetConfig = computed(() => {
  if (!settings.value) {
    return defaultThemeConfigs[selectedPreset.value] || defaultThemeConfigs.light
  }
  return settings.value.customThemes[selectedPreset.value] || defaultThemeConfigs.light
})

const selectedPresetLabel = computed(() => {
  return editablePresets.value.find((preset) => preset.id === selectedPreset.value)?.label || selectedPreset.value
})

const isSelectedBaseTheme = computed(() => isBaseThemeId(selectedPreset.value))

const sourceEditorStatus = computed(() => themeSourceDirty.value ? '源码未应用' : '源码已同步')

watch(selectedPreset, () => {
  loadThemeSourceFromSelected()
})

watch(
  selectedPresetConfig,
  () => {
    if (!themeSourceDirty.value) {
      loadThemeSourceFromSelected()
    }
  },
  { deep: true }
)

function resolveSelectedTheme(current: AppSettings) {
  if (current.themeMode === 'dark') return current.darkTheme
  if (current.themeMode === 'light') return current.lightTheme
  return current.lightTheme
}

function normalizeSettings(raw: Record<string, unknown>): AppSettings {
  let themeMode: ThemeMode = 'system'
  let lightTheme: LightThemePreset = 'light'
  let darkTheme: DarkThemePreset = 'dark'
  let editorTypographyTheme: TypographyTheme = 'typora-github'
  let editorCodeTheme: EditorCodeTheme = 'github'

  if (raw.themeMode === 'light' || raw.themeMode === 'dark' || raw.themeMode === 'system') {
    themeMode = raw.themeMode
  }

  const normalizedThemes = normalizeThemeConfigs(raw.customThemes)
  const themeIds = Object.keys(normalizedThemes)

  if (typeof raw.lightTheme === 'string' && themeIds.includes(raw.lightTheme)) {
    lightTheme = raw.lightTheme
  }

  if (typeof raw.darkTheme === 'string' && themeIds.includes(raw.darkTheme)) {
    darkTheme = raw.darkTheme
  }

  if (raw.editorTypographyTheme === 'default' || raw.editorTypographyTheme === 'serif' || raw.editorTypographyTheme === 'typora-github') {
    editorTypographyTheme = raw.editorTypographyTheme
  }

  if (raw.editorCodeTheme === 'github' || raw.editorCodeTheme === 'night' || raw.editorCodeTheme === 'paper' || raw.editorCodeTheme === 'maize') {
    editorCodeTheme = raw.editorCodeTheme
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
    editorTypographyTheme,
    editorCodeTheme,
    activeThemeId: typeof raw.activeThemeId === 'string' ? raw.activeThemeId : lightTheme,
    customThemes: normalizedThemes,
  }
}

function serializeSettings(current: AppSettings) {
  return { ...current }
}

function serializeThemeSource(config: ThemePresetConfig) {
  const source = JSON.parse(JSON.stringify({
    name: config.name,
    variant: config.variant,
    codeThemeId: config.codeThemeId,
    tokens: config.tokens,
    articleCss: config.articleCss || '',
    codeCss: config.codeCss || '',
  })) as ThemePresetConfig
  normalizeEditableColorTokens(source)
  return JSON.stringify(source, null, 2)
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
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('主题源码必须是 JSON 对象')
    }
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
  settings.value.activeThemeId = resolveSelectedTheme(settings.value)
  await persistAppearanceSettings(false)
}

async function persistAppearanceSettings(showMessage = false) {
  if (!settings.value) return
  normalizeEditableColorTokens(selectedPresetConfig.value)
  await applyThemeFromSettings(settings.value)
  await saveSettings(showMessage)
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
    id: true,
    name: true,
    codeThemeId: true,
    variant: true,
    tokens: defaultThemeConfigs.light.tokens,
    articleCss: true,
    codeCss: true,
  } as Record<string, unknown>
  const schemaAtPath = prefix
    ? prefix.split('.').reduce<unknown>((current, key) => (
        typeof current === 'object' && current !== null && !Array.isArray(current)
          ? (current as Record<string, unknown>)[key]
          : undefined
      ), schema)
    : schema
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return []
  if (typeof schemaAtPath !== 'object' || schemaAtPath === null || Array.isArray(schemaAtPath)) return []
  const allowedKeys = Object.keys(schemaAtPath)

  const extras: string[] = []
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (!allowedKeys.includes(key)) {
      extras.push(path)
      continue
    }
    extras.push(...collectExtraThemeKeys(nested, path))
  }
  return extras
}

function parseThemeImport(rawText: string, nameFallback: string) {
  const jsonText = stripThemeFileComments(rawText).replace(/^codex-theme-v[12]:\s*/, '')
  const parsed = JSON.parse(jsonText)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('主题文件格式错误：根节点必须是对象')
  }
  if (!('tokens' in parsed)) {
    throw new Error('主题文件格式错误：必须包含 tokens 字段')
  }
  if (typeof (parsed as any).tokens !== 'object' || (parsed as any).tokens === null || Array.isArray((parsed as any).tokens)) {
    throw new Error('主题文件格式错误：tokens 必须是对象')
  }

  // 提取 extra key warning
  const extraWarnings = collectExtraThemeKeys(parsed).map((key) => `未使用的字段: ${key}`)

  // 提取缺失字段 warning（用 light 主题对照）
  const missingWarnings: string[] = []
  const normalizedLight = normalizeThemeConfig('__check__', {}, defaultThemeConfigs.light)
  const checkTokens = (parsed as any).tokens || {}
  const checkFonts = checkTokens.fonts || {}
  const lightTokens = normalizedLight.tokens

  const checkFields: Array<[string, unknown, unknown]> = [
    ['tokens.system.accent', checkTokens.system?.accent, lightTokens.system.accent],
    ['tokens.app.surfaces.page', checkTokens.app?.surfaces?.page, lightTokens.app.surfaces.page],
    ['tokens.app.text.primary', checkTokens.app?.text?.primary, lightTokens.app.text.primary],
    ['tokens.fonts.ui', checkFonts.ui, lightTokens.fonts.ui],
    ['tokens.fonts.body', checkFonts.body, lightTokens.fonts.body],
    ['tokens.fonts.heading', checkFonts.heading, lightTokens.fonts.heading],
    ['tokens.fonts.code', checkFonts.code, lightTokens.fonts.code],
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
    if (warnings.length > 0) {
      message.warning(`主题已导入，忽略 ${warnings.length} 个未使用字段`)
    }
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
  settings.value.customThemes[id] = JSON.parse(JSON.stringify({
    ...source,
    id,
    name,
  }))
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
  if (isBaseThemeId(id)) {
    message.error('基础主题不可删除')
    return
  }
  delete settings.value.customThemes[id]
  if (settings.value.lightTheme === id) settings.value.lightTheme = 'light'
  if (settings.value.darkTheme === id) settings.value.darkTheme = 'dark'
  if (settings.value.activeThemeId === id) settings.value.activeThemeId = settings.value.lightTheme
  selectedPreset.value = resolveSelectedTheme(settings.value)
  await persistAppearanceSettings(false)
  message.success('主题已删除')
}

async function handleImportTypora() {
  importLoading.value = true
  try {
    const result = await previewTypora()
    if (!result.ok || !result.draft) {
      if (result.ok === false && result.draft === null) {
        // 用户取消选择器，不做任何事
      }
      return
    }
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
      id,
      name,
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
  border: 1px solid var(--action-primary-border);
  border-radius: 999px;
  background: var(--action-primary-bg);
  color: var(--action-primary-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.save-btn:hover {
  background: var(--action-primary-bg-hover);
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

.appearance-section-header {
  background: var(--surface-panel-soft);
}

.appearance-section-header {
  padding: var(--space-4) var(--space-4) var(--space-2);
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
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

.preview-row {
  align-items: start;
}

.color-field {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: var(--space-3);
  align-items: center;
  position: relative;
  justify-self: end;
  width: min(100%, 360px);
}

.color-field :deep(.color-swatch) {
  display: block;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--border-control);
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.color-field :deep(.color-popover) {
  position: absolute;
  z-index: 20;
  top: calc(100% + 8px);
  left: 0;
  width: 236px;
  padding: 10px;
  border: 1px solid var(--border-control);
  border-radius: 12px;
  background: var(--surface-panel);
  box-shadow: var(--shadow-popover);
}

.color-field :deep(.color-plane) {
  position: relative;
  height: 150px;
  border: 1px solid var(--border-control);
  border-radius: 8px;
  background:
    linear-gradient(to top, #000, transparent),
    linear-gradient(to right, #fff, var(--picker-hue-color));
  cursor: crosshair;
}

.color-field :deep(.color-plane-thumb) {
  position: absolute;
  left: var(--picker-thumb-x);
  top: var(--picker-thumb-y);
  width: 14px;
  height: 14px;
  border: 2px solid #fff;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.65);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.color-field :deep(.color-popover-row) {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 38px;
  align-items: center;
  gap: var(--space-2);
  margin-top: 10px;
}

.color-field :deep(.color-popover-row:first-of-type) {
  grid-template-columns: 48px minmax(0, 1fr) 38px;
}

.color-field :deep(.color-popover-label) {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.color-field :deep(.color-hue-slider),
.color-field :deep(.color-alpha-slider) {
  width: 100%;
  grid-column: 2;
}

.color-field :deep(.color-hue-slider) {
  accent-color: var(--picker-hue-color);
}

.color-field :deep(.color-alpha-slider) {
  accent-color: var(--color-primary);
}

.color-field :deep(.color-alpha-value) {
  grid-column: 3;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
}

.accent-preview,
.primary-control-preview {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.accent-focus-sample,
.accent-star-sample,
.accent-link-sample,
.preview-primary-button,
.preview-today-button,
.preview-edit-tag,
.preview-filter-button,
.preview-save-button,
.preview-segment-button {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.accent-focus-sample {
  padding: 0 12px;
  color: var(--text-primary);
  background: var(--surface-control);
  border: 1px solid var(--border-focus);
  box-shadow: 0 0 0 3px var(--selection-bg);
}

.accent-star-sample {
  width: 32px;
  color: var(--color-primary);
  background: var(--surface-icon-active);
  border: 1px solid var(--border-icon-active);
}

.accent-link-sample {
  padding: 0 12px;
  color: var(--color-primary);
  background: var(--surface-neutral-faint);
  border: 1px solid var(--border-control);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.preview-primary-button,
.preview-today-button,
.preview-edit-tag,
.preview-filter-button,
.preview-save-button,
.preview-segment-button {
  padding: 0 12px;
  background: var(--action-primary-bg);
  color: var(--action-primary-text);
  border: 1px solid var(--action-primary-border);
}

.preview-save-button {
  box-shadow: var(--action-primary-shadow);
}

.preview-edit-tag {
  min-width: 44px;
}

.source-editor-block {
  padding: var(--space-4);
  border-top: 1px solid var(--border-strong);
  background: var(--surface-neutral-faint);
}

.source-editor-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.source-editor-state {
  margin-right: auto;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.source-editor-state.error {
  color: var(--status-danger-text);
}

.source-apply-btn {
  margin-left: 0;
  padding: 7px 12px;
  font-size: 12px;
}

.theme-source-textarea {
  width: 100%;
  min-height: 360px;
  max-height: 52vh;
  resize: vertical;
  border: 1px solid var(--border-control);
  border-radius: 14px;
  padding: 14px;
  background: var(--surface-panel);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.62;
  outline: none;
}

.theme-source-textarea:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--selection-bg);
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
  background: var(--nav-tab-active-bg);
  color: var(--nav-tab-active-text);
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

.btn-copy.danger {
  color: var(--color-danger-text);
}

.btn-copy:hover {
  background: var(--surface-control-hover);
  color: var(--text-body);
}

.btn-primary {
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--action-success-bg);
  color: var(--action-success-text);
  font-size: 14px;
}

.btn-primary:hover {
  opacity: 0.92;
}

.btn-secondary {
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--action-secondary-bg);
  color: var(--action-secondary-text);
  border: 1px solid var(--action-secondary-border);
  font-size: 14px;
}

.btn-secondary:hover {
  background: var(--action-secondary-bg-hover);
  color: var(--action-secondary-text);
  border-color: var(--action-secondary-border-hover);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: var(--overlay-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  z-index: 20;
}

.modal-card {
  width: min(100%, 560px);
  max-height: min(720px, calc(100dvh - 48px));
  border-radius: 24px;
  background: var(--surface-panel);
  box-shadow: var(--overlay-modal-shadow);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.modal-name-field {
  margin-top: var(--space-4);
}

.modal-textarea:focus {
  outline: none;
  border-color: var(--border-focus);
}

.modal-actions {
  margin-top: var(--space-4);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  flex-shrink: 0;
}

.import-dialog-body {
  margin-top: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.import-warnings {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.warning-list {
  margin: 0;
  padding-left: var(--space-5);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.imported-themes-list {
  margin-top: var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  overflow: hidden;
}

.imported-theme-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px var(--space-4);
  gap: var(--space-3);
}

.imported-theme-item + .imported-theme-item {
  border-top: 1px solid var(--border-strong);
}

.imported-theme-name {
  font-size: 14px;
  color: var(--text-body);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  flex-wrap: wrap;
}

.dark-badge,
.active-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
  font-weight: 600;
}

.dark-badge {
  background: var(--status-warning-bg);
  color: var(--status-warning-text);
}

.active-badge {
  background: var(--status-success-bg);
  color: var(--status-success-text);
}

.imported-theme-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.btn-theme-action,
.btn-delete-theme {
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.btn-theme-action {
  color: var(--action-primary-text);
}

.btn-delete-theme {
  color: var(--color-danger-text);
}

.btn-theme-action:hover,
.btn-delete-theme:hover {
  background: var(--surface-control-hover);
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
