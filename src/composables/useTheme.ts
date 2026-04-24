import { ref } from 'vue'
import type { Ref } from 'vue'
import { defaultThemeConfigs, normalizeThemeConfigs, type ThemePresetConfig, type ThemePresetId } from '../styles/theme-presets'

const currentTheme: Ref<string> = ref('light')
const ACTIVE_THEME_STYLE_ID = 'ai-inbox-active-theme-style'

const overrideKeys = [
  '--bg-primary',
  '--bg-secondary',
  '--bg-sidebar',
  '--page-bg',
  '--fg-primary',
  '--page-fg',
  '--text-primary',
  '--text-secondary',
  '--text-placeholder',
  '--text-muted',
  '--text-body',
  '--text-accent',
  '--color-primary',
  '--color-primary-hover',
  '--color-primary-pressed',
  '--color-link',
  '--btn-primary-bg',
  '--btn-primary-hover',
  '--btn-primary-pressed',
  '--border-focus',
  '--font-display',
  '--font-body',
  '--font-editor',
  '--font-mono',
  '--surface-panel',
  '--surface-panel-soft',
  '--surface-control',
  '--surface-control-hover',
  '--surface-accent-soft',
  '--surface-accent-soft-hover',
  '--border-strong',
  '--border-control',
  '--border-control-hover',
  '--border-accent-soft',
  '--separator-soft',
  '--surface-neutral-soft',
  '--surface-neutral-faint',
  '--surface-code-block',
  '--surface-empty',
  '--color-success',
  '--color-error',
]

function resolveTheme(settings: Record<string, any> | undefined | null) {
  const lightTheme = settings?.lightTheme || 'light'
  const darkTheme = settings?.darkTheme || 'dark'
  const themeMode = settings?.themeMode || 'light'

  if (themeMode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? darkTheme : lightTheme
  }

  if (themeMode === 'dark') {
    return darkTheme
  }

  return lightTheme
}

function hexToRgb(hex: string) {
  const sanitized = hex.trim().replace('#', '')
  const value = sanitized.length === 3
    ? sanitized.split('').map((char) => `${char}${char}`).join('')
    : sanitized
  const parsed = Number.parseInt(value, 16)
  if (Number.isNaN(parsed) || value.length !== 6) return null
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`
}

function mix(hex: string, target: string, ratio: number) {
  const from = hexToRgb(hex)
  const to = hexToRgb(target)
  if (!from || !to) return hex
  return rgbToHex(
    from.r + (to.r - from.r) * ratio,
    from.g + (to.g - from.g) * ratio,
    from.b + (to.b - from.b) * ratio,
  )
}

function withAlpha(hex: string, alpha: number) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function applyPresetOverrides(config: ThemePresetConfig) {
  const root = document.documentElement
  for (const key of overrideKeys) {
    root.style.removeProperty(key)
  }

  const accent = config.theme.accent
  const surface = config.theme.surface
  const ink = config.theme.ink
  const dark = config.variant === 'dark'
  const contrastStrength = Math.max(0, Math.min(100, config.theme.contrast)) / 100
  const hoverAccent = dark ? mix(accent, '#ffffff', 0.16) : mix(accent, '#ffffff', 0.1)
  const pressedAccent = dark ? mix(accent, '#000000', 0.14) : mix(accent, '#000000', 0.12)
  const secondarySurface = dark ? mix(surface, '#ffffff', 0.06) : mix(surface, '#ffffff', 0.28)
  const sidebarSurface = dark ? mix(surface, '#ffffff', 0.03) : mix(surface, '#000000', 0.02)
  const panelAlpha = config.theme.opaqueWindows ? (dark ? 0.92 : 0.9) : (dark ? 0.76 : 0.8)
  const controlAlpha = config.theme.opaqueWindows ? (dark ? 0.82 : 0.86) : (dark ? 0.72 : 0.76)
  const borderBase = dark ? withAlpha('#ffffff', 0.08 + contrastStrength * 0.1) : withAlpha(ink, 0.08 + contrastStrength * 0.08)
  const borderHover = dark ? withAlpha('#ffffff', 0.16 + contrastStrength * 0.08) : withAlpha(ink, 0.14 + contrastStrength * 0.08)

  root.style.setProperty('--bg-primary', surface)
  root.style.setProperty('--bg-secondary', secondarySurface)
  root.style.setProperty('--bg-sidebar', sidebarSurface)
  root.style.setProperty('--page-bg', surface)
  root.style.setProperty('--fg-primary', ink)
  root.style.setProperty('--page-fg', ink)
  root.style.setProperty('--text-primary', ink)
  root.style.setProperty('--text-secondary', withAlpha(ink, dark ? 0.7 : 0.62))
  root.style.setProperty('--text-placeholder', withAlpha(ink, dark ? 0.34 : 0.34))
  root.style.setProperty('--text-muted', withAlpha(ink, dark ? 0.58 : 0.58))
  root.style.setProperty('--text-body', dark ? withAlpha('#f5f4ed', 0.88) : mix(ink, '#333639', 0.16))
  root.style.setProperty('--text-accent', config.theme.semanticColors.skill)
  root.style.setProperty('--color-primary', accent)
  root.style.setProperty('--color-primary-hover', hoverAccent)
  root.style.setProperty('--color-primary-pressed', pressedAccent)
  root.style.setProperty('--color-link', accent)
  root.style.setProperty('--btn-primary-bg', accent)
  root.style.setProperty('--btn-primary-hover', hoverAccent)
  root.style.setProperty('--btn-primary-pressed', pressedAccent)
  root.style.setProperty('--border-focus', accent)
  root.style.setProperty('--font-display', config.theme.fonts.ui)
  root.style.setProperty('--font-body', config.theme.fonts.ui)
  root.style.setProperty('--font-editor', config.theme.fonts.ui)
  root.style.setProperty('--font-mono', config.theme.fonts.code)
  root.style.setProperty('--surface-panel', withAlpha(dark ? '#242424' : '#ffffff', panelAlpha))
  root.style.setProperty('--surface-panel-soft', withAlpha(dark ? '#2d2d2d' : '#ffffff', panelAlpha - 0.08))
  root.style.setProperty('--surface-control', withAlpha(dark ? '#2d2d2d' : '#ffffff', controlAlpha))
  root.style.setProperty('--surface-control-hover', withAlpha(dark ? '#383838' : '#ffffff', Math.min(controlAlpha + 0.12, 0.96)))
  root.style.setProperty('--surface-accent-soft', withAlpha(accent, dark ? 0.18 : 0.16))
  root.style.setProperty('--surface-accent-soft-hover', withAlpha(accent, dark ? 0.24 : 0.22))
  root.style.setProperty('--border-strong', borderBase)
  root.style.setProperty('--border-control', borderBase)
  root.style.setProperty('--border-control-hover', borderHover)
  root.style.setProperty('--border-accent-soft', withAlpha(accent, dark ? 0.32 : 0.24))
  root.style.setProperty('--separator-soft', withAlpha(ink, dark ? 0.22 : 0.18))
  root.style.setProperty('--surface-neutral-soft', withAlpha(ink, dark ? 0.05 : 0.04))
  root.style.setProperty('--surface-neutral-faint', withAlpha(ink, dark ? 0.04 : 0.03))
  root.style.setProperty('--surface-code-block', withAlpha(ink, dark ? 0.07 : 0.04))
  root.style.setProperty('--surface-empty', withAlpha(dark ? '#242424' : '#ffffff', dark ? 0.5 : 0.48))
  root.style.setProperty('--color-success', config.theme.semanticColors.diffAdded)
  root.style.setProperty('--color-error', config.theme.semanticColors.diffRemoved)
}

function injectThemeCss(themeId: string, config: ThemePresetConfig) {
  const existing = document.getElementById(ACTIVE_THEME_STYLE_ID)
  if (existing) existing.remove()

  const css = [
    config.articleCss ? `/* 文章正文样式 */\n${config.articleCss}` : '',
    config.codeCss ? `/* 代码区样式 */\n${config.codeCss}` : '',
  ].filter(Boolean).join('\n\n')

  if (!css.trim()) return

  const style = document.createElement('style')
  style.id = ACTIVE_THEME_STYLE_ID
  style.setAttribute('data-theme-id', themeId)
  style.textContent = css
  document.head.appendChild(style)
}

export function useTheme() {
  const setTheme = async (theme: string, settings?: Record<string, any> | null) => {
    currentTheme.value = theme
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-ai-theme', theme)

    const configs = normalizeThemeConfigs(settings?.customThemes)
    const preset = (theme in configs ? theme : 'light') as ThemePresetId
    const config = configs[preset] || defaultThemeConfigs.light
    applyPresetOverrides(config)
    injectThemeCss(preset, config)
  }

  const applyThemeFromSettings = async (settings: Record<string, any> | undefined | null) => {
    await setTheme(resolveTheme(settings), settings || undefined)
  }

  const initTheme = async () => {
    try {
      const settings = await window.electronAPI?.getSettings()
      await applyThemeFromSettings(settings)
    } catch (e) {
      console.error('[Theme] Error loading theme:', e)
      await setTheme('light', { customThemes: defaultThemeConfigs })
    }
  }

  return {
    currentTheme,
    setTheme,
    applyThemeFromSettings,
    initTheme,
  }
}
