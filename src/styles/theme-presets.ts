export type ThemePresetId = string
export type ThemeVariant = 'light' | 'dark'

export interface ThemePresetConfig {
  id?: string
  name?: string
  codeThemeId: string
  variant: ThemeVariant
  theme: {
    accent: string
    contrast: number
    fonts: {
      code: string
      ui: string
    }
    ink: string
    opaqueWindows: boolean
    semanticColors: {
      diffAdded: string
      diffRemoved: string
      skill: string
    }
    surface: string
  }
  articleCss?: string
  codeCss?: string
}

export const BASE_THEME_IDS = ['light', 'dark'] as const

export const themePresetMeta: Array<{ id: ThemePresetId; label: string; description: string; base?: boolean }> = [
  { id: 'light', label: 'Default Light', description: '黑白基线浅色主题' },
  { id: 'dark', label: 'Default Dark', description: '黑白基线深色主题' },
  { id: 'notion', label: 'Notion', description: '更纸感、更克制的浅色派生' },
  { id: 'claude', label: 'Claude', description: '更暖、更柔和的浅色派生' },
]

export const defaultThemeConfigs: Record<ThemePresetId, ThemePresetConfig> = {
  light: {
    id: 'light',
    name: 'Default Light',
    codeThemeId: 'github-light',
    variant: 'light',
    theme: {
      accent: '#fabb18',
      contrast: 40,
      fonts: {
        ui: 'PingFang SC, SF Pro Display, Helvetica Neue, Noto Sans SC',
        code: '"SF Mono", "JetBrains Mono", monospace',
      },
      ink: '#1a1a1a',
      opaqueWindows: true,
      semanticColors: {
        diffAdded: '#00a76f',
        diffRemoved: '#d94841',
        skill: '#fabb18',
      },
      surface: '#f5f4ed',
    },
  },
  dark: {
    id: 'dark',
    name: 'Default Dark',
    codeThemeId: 'github-dark',
    variant: 'dark',
    theme: {
      accent: '#fabb18',
      contrast: 62,
      fonts: {
        ui: 'PingFang SC, SF Pro Display, Helvetica Neue, Noto Sans SC',
        code: '"SF Mono", "JetBrains Mono", monospace',
      },
      ink: '#f5f4ed',
      opaqueWindows: true,
      semanticColors: {
        diffAdded: '#22c55e',
        diffRemoved: '#ff6b57',
        skill: '#fabb18',
      },
      surface: '#1a1a1a',
    },
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    codeThemeId: 'absolutely',
    variant: 'light',
    theme: {
      accent: '#cc7d5e',
      contrast: 40,
      fonts: {
        ui: 'PingFang SC, SF Pro Display, Helvetica Neue, Noto Sans SC',
        code: '"SF Mono", "Geist Mono", ui-monospace',
      },
      ink: '#2d2d2b',
      opaqueWindows: true,
      semanticColors: {
        diffAdded: '#00c853',
        diffRemoved: '#ff5f38',
        skill: '#cc7d5e',
      },
      surface: '#f9f9f7',
    },
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    codeThemeId: 'warm-neutral',
    variant: 'light',
    theme: {
      accent: '#c26d47',
      contrast: 52,
      fonts: {
        ui: 'PingFang SC, SF Pro Display, Helvetica Neue, Noto Sans SC',
        code: '"SF Mono", "Geist Mono", ui-monospace',
      },
      ink: '#2d2a26',
      opaqueWindows: true,
      semanticColors: {
        diffAdded: '#2f9e62',
        diffRemoved: '#d94841',
        skill: '#c26d47',
      },
      surface: '#fef9f5',
    },
  },
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isBaseThemeId(id: string) {
  return BASE_THEME_IDS.includes(id as (typeof BASE_THEME_IDS)[number])
}

export function getThemeName(id: string, config?: ThemePresetConfig) {
  return config?.name || themePresetMeta.find((preset) => preset.id === id)?.label || id
}

export function slugifyThemeName(name: string, existingIds: string[] = []) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'theme'

  let next = base
  let counter = 2
  while (existingIds.includes(next)) {
    next = `${base}-${counter}`
    counter += 1
  }
  return next
}

export function normalizeThemeConfig(id: string, raw: unknown, fallback: ThemePresetConfig = defaultThemeConfigs.light): ThemePresetConfig {
  const candidate = isObject(raw) ? raw : {}
  const theme = isObject(candidate.theme) ? candidate.theme : (isObject(candidate.app) ? candidate.app : {})
  const fonts = isObject(theme.fonts) ? theme.fonts : {}
  const semanticColors = isObject(theme.semanticColors) ? theme.semanticColors : {}

  return {
    id,
    name: typeof candidate.name === 'string' ? candidate.name : getThemeName(id, fallback),
    codeThemeId: typeof candidate.codeThemeId === 'string' ? candidate.codeThemeId : fallback.codeThemeId,
    variant: candidate.variant === 'dark' ? 'dark' : 'light',
    theme: {
      accent: typeof theme.accent === 'string' ? theme.accent : fallback.theme.accent,
      contrast: typeof theme.contrast === 'number' ? theme.contrast : fallback.theme.contrast,
      fonts: {
        ui: typeof fonts.ui === 'string' ? fonts.ui : fallback.theme.fonts.ui,
        code: typeof fonts.code === 'string' ? fonts.code : fallback.theme.fonts.code,
      },
      ink: typeof theme.ink === 'string' ? theme.ink : fallback.theme.ink,
      opaqueWindows: typeof theme.opaqueWindows === 'boolean' ? theme.opaqueWindows : fallback.theme.opaqueWindows,
      semanticColors: {
        diffAdded: typeof semanticColors.diffAdded === 'string' ? semanticColors.diffAdded : fallback.theme.semanticColors.diffAdded,
        diffRemoved: typeof semanticColors.diffRemoved === 'string' ? semanticColors.diffRemoved : fallback.theme.semanticColors.diffRemoved,
        skill: typeof semanticColors.skill === 'string' ? semanticColors.skill : fallback.theme.semanticColors.skill,
      },
      surface: typeof theme.surface === 'string' ? theme.surface : fallback.theme.surface,
    },
    articleCss: typeof candidate.articleCss === 'string' ? candidate.articleCss : fallback.articleCss,
    codeCss: typeof candidate.codeCss === 'string' ? candidate.codeCss : fallback.codeCss,
  }
}

export function normalizeThemeConfigs(raw: unknown): Record<ThemePresetId, ThemePresetConfig> {
  const source = isObject(raw) ? raw : {}
  const next: Record<ThemePresetId, ThemePresetConfig> = {}

  for (const [id, config] of Object.entries(defaultThemeConfigs)) {
    next[id] = normalizeThemeConfig(id, source[id] || config, config)
  }

  for (const [id, config] of Object.entries(source)) {
    if (next[id]) continue
    next[id] = normalizeThemeConfig(id, config, defaultThemeConfigs.light)
  }

  return next
}

export function listThemeOptions(configs: Record<string, ThemePresetConfig>) {
  return Object.entries(configs).map(([id, config]) => ({
    id,
    label: getThemeName(id, config),
    base: isBaseThemeId(id),
    variant: config.variant,
  }))
}

export function exportThemeConfig(config: ThemePresetConfig) {
  const file = {
    name: config.name,
    variant: config.variant,
    codeThemeId: config.codeThemeId,
    app: config.theme,
    articleCss: config.articleCss || '',
    codeCss: config.codeCss || '',
  }

  return [
    '/* ai-inbox theme v1',
    '   app: App 样式',
    '   articleCss: 文章正文样式',
    '   codeCss: 代码区样式',
    '   可以直接修改下面 JSON；缺失字段会按 light 主题补齐，多余字段导入时会提示。',
    '*/',
    JSON.stringify(file, null, 2),
  ].join('\n')
}
