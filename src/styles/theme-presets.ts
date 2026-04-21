export type ThemePresetId = 'light' | 'dark' | 'notion' | 'claude'
export type ThemeVariant = 'light' | 'dark'

export interface ThemePresetConfig {
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
}

export const themePresetMeta: Array<{ id: ThemePresetId; label: string; description: string }> = [
  { id: 'light', label: 'Default Light', description: '黑白基线浅色主题' },
  { id: 'dark', label: 'Default Dark', description: '黑白基线深色主题' },
  { id: 'notion', label: 'Notion', description: '更纸感、更克制的浅色派生' },
  { id: 'claude', label: 'Claude', description: '更暖、更柔和的浅色派生' },
]

export const defaultThemeConfigs: Record<ThemePresetId, ThemePresetConfig> = {
  light: {
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

export function normalizeThemeConfigs(raw: unknown): Record<ThemePresetId, ThemePresetConfig> {
  const source = isObject(raw) ? raw : {}
  const next = { ...defaultThemeConfigs }

  for (const preset of themePresetMeta) {
    const candidate = source[preset.id]
    if (!isObject(candidate) || !isObject(candidate.theme)) continue

    const theme = candidate.theme
    next[preset.id] = {
      codeThemeId: typeof candidate.codeThemeId === 'string' ? candidate.codeThemeId : defaultThemeConfigs[preset.id].codeThemeId,
      variant: candidate.variant === 'dark' ? 'dark' : 'light',
      theme: {
        accent: typeof theme.accent === 'string' ? theme.accent : defaultThemeConfigs[preset.id].theme.accent,
        contrast: typeof theme.contrast === 'number' ? theme.contrast : defaultThemeConfigs[preset.id].theme.contrast,
        fonts: {
          ui: isObject(theme.fonts) && typeof theme.fonts.ui === 'string' ? theme.fonts.ui : defaultThemeConfigs[preset.id].theme.fonts.ui,
          code: isObject(theme.fonts) && typeof theme.fonts.code === 'string' ? theme.fonts.code : defaultThemeConfigs[preset.id].theme.fonts.code,
        },
        ink: typeof theme.ink === 'string' ? theme.ink : defaultThemeConfigs[preset.id].theme.ink,
        opaqueWindows: typeof theme.opaqueWindows === 'boolean' ? theme.opaqueWindows : defaultThemeConfigs[preset.id].theme.opaqueWindows,
        semanticColors: {
          diffAdded:
            isObject(theme.semanticColors) && typeof theme.semanticColors.diffAdded === 'string'
              ? theme.semanticColors.diffAdded
              : defaultThemeConfigs[preset.id].theme.semanticColors.diffAdded,
          diffRemoved:
            isObject(theme.semanticColors) && typeof theme.semanticColors.diffRemoved === 'string'
              ? theme.semanticColors.diffRemoved
              : defaultThemeConfigs[preset.id].theme.semanticColors.diffRemoved,
          skill:
            isObject(theme.semanticColors) && typeof theme.semanticColors.skill === 'string'
              ? theme.semanticColors.skill
              : defaultThemeConfigs[preset.id].theme.semanticColors.skill,
        },
        surface: typeof theme.surface === 'string' ? theme.surface : defaultThemeConfigs[preset.id].theme.surface,
      },
    }
  }

  return next
}
