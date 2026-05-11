import { ref } from 'vue'
import type { Ref } from 'vue'
import { defaultThemeConfigs, normalizeThemeConfigs, type ThemePresetConfig, type ThemePresetId } from '../styles/theme-presets'

const currentTheme: Ref<string> = ref('light')
const ACTIVE_THEME_STYLE_ID = 'ai-inbox-active-theme-style'

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

function setVars(vars: Record<string, string>) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

function applyPresetOverrides(config: ThemePresetConfig) {
  const { tokens } = config
  const { system, fonts, radius, app, editorChrome, article, code, blocks } = tokens
  const primary = app.actions.primary
  const secondary = app.actions.secondary
  const icon = app.actions.icon
  const iconActive = app.actions.iconActive

  setVars({
    // Core / legacy app variables kept as aliases for existing surfaces.
    '--bg-primary': app.surfaces.page,
    '--bg-secondary': app.surfaces.pageSubtle,
    '--bg-sidebar': app.surfaces.sidebar,
    '--bg-card': app.surfaces.card,
    '--bg-modal': app.surfaces.modal,
    '--bg-embedded': app.surfaces.input,
    '--bg-tertiary': app.surfaces.control,
    '--bg-input': app.surfaces.input,
    '--bg-input-focus': app.surfaces.inputFocus,
    '--page-bg': app.surfaces.page,
    '--page-fg': app.text.primary,
    '--fg-primary': app.text.primary,
    '--text-primary': app.text.primary,
    '--text-secondary': app.text.muted,
    '--text-muted': app.text.muted,
    '--text-tertiary': app.text.subtle,
    '--text-placeholder': app.text.placeholder,
    '--text-body': app.text.body,
    '--text-inverse': app.text.inverse,
    '--text-accent': app.text.accent,
    '--text-link': app.text.link,
    '--color-primary': system.accent,
    '--color-primary-hover': primary.bgHover,
    '--color-primary-pressed': primary.bgPressed,
    '--color-link': app.text.link,
    '--color-link-bg': app.status.infoBg,
    '--color-success': system.success,
    '--color-success-text': system.successText,
    '--color-error': system.danger,
    '--color-danger-text': system.dangerText,
    '--color-warning': system.warning,
    '--color-warning-text': system.warningText,
    '--color-info': system.info,
    '--color-info-text': system.infoText,
    '--border-default': app.border.default,
    '--border-subtle': app.border.subtle,
    '--border-color': app.border.default,
    '--border-color-light': app.border.subtle,
    '--border-strong': app.border.strong,
    '--border-control': app.border.control,
    '--border-control-hover': app.border.controlHover,
    '--border-control-strong': app.border.controlStrong,
    '--border-focus': system.accent,
    '--border-color-focus': system.accent,
    '--border-accent-soft': app.border.accent,
    '--separator-soft': app.navigation.separator,
    '--divider': app.border.divider,
    '--font-display': fonts.heading,
    '--font-body': fonts.ui,
    '--font-editor': fonts.body,
    '--font-mono': fonts.code,
    '--font-heading-alt': fonts.heading,
    '--radius-sm': radius.sm,
    '--radius-md': radius.md,
    '--radius-lg': radius.lg,
    '--radius-xl': radius.xl,
    '--radius-pill': radius.pill,
    '--surface-panel': app.surfaces.panel,
    '--surface-panel-soft': app.surfaces.panelSoft,
    '--surface-control': app.surfaces.control,
    '--surface-control-hover': app.surfaces.controlHover,
    '--surface-neutral-soft': app.actions.subtle.bg,
    '--surface-neutral-faint': app.status.neutralBg,
    '--surface-accent-soft': primary.bg,
    '--surface-accent-soft-hover': primary.bgHover,
    '--surface-accent-subtle': app.navigation.chipBg,
    '--surface-accent-faint': app.navigation.tabActiveBg,
    '--surface-empty': app.surfaces.empty,
    '--surface-code-block': app.surfaces.codePreview,
    '--surface-collected': app.cards.collectedBg,
    '--surface-deleted': app.cards.deletedBg,
    '--surface-image': app.cards.imageBg,
    '--border-neutral-soft': app.border.default,
    '--border-neutral-strong': app.border.divider,
    '--border-empty': app.border.empty,
    '--border-collected': app.cards.collectedBorder,
    '--border-deleted': app.cards.deletedBorder,
    '--border-icon-active': iconActive.border,
    '--surface-icon-active': iconActive.bg,
    '--surface-segmented': app.navigation.segmentedBg,
    '--border-segmented': app.navigation.segmentedBorder,
    '--overlay-page-fade': app.overlay.fade,
    '--shadow-panel': app.shadow.panel,
    '--shadow-card': app.shadow.card,
    '--shadow-button': app.shadow.button,
    '--shadow-popover': app.shadow.popover,
    '--shadow-segmented': app.navigation.segmentedShadow,
    '--shadow-card-hover-soft': app.cards.itemHoverShadow,
    '--shadow-collected': app.cards.collectedShadow,
    '--shadow-deleted-hover': app.cards.deletedHoverShadow,
    '--shadow-accent-soft-hover': primary.shadow || app.shadow.button,
    '--ui-shadow-panel': app.shadow.panel,
    '--ui-shadow-card': app.shadow.card,
    '--ui-shadow-card-hover': app.cards.itemHoverShadow,
    '--ui-surface-panel': app.surfaces.panel,
    '--ui-surface-panel-strong': app.surfaces.card,
    '--ui-surface-control': app.surfaces.control,

    // Action tokens.
    '--action-primary-bg': primary.bg,
    '--action-primary-bg-hover': primary.bgHover,
    '--action-primary-bg-pressed': primary.bgPressed,
    '--action-primary-text': primary.text,
    '--action-primary-border': primary.border,
    '--action-primary-border-hover': primary.borderHover,
    '--action-primary-shadow': primary.shadow || app.shadow.button,
    '--action-secondary-bg': secondary.bg,
    '--action-secondary-bg-hover': secondary.bgHover,
    '--action-secondary-bg-pressed': secondary.bgPressed,
    '--action-secondary-text': secondary.text,
    '--action-secondary-border': secondary.border,
    '--action-secondary-border-hover': secondary.borderHover,
    '--action-icon-bg': icon.bg,
    '--action-icon-bg-hover': icon.bgHover,
    '--action-icon-bg-pressed': icon.bgPressed,
    '--action-icon-text': icon.text,
    '--action-icon-border': icon.border,
    '--action-icon-border-hover': icon.borderHover,
    '--action-icon-active-bg': iconActive.bg,
    '--action-icon-active-text': iconActive.text,
    '--action-icon-active-border': iconActive.border,
    '--action-danger-bg': app.actions.danger.bg,
    '--action-danger-bg-hover': app.actions.danger.bgHover,
    '--action-danger-text': app.actions.danger.text,
    '--action-danger-border': app.actions.danger.border,
    '--action-warning-bg': app.actions.warning.bg,
    '--action-warning-bg-hover': app.actions.warning.bgHover,
    '--action-warning-text': app.actions.warning.text,
    '--action-warning-border': app.actions.warning.border,
    '--action-success-bg': app.actions.success.bg,
    '--action-success-bg-hover': app.actions.success.bgHover,
    '--action-success-text': app.actions.success.text,
    '--action-success-border': app.actions.success.border,

    // Component-domain app tokens.
    '--nav-tab-text': app.navigation.tabText,
    '--nav-tab-hover-text': app.navigation.tabHoverText,
    '--nav-tab-active-bg': primary.bg,
    '--nav-tab-active-text': primary.text,
    '--nav-chip-bg': app.navigation.chipBg,
    '--nav-chip-text': app.navigation.chipText,
    '--nav-chip-label': app.navigation.chipLabel,
    '--nav-chip-border': app.navigation.chipBorder,
    '--nav-chip-subtle-bg': app.navigation.chipSubtleBg,
    '--calendar-control-bg': app.calendar.controlBg,
    '--calendar-control-hover-bg': app.calendar.controlHoverBg,
    '--calendar-control-text': app.calendar.controlText,
    '--calendar-today-bg': primary.bg,
    '--calendar-today-text': primary.text,
    '--calendar-today-border': primary.border,
    '--calendar-cell-text': app.calendar.cellText,
    '--calendar-cell-muted-opacity': app.calendar.cellMutedOpacity,
    '--calendar-cell-hover-bg': app.calendar.cellHoverBg,
    '--calendar-cell-selected-bg': `color-mix(in srgb, ${system.accent} 78%, transparent)`,
    '--calendar-cell-selected-text': '#ffffff',
    '--calendar-cell-selected-border': primary.border,
    '--calendar-cell-today-text': system.accent,
    '--calendar-item-dot': app.calendar.itemDot,
    '--card-item-bg': app.cards.itemBg,
    '--card-item-border': app.cards.itemBorder,
    '--status-success-bg': app.status.successBg,
    '--status-success-text': app.status.successText,
    '--status-warning-bg': app.status.warningBg,
    '--status-warning-text': app.status.warningText,
    '--status-danger-bg': app.status.dangerBg,
    '--status-danger-text': app.status.dangerText,
    '--status-info-bg': app.status.infoBg,
    '--status-info-text': app.status.infoText,
    '--status-neutral-bg': app.status.neutralBg,
    '--status-neutral-text': app.status.neutralText,
    '--overlay-mask': app.overlay.mask,
    '--overlay-modal-shadow': app.overlay.modalShadow,
    '--app-header-bg': app.header.bg,
    '--app-header-border': app.header.border,
    '--app-sidebar-bg': app.surfaces.sidebar,
    '--app-sidebar-border': app.border.default,
    '--app-sidebar-border-subtle': app.border.divider,
    '--app-sidebar-hover-bg': app.actions.ghost.bgHover,
    '--app-sidebar-active-bg': app.navigation.tabActiveBg,
    '--app-sidebar-active-text': app.navigation.tabActiveText,
    '--app-sidebar-action-hover-bg': app.actions.icon.bgHover,
    '--app-sidebar-footer-bg': app.surfaces.sidebar,
    '--app-sidebar-tree-fade-bg': app.surfaces.sidebar,

    // Editor chrome tokens.
    '--editor-border': editorChrome.border,
    '--editor-border-strong': editorChrome.borderStrong,
    '--editor-focus-border': editorChrome.focusBorder,
    '--editor-focus-ring': editorChrome.focusRing,
    '--editor-shadow': editorChrome.shadow,
    '--editor-bg': editorChrome.shellBg,
    '--editor-content-bg': editorChrome.contentBg,
    '--editor-toolbar-bg': editorChrome.toolbarBg,
    '--editor-toolbar-border': editorChrome.toolbarBorder,
    '--editor-toolbar-hover-bg': editorChrome.toolbarHoverBg,
    '--editor-toolbar-active-bg': editorChrome.toolbarActiveBg,
    '--editor-toolbar-active-strong-bg': editorChrome.toolbarActiveStrongBg,
    '--editor-toolbar-icon': editorChrome.toolbarIcon,
    '--editor-toolbar-icon-hover': editorChrome.toolbarIconHover,
    '--editor-toolbar-active-icon': editorChrome.toolbarIconActive,
    '--editor-popover-bg': editorChrome.popoverBg,
    '--editor-popover-border': editorChrome.popoverBorder,
    '--editor-popover-shadow': editorChrome.popoverShadow,
    '--editor-popover-item-hover': editorChrome.popoverItemHover,
    '--editor-popover-item-active': editorChrome.popoverItemActive,
    '--editor-popover-icon': editorChrome.popoverIcon,
    '--editor-popover-icon-hover': editorChrome.popoverIconHover,
    '--editor-popover-icon-active': editorChrome.popoverIconActive,
    '--editor-popover-input-color': editorChrome.popoverInputColor,
    '--editor-popover-input-placeholder': editorChrome.popoverInputPlaceholder,
    '--editor-popover-subtle-bg': editorChrome.popoverSubtleBg,
    '--editor-popover-subtle-border': editorChrome.popoverSubtleBorder,
    '--editor-popover-label': editorChrome.popoverLabel,
    '--editor-frontmatter-bg': editorChrome.frontmatterBg,
    '--editor-frontmatter-hover-bg': editorChrome.frontmatterHoverBg,
    '--editor-frontmatter-body-bg': editorChrome.frontmatterBodyBg,
    '--editor-frontmatter-border': editorChrome.frontmatterBorder,
    '--editor-frontmatter-shadow': editorChrome.frontmatterShadow,
    '--editor-table-header-bg': blocks.tableHeaderBg,
    '--editor-table-cell-bg': blocks.tableCellBg,
    '--editor-heading': article.heading,
    '--editor-text': article.text,
    '--editor-text-muted': article.textMuted,
    '--editor-placeholder': article.placeholder,
    '--editor-link-color': article.link,
    '--editor-blockquote-border': blocks.blockquoteBorder,
    '--editor-blockquote-text': blocks.blockquoteText,
    '--editor-hr-border': blocks.hr,
    '--editor-code-bg': code.blockBg,
    '--editor-inline-code-bg': code.inlineBg,
    '--editor-inline-code-color': code.inlineText,
    '--editor-table-border': blocks.tableBorder,

    // Article typography tokens.
    '--typography-bg': article.bg,
    '--typography-text': article.text,
    '--typography-muted': article.textMuted,
    '--typography-heading': article.heading,
    '--typography-placeholder': article.placeholder,
    '--typography-link': article.link,
    '--typography-measure': article.measure,
    '--typography-font-body': fonts.body,
    '--typography-font-heading': fonts.heading,
    '--typography-font-code': fonts.code,
    '--typography-font-size': article.fontSize,
    '--typography-line-height': article.lineHeight,
    '--typography-letter-spacing': article.letterSpacing,
    '--typography-paragraph-spacing': article.paragraphSpacing,
    '--typography-h1-size': article.h1Size,
    '--typography-h2-size': article.h2Size,
    '--typography-h3-size': article.h3Size,
    '--typography-h1-align': article.h1Align,
    '--typography-h1-weight': article.h1Weight,
    '--typography-h2-weight': article.h2Weight,
    '--typography-h3-weight': article.h3Weight,
    '--typography-inline-code-bg': code.inlineBg,
    '--typography-inline-code-color': code.inlineText,
    '--typography-code-block-bg': code.blockBg,
    '--typography-code-block-color': code.blockText,
    '--typography-code-block-border': code.blockBorder,
    '--typography-code-font-size': code.fontSize,
    '--typography-code-line-height': code.lineHeight,
    '--typography-blockquote-bg': blocks.blockquoteBg,
    '--typography-blockquote-text': blocks.blockquoteText,
    '--typography-blockquote-border': blocks.blockquoteBorder,
    '--typography-table-border': blocks.tableBorder,
    '--typography-table-header-bg': blocks.tableHeaderBg,
    '--typography-table-cell-bg': blocks.tableCellBg,
    '--typography-hr': blocks.hr,
    '--typography-image-radius': blocks.imageRadius,
    '--selection-bg': system.selectionBg,
    '--selection-text': system.selectionText,
  })
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
