import {
  defaultThemeConfigs,
  normalizeThemeConfig,
  slugifyThemeName,
  type ThemePresetConfig,
  type ThemePresetTokens,
} from '../styles/theme-presets'

type PlainObject = Record<string, unknown>

interface RgbColor {
  r: number
  g: number
  b: number
}

export interface DesignMdConvertResult {
  id: string
  config: ThemePresetConfig
  warnings: string[]
}

function isObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneTheme<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function stripQuotes(value: string) {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseYamlScalar(value: string): unknown {
  const trimmed = stripQuotes(value)
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return trimmed
}

function parseYamlSubset(source: string): PlainObject {
  const root: PlainObject = {}
  const stack: Array<{ indent: number; value: PlainObject }> = [{ indent: -1, value: root }]
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue
    const indent = rawLine.match(/^\s*/)?.[0].length || 0
    const line = rawLine.trim()
    const colonIndex = line.indexOf(':')
    if (colonIndex <= 0) continue

    const key = line.slice(0, colonIndex).trim()
    const rawValue = line.slice(colonIndex + 1).trim()
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop()
    }
    const parent = stack[stack.length - 1].value

    if (!rawValue) {
      const child: PlainObject = {}
      parent[key] = child
      stack.push({ indent, value: child })
      continue
    }

    parent[key] = parseYamlScalar(rawValue)
  }

  return root
}

function extractFrontmatter(rawText: string) {
  const normalized = rawText.trim()
  if (!normalized.startsWith('---')) return { frontmatter: null, body: rawText }
  const end = normalized.indexOf('\n---', 3)
  if (end < 0) return { frontmatter: null, body: rawText }
  return {
    frontmatter: parseYamlSubset(normalized.slice(3, end)),
    body: normalized.slice(end + 4).trim(),
  }
}

function parseRgb(value: string): RgbColor | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (hex) {
    let cleaned = hex[1]
    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map((part) => `${part}${part}`).join('')
    }
    const parsed = Number.parseInt(cleaned.slice(0, 6), 16)
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    }
  }

  const rgb = value.trim().match(/^rgba?\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)/i)
  if (!rgb) return null
  return {
    r: Number(rgb[1]),
    g: Number(rgb[2]),
    b: Number(rgb[3]),
  }
}

function toHex(color: RgbColor) {
  const channel = (value: number) => Math.min(255, Math.max(0, Math.round(value))).toString(16).padStart(2, '0')
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`
}

function mixColor(color: string, target: string, amount: number) {
  const from = parseRgb(color)
  const to = parseRgb(target)
  if (!from || !to) return color
  return toHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  })
}

function alphaColor(color: string, alpha: number) {
  const rgb = parseRgb(color)
  if (!rgb) return color
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`
}

function brightness(value: string) {
  const rgb = parseRgb(value)
  if (!rgb) return 1
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
}

function readableTextOn(color: string) {
  return brightness(color) > 0.58 ? '#171717' : '#ffffff'
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim()
}

function getPath(source: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => (
    isObject(current) ? current[key] : undefined
  ), source)
}

function resolveReference(value: unknown, source: PlainObject): string | undefined {
  if (typeof value !== 'string') return undefined
  const match = value.match(/^\{(.+)\}$/)
  if (!match) return value
  const resolved = getPath(source, match[1])
  return typeof resolved === 'string' ? resolved : undefined
}

interface MarkdownColorEntry {
  label: string
  section: string
  color: string
  description: string
  index: number
}

interface MarkdownThemeHints {
  colors: PlainObject
  typography: PlainObject | null
  radius: PlainObject | null
  components: PlainObject
}

function extractThemeName(body: string) {
  const match = body.match(/^#\s+(?:Design System Inspired by\s+)?(.+?)(?:\s+Inspired Design System|\s+Design System)?\s*$/im)
  return match?.[1]?.trim()
}

function extractColorSection(body: string) {
  return body.match(/##\s+(?:2\.\s+)?(?:Color Palette & Roles|Color Palette|Colors)[\s\S]*?(?=\n##\s+\d|$)/i)?.[0] || body
}

function collectMarkdownColorEntries(body: string): MarkdownColorEntry[] {
  const section = extractColorSection(body)
  const entries: MarkdownColorEntry[] = []
  let currentSection = ''
  let index = 0

  for (const rawLine of section.split('\n')) {
    const heading = rawLine.match(/^###\s+(.+)$/)
    if (heading) {
      currentSection = heading[1].trim()
      continue
    }

    const line = rawLine.trim()
    if (!line.startsWith('-')) continue

    const bold = line.match(/^-\s+\*\*([^*]+)\*\*[\s:：-]*(.*)$/)
    const plain = line.match(/^-\s+([^:`（(]+)[\s:：-]+(.*)$/)
    const label = (bold?.[1] || plain?.[1] || '').trim()
    const rest = (bold?.[2] || plain?.[2] || line).trim()
    if (!label) continue

    const colors = Array.from(rest.matchAll(/`((?:#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)))`|((?:#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)))/gi))
      .map((match) => (match[1] || match[2] || '').trim())
      .filter((color) => parseRgb(color))
    if (colors.length === 0) continue

    entries.push({
      label,
      section: currentSection,
      color: colors[0],
      description: rest,
      index,
    })
    index += 1
  }

  return entries
}

function scoreEntry(entry: MarkdownColorEntry, role: string, darkNative: boolean) {
  const label = entry.label.toLowerCase()
  const section = entry.section.toLowerCase()
  const description = entry.description.toLowerCase()
  const text = `${label} ${section} ${description}`
  let score = 0

  if (role === 'accent') {
    if (/brand|accent|cta|interactive|link/.test(section)) score += 16
    if (/primary|brand|accent|blue|coral|terracotta|indigo|violet|green/.test(label)) score += 12
    if (/cta|interactive|button|link|active state|selected/.test(description)) score += 8
    if (/text|black|white|background|surface|border|shadow|disabled|muted/.test(label)) score -= 18
    if (/active|pressed|hover|disabled|secondary/.test(label)) score -= 14
    if (/primary text/.test(text)) score -= 30
  }

  if (role === 'page') {
    if (/background|surface|primary/.test(section)) score += 12
    if (/canvas|page|background|marketing black|pure white|light background/.test(label)) score += 14
    if (/default page|page background|body floor|canvas|deepest background|marketing background/.test(description)) score += 10
    if (darkNative && /light mode|light background|pure white/.test(text)) score -= 24
    if (/text|border|accent|shadow|button/.test(section)) score -= 10
  }

  if (role === 'surface') {
    if (/background|surface|primary|warm neutral/.test(section)) score += 10
    if (/panel|surface|card|level 3|warm white|pure white|secondary surface/.test(label)) score += 12
    if (/card|panel|surface|elevated|dropdown|sidebar/.test(description)) score += 9
    if (darkNative && /light mode|light background/.test(text)) score -= 20
    if (/text|accent|border|shadow/.test(section)) score -= 8
  }

  if (role === 'text') {
    if (/text|content|primary/.test(section)) score += 14
    if (/primary text|ink|black|notion black|body strong/.test(label)) score += 15
    if (/primary text|headings|body copy|default text|all headlines/.test(description)) score += 10
    if (/accent|blue|pink|green|orange|purple|border|background|surface|shadow/.test(section)) score -= 10
    if (/accent|decorative|warning|success|link|background|surface|border/.test(label)) score -= 16
  }

  if (role === 'body') {
    if (/text|content/.test(section)) score += 14
    if (/secondary text|body|body strong|default running|description/.test(label)) score += 12
    if (/body text|descriptions|secondary content|running-text/.test(description)) score += 9
    if (/accent|border|background|surface|shadow/.test(section)) score -= 10
  }

  if (role === 'muted') {
    if (/text|content/.test(section)) score += 14
    if (/tertiary|muted|caption|placeholder|quaternary/.test(label)) score += 18
    if (/secondary/.test(label)) score += 8
    if (/metadata|caption|muted|placeholder|de-emphasized|secondary/.test(description)) score += 8
    if (/accent|border|background|surface|shadow/.test(section)) score -= 8
    if (/brand|accent|secondary/.test(section) && !/text|content/.test(section)) score -= 18
  }

  if (role === 'border') {
    if (/border|divider|shadow|depth/.test(section)) score += 14
    if (/border|hairline|divider|standard|subtle|whisper/.test(label)) score += 13
    if (/border|divider|1px|cards|inputs/.test(description)) score += 8
    if (/shadow/.test(label)) score -= 12
  }

  if (role === 'success') {
    if (/status|semantic/.test(section)) score += 10
    if (/success|green|emerald/.test(label)) score += 12
  }

  if (role === 'warning') {
    if (/status|semantic/.test(section)) score += 10
    if (/warning|orange|amber/.test(label)) score += 12
  }

  if (role === 'danger') {
    if (/status|semantic/.test(section)) score += 10
    if (/error|danger|red|crimson/.test(label)) score += 12
  }

  return score - entry.index * 0.01
}

function pickColor(entries: MarkdownColorEntry[], role: string, darkNative: boolean) {
  let best: MarkdownColorEntry | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (const entry of entries) {
    const score = scoreEntry(entry, role, darkNative)
    if (score > bestScore) {
      best = entry
      bestScore = score
    }
  }
  return bestScore > 0 ? best?.color : undefined
}

function findEntry(entries: MarkdownColorEntry[], pattern: RegExp) {
  return entries.find((entry) => pattern.test(`${entry.label} ${entry.section} ${entry.description}`))
}

function extractComponentSection(body: string) {
  return body.match(/##\s+(?:4\.\s+)?(?:Component Stylings|Components)[\s\S]*?(?=\n##\s+\d|$)/i)?.[0] || ''
}

function extractTypographySection(body: string) {
  return body.match(/##\s+(?:3\.\s+)?(?:Typography Rules|Typography)[\s\S]*?(?=\n##\s+\d|$)/i)?.[0] || ''
}

function extractFontStack(section: string, label: RegExp) {
  const line = section.split('\n').find((item) => label.test(item))
  if (!line) return undefined
  const primary = line.match(/:\s*`([^`]+)`/)?.[1] || line.match(/:\s*\*\*([^*]+)\*\*/)?.[1]
  const fallbacks = line.match(/fallbacks?:\s*`([^`]+)`/i)?.[1]
  if (primary && fallbacks) return `${primary}, ${fallbacks}`
  return primary
}

function extractTypographyValue(section: string, role: RegExp, column: number) {
  const line = section.split('\n').find((item) => role.test(item) && item.trim().startsWith('|'))
  if (!line) return undefined
  const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean)
  return cells[column]
}

function cleanTypographyValue(value: string | undefined) {
  return value?.replace(/\s*\([^)]*\)/g, '').trim()
}

function extractMarkdownTypography(body: string): PlainObject | null {
  const section = extractTypographySection(body)
  if (!section) return null
  const uiFont = extractFontStack(section, /\*\*(?:Primary|Body|Body \/ UI)\*\*/i)
  const monoFont = extractFontStack(section, /\*\*(?:Monospace|Code)\*\*/i)
  const displayFont = extractFontStack(section, /\*\*(?:Headline|Display)\*\*/i) || uiFont
  const bodySize = cleanTypographyValue(extractTypographyValue(section, /\|\s*Body\s*\|/i, 2) || extractTypographyValue(section, /\|\s*Body\s+\/\s+Nav\s*\|/i, 2))
  const bodyLineHeight = cleanTypographyValue(extractTypographyValue(section, /\|\s*Body\s*\|/i, 4) || extractTypographyValue(section, /\|\s*Body Large\s*\|/i, 4))
  const h1Size = cleanTypographyValue(extractTypographyValue(section, /\|\s*Section Heading\s*\|/i, 2) || extractTypographyValue(section, /\|\s*Display\s*\|/i, 2) || extractTypographyValue(section, /\|\s*Display Hero\s*\|/i, 2))
  const h2Size = cleanTypographyValue(extractTypographyValue(section, /\|\s*(?:Sub-heading|Heading 1)\s*\|/i, 2))
  const h3Size = cleanTypographyValue(extractTypographyValue(section, /\|\s*(?:Card Title|Heading 2|Heading 3)\s*\|/i, 2))
  const typography: PlainObject = {}
  if (uiFont || bodySize || bodyLineHeight) {
    typography['body-md'] = {
      fontFamily: uiFont,
      fontSize: bodySize,
      lineHeight: bodyLineHeight,
    }
    typography.button = { fontFamily: uiFont }
    typography['nav-link'] = { fontFamily: uiFont }
  }
  if (displayFont || h1Size) {
    typography['display-lg'] = {
      fontFamily: displayFont,
      fontSize: h1Size,
    }
  }
  if (h2Size) typography['display-md'] = { fontFamily: displayFont, fontSize: h2Size }
  if (h3Size) typography['display-sm'] = { fontFamily: displayFont, fontSize: h3Size }
  if (monoFont) typography.code = { fontFamily: monoFont }
  return Object.keys(typography).length > 0 ? typography : null
}

function extractSectionColor(section: string, title: RegExp, property: RegExp) {
  const start = section.search(title)
  if (start < 0) return undefined
  const block = section.slice(start).split(/\n\n|\n\*\*/)[0]
  const line = block.split('\n').find((item) => property.test(item))
  return line?.match(/`((?:#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)))`/)?.[1]
}

function extractMarkdownComponents(body: string, colors: PlainObject) {
  const section = extractComponentSection(body)
  const primaryHover = extractSectionColor(section, /Primary|CTA|Button/i, /hover|active|pressed|darkens/i)
  const secondaryBg = extractSectionColor(section, /Secondary|Tertiary/i, /background/i)
  const badgeBg = extractSectionColor(section, /Badge|Pill/i, /background/i)
  const badgeText = extractSectionColor(section, /Badge|Pill/i, /text/i)
  const focus = firstString(colors.focus, extractSectionColor(section, /Inputs|Forms|Primary|Button/i, /focus/i))
  const radius = section.match(/Radius:\s*([0-9.]+px)/i)?.[1]
  return {
    'button-primary': {
      backgroundColor: firstString(colors.primary),
      textColor: firstString(colors['on-primary']),
      hoverBackgroundColor: primaryHover,
    },
    'button-secondary': {
      backgroundColor: secondaryBg,
    },
    'badge-pill': {
      backgroundColor: badgeBg,
      textColor: badgeText,
    },
    focus,
    radius,
  }
}

function collectMarkdownHints(body: string): MarkdownThemeHints {
  const darkNative = /dark-mode-native|dark-mode-first|near-black canvas|dark theme applied|darkness as the native medium/i.test(body)
  const entries = collectMarkdownColorEntries(body)
  const warmWhite = findEntry(entries, /warm white/i)?.color
  const warmDark = findEntry(entries, /warm dark/i)?.color
  const mutedSoft = findEntry(entries, /warm gray 300|tertiary text|muted soft|placeholder/i)?.color
  const focus = entries.find((entry) => /focus/i.test(entry.label))?.color
  const badgeBg = findEntry(entries, /badge.*bg|badge blue bg/i)?.color
  const badgeText = findEntry(entries, /badge.*text|badge blue text/i)?.color
  const primaryActive = findEntry(entries, /accent hover|hover accent|active blue|primary-active/i)?.color
    || findEntry(entries, /\bactive\b|\bhover\b|pressed/i)?.color
  const colors: PlainObject = {
    primary: pickColor(entries, 'accent', darkNative),
    'primary-active': primaryActive,
    canvas: pickColor(entries, 'page', darkNative),
    'surface-card': pickColor(entries, 'surface', darkNative),
    'surface-soft': warmWhite,
    ink: pickColor(entries, 'text', darkNative),
    body: pickColor(entries, 'body', darkNative),
    'body-strong': warmDark,
    muted: pickColor(entries, 'muted', darkNative),
    'muted-soft': mutedSoft,
    hairline: pickColor(entries, 'border', darkNative),
    focus,
    'badge-bg': badgeBg,
    'badge-text': badgeText,
    success: pickColor(entries, 'success', darkNative),
    warning: pickColor(entries, 'warning', darkNative),
    error: pickColor(entries, 'danger', darkNative),
  }
  return {
    colors,
    typography: extractMarkdownTypography(body),
    radius: null,
    components: extractMarkdownComponents(body, colors),
  }
}

export function applyAccentToThemeConfig(config: ThemePresetConfig, accent: string) {
  const tokens = config.tokens
  const isDark = config.variant === 'dark'
  const accentHover = mixColor(accent, isDark ? '#ffffff' : '#000000', isDark ? 0.1 : 0.08)
  const accentPressed = mixColor(accent, isDark ? '#000000' : '#000000', isDark ? 0.1 : 0.16)
  const accentText = readableTextOn(accent)

  tokens.system.accent = accent
  tokens.system.focus = accent
  tokens.system.selectionBg = alphaColor(accent, isDark ? 0.28 : 0.2)
  tokens.system.selectionText = accentText
  tokens.app.text.accent = accent
  tokens.app.text.link = accent
  tokens.app.border.focus = accent
  tokens.app.border.accent = alphaColor(accent, isDark ? 0.38 : 0.34)
  tokens.app.actions.primary.bg = accent
  tokens.app.actions.primary.bgHover = accentHover
  tokens.app.actions.primary.bgPressed = accentPressed
  tokens.app.actions.primary.text = accentText
  tokens.app.actions.primary.border = alphaColor(accent, isDark ? 0.46 : 0.36)
  tokens.app.actions.primary.borderHover = alphaColor(accent, isDark ? 0.6 : 0.5)
  tokens.app.actions.primary.shadow = `0 10px 22px ${alphaColor(accent, 0.16)}`
  tokens.app.actions.iconActive.bg = alphaColor(accent, isDark ? 0.18 : 0.16)
  tokens.app.actions.iconActive.bgHover = alphaColor(accent, isDark ? 0.24 : 0.22)
  tokens.app.actions.iconActive.bgPressed = alphaColor(accent, isDark ? 0.3 : 0.28)
  tokens.app.actions.iconActive.text = accent
  tokens.app.actions.iconActive.border = alphaColor(accent, isDark ? 0.36 : 0.28)
  tokens.app.navigation.tabActiveBg = alphaColor(accent, isDark ? 0.18 : 0.14)
  tokens.app.navigation.tabActiveText = accent
  tokens.app.navigation.chipBg = alphaColor(accent, isDark ? 0.18 : 0.12)
  tokens.app.navigation.chipText = accent
  tokens.app.navigation.chipBorder = alphaColor(accent, isDark ? 0.3 : 0.18)
  tokens.app.calendar.todayBg = alphaColor(accent, isDark ? 0.2 : 0.18)
  tokens.app.calendar.todayText = accent
  tokens.app.calendar.todayBorder = alphaColor(accent, isDark ? 0.36 : 0.3)
  tokens.app.calendar.cellHoverBg = alphaColor(accent, isDark ? 0.12 : 0.1)
  tokens.app.calendar.cellSelectedBg = alphaColor(accent, isDark ? 0.28 : 0.24)
  tokens.app.calendar.cellSelectedText = accentText
  tokens.app.calendar.cellSelectedBorder = alphaColor(accent, isDark ? 0.42 : 0.34)
  tokens.app.calendar.cellTodayText = accent
  tokens.app.calendar.itemDot = accent
  tokens.editorChrome.focusBorder = accent
  tokens.editorChrome.focusRing = alphaColor(accent, 0.16)
  tokens.editorChrome.toolbarHoverBg = alphaColor(accent, isDark ? 0.12 : 0.1)
  tokens.editorChrome.toolbarActiveBg = alphaColor(accent, isDark ? 0.18 : 0.14)
  tokens.editorChrome.toolbarActiveStrongBg = alphaColor(accent, isDark ? 0.24 : 0.2)
  tokens.editorChrome.toolbarIconActive = accent
  tokens.editorChrome.popoverItemActive = alphaColor(accent, isDark ? 0.18 : 0.14)
  tokens.editorChrome.popoverIconActive = accent
  tokens.article.link = accent
  tokens.blocks.blockquoteBorder = alphaColor(accent, 0.48)
}

function applyPalette(tokens: ThemePresetTokens, colors: PlainObject, source: PlainObject, variant: 'light' | 'dark') {
  const isDark = variant === 'dark'
  const page = firstString(colors.canvas, colors.page, colors.background, colors['surface-page'])
  const panel = firstString(colors['surface-card'], colors.surface, colors.card, colors['surface-soft'])
  const control = firstString(colors.control, colors['surface-soft'], colors['surface-card'], colors.surface, panel)
  const text = firstString(colors.ink, colors.text, colors.foreground, colors['body-strong'])
  const body = firstString(colors['body-strong'], colors.body, text)
  const muted = firstString(colors.muted, colors['muted-soft'])
  const subtle = firstString(colors['muted-soft'])
  const border = firstString(colors.hairline, colors.border, colors['hairline-soft'])
  const success = firstString(colors.success)
  const warning = firstString(colors.warning)
  const danger = firstString(colors.error, colors.danger)
  const primaryButtonBg = resolveReference(getPath(source, 'components.button-primary.backgroundColor'), source)
  const primaryButtonText = resolveReference(getPath(source, 'components.button-primary.textColor'), source)
  const primaryActive = firstString(colors['primary-active'], resolveReference(getPath(source, 'components.button-primary.hoverBackgroundColor'), source))
  const secondaryButtonBg = firstString(resolveReference(getPath(source, 'components.button-secondary.backgroundColor'), source), colors['secondary-bg'])
  const badgeBg = firstString(resolveReference(getPath(source, 'components.badge-pill.backgroundColor'), source), colors['badge-bg'])
  const badgeText = firstString(resolveReference(getPath(source, 'components.badge-pill.textColor'), source), colors['badge-text'])
  const focus = firstString(source.focus, colors.focus)

  if (page) {
    tokens.app.surfaces.page = page
    tokens.app.surfaces.pageSubtle = firstString(colors['surface-soft']) || mixColor(page, isDark ? '#ffffff' : '#000000', isDark ? 0.05 : 0.02)
    tokens.app.surfaces.sidebar = firstString(colors['surface-soft']) || mixColor(page, isDark ? '#ffffff' : '#000000', isDark ? 0.04 : 0.015)
    tokens.app.overlay.fade = `linear-gradient(180deg, ${page} 78%, rgba(245, 244, 237, 0))`
  }
  if (panel) {
    tokens.app.surfaces.card = panel
    tokens.app.surfaces.panel = panel
    tokens.app.surfaces.modal = panel
    tokens.app.surfaces.cardHover = firstString(colors['surface-soft']) || mixColor(panel, isDark ? '#ffffff' : '#ffffff', isDark ? 0.08 : 0.35)
    tokens.app.cards.itemBg = panel
    tokens.article.bg = panel
    tokens.blocks.tableCellBg = panel
  }
  if (control) {
    tokens.app.surfaces.control = secondaryButtonBg || control
    tokens.app.surfaces.input = firstString(colors.input) || panel || alphaColor(control, isDark ? 0.7 : 0.74)
    tokens.app.surfaces.inputFocus = alphaColor(control, isDark ? 0.88 : 0.94)
    tokens.app.actions.secondary.bg = secondaryButtonBg || alphaColor(control, isDark ? 0.82 : 0.78)
    tokens.app.actions.secondary.bgHover = alphaColor(control, isDark ? 0.96 : 0.96)
    tokens.app.actions.icon.bg = alphaColor(control, isDark ? 0.82 : 0.82)
  }
  if (text) {
    tokens.app.text.primary = text
    tokens.app.text.inverse = readableTextOn(isDark ? '#ffffff' : '#111111') === '#ffffff' ? '#ffffff' : '#171717'
    tokens.article.heading = text
  }
  if (firstString(colors['body-strong'])) {
    tokens.app.text.body = colors['body-strong'] as string
    tokens.article.text = colors['body-strong'] as string
    tokens.code.blockText = colors['body-strong'] as string
  }
  if (body) {
    tokens.app.text.body = body
    tokens.app.actions.secondary.text = body
    tokens.app.actions.ghost.text = body
    tokens.app.actions.subtle.text = body
    tokens.app.actions.icon.text = body
    tokens.article.text = body
  }
  if (muted) {
    tokens.app.text.muted = muted
    tokens.app.text.subtle = subtle || alphaColor(muted, isDark ? 0.72 : 0.82)
    tokens.app.navigation.tabText = muted
    tokens.article.textMuted = muted
    tokens.blocks.blockquoteText = muted
  }
  if (border) {
    tokens.app.border.default = border
    tokens.app.border.subtle = alphaColor(border, isDark ? 0.7 : 0.78)
    tokens.app.border.strong = border
    tokens.app.border.control = border
    tokens.app.border.divider = border
    tokens.app.cards.itemBorder = border
    tokens.editorChrome.border = border
    tokens.code.blockBorder = border
    tokens.blocks.tableBorder = border
    tokens.blocks.hr = border
  }
  if (focus) {
    tokens.system.focus = focus
    tokens.app.border.focus = focus
    tokens.editorChrome.focusBorder = focus
  }
  if (success) {
    tokens.system.success = success
    tokens.app.status.successText = success
    tokens.app.status.successBg = alphaColor(success, 0.12)
  }
  if (warning) {
    tokens.system.warning = warning
    tokens.app.status.warningText = warning
    tokens.app.status.warningBg = alphaColor(warning, 0.14)
  }
  if (danger) {
    tokens.system.danger = danger
    tokens.app.status.dangerText = danger
    tokens.app.status.dangerBg = alphaColor(danger, 0.12)
    tokens.app.actions.danger.text = danger
    tokens.app.actions.danger.bg = alphaColor(danger, 0.12)
  }
  if (primaryButtonBg) {
    tokens.app.actions.primary.bg = primaryButtonBg
  }
  if (primaryActive) {
    tokens.app.actions.primary.bgHover = primaryActive
    tokens.app.actions.primary.bgPressed = primaryActive
  }
  if (primaryButtonText) {
    tokens.app.actions.primary.text = primaryButtonText
  }
  if (secondaryButtonBg) {
    tokens.app.actions.ghost.bgHover = secondaryButtonBg
  }
  if (text) {
    tokens.app.actions.secondary.text = text
  }
  if (badgeBg) {
    tokens.app.navigation.tabActiveBg = badgeBg
    tokens.editorChrome.toolbarActiveBg = badgeBg
  }
  if (badgeText) {
    tokens.app.navigation.tabActiveText = badgeText
  }
  if (colors['surface-soft']) {
    tokens.code.inlineBg = colors['surface-soft'] as string
    tokens.code.blockBg = colors['surface-soft'] as string
    tokens.blocks.blockquoteBg = colors['surface-soft'] as string
    tokens.blocks.tableHeaderBg = colors['surface-soft'] as string
  }
  if (body) {
    tokens.code.blockText = body
  }
  if (warning) {
    tokens.code.inlineText = warning
  }
  if (colors.primary) {
    tokens.blocks.blockquoteBorder = colors.primary as string
  }
}

function applyTypography(tokens: ThemePresetTokens, typography: unknown) {
  if (!isObject(typography)) return
  const uiFont = firstString(
    getPath(typography, 'body-md.fontFamily'),
    getPath(typography, 'button.fontFamily'),
    getPath(typography, 'nav-link.fontFamily'),
    getPath(typography, 'title-md.fontFamily'),
  )
  const headingFont = firstString(
    getPath(typography, 'display-lg.fontFamily'),
    getPath(typography, 'display-xl.fontFamily'),
    getPath(typography, 'display-md.fontFamily'),
    getPath(typography, 'title-lg.fontFamily'),
  )
  const codeFont = firstString(getPath(typography, 'code.fontFamily'))
  const bodySize = firstString(getPath(typography, 'body-md.fontSize'))
  const bodyLineHeight = firstString(getPath(typography, 'body-md.lineHeight'))
  const h1Size = firstString(getPath(typography, 'display-lg.fontSize'), getPath(typography, 'display-xl.fontSize'))
  const h2Size = firstString(getPath(typography, 'display-md.fontSize'))
  const h3Size = firstString(getPath(typography, 'display-sm.fontSize'), getPath(typography, 'title-lg.fontSize'))

  if (uiFont) tokens.fonts.ui = uiFont
  if (headingFont) tokens.fonts.heading = headingFont
  if (uiFont) tokens.fonts.body = uiFont
  if (codeFont) tokens.fonts.code = codeFont
  if (bodySize) tokens.article.fontSize = bodySize
  if (bodyLineHeight) tokens.article.lineHeight = String(bodyLineHeight)
  if (h1Size) tokens.article.h1Size = h1Size
  if (h2Size) tokens.article.h2Size = h2Size
  if (h3Size) tokens.article.h3Size = h3Size
}

function applyRadius(tokens: ThemePresetTokens, rounded: unknown) {
  if (!isObject(rounded)) return
  const sm = firstString(rounded.sm, rounded.xs)
  const md = firstString(rounded.md, rounded.sm)
  const lg = firstString(rounded.lg, rounded.md)
  const xl = firstString(rounded.xl, rounded.lg)
  const pill = firstString(rounded.pill, rounded.full)
  if (sm) tokens.radius.sm = sm
  if (md) tokens.radius.md = md
  if (lg) tokens.radius.lg = lg
  if (xl) tokens.radius.xl = xl
  if (pill) tokens.radius.pill = pill
}

function applyMarkdownRadius(tokens: ThemePresetTokens, components: PlainObject) {
  const componentRadius = firstString(getPath(components, 'radius'))
  if (!componentRadius) return
  tokens.radius.sm = componentRadius
  tokens.radius.md = componentRadius
  tokens.radius.lg = componentRadius === '4px' ? '12px' : componentRadius
}

export function convertDesignMdToThemeConfig(input: {
  rawText: string
  nameFallback: string
  existingIds?: string[]
}): DesignMdConvertResult {
  const { frontmatter, body } = extractFrontmatter(input.rawText)
  const source = frontmatter || {}
  const markdownHints = frontmatter ? null : collectMarkdownHints(body)
  const colors: PlainObject = isObject(source.colors) ? source.colors : (markdownHints?.colors || {})
  const typography = isObject(source.typography) ? source.typography : markdownHints?.typography
  const rounded = isObject(source.rounded) ? source.rounded : markdownHints?.radius
  const components = isObject(source.components) ? source.components : markdownHints?.components || {}
  const enrichedSource = { ...source, components, focus: getPath(components, 'focus') } as PlainObject
  const name = firstString(source.name, extractThemeName(body), input.nameFallback) || 'DesignMD Theme'
  const accent = firstString(colors.primary, colors.accent, colors.brand, colors.blue, colors.coral, colors.terracotta) || defaultThemeConfigs.light.tokens.system.accent
  const page = firstString(colors.canvas, colors.page, colors.background, colors['surface-page'])
  const variant = firstString(source.variant) === 'dark' || (page && brightness(page) < 0.35) ? 'dark' : 'light'
  const fallback = variant === 'dark' ? defaultThemeConfigs.dark : defaultThemeConfigs.light
  const id = slugifyThemeName(`designmd-${name}`, input.existingIds || [])
  const draft = cloneTheme(fallback)

  draft.id = id
  draft.name = name
  draft.variant = variant
  applyAccentToThemeConfig(draft, accent)
  applyPalette(draft.tokens, colors, enrichedSource, variant)
  applyTypography(draft.tokens, typography)
  applyRadius(draft.tokens, rounded)
  if (!frontmatter) applyMarkdownRadius(draft.tokens, components)

  const warnings: string[] = []
  if (!frontmatter) {
    warnings.push('未检测到 DesignMD frontmatter，已从 Markdown 正文中尽量提取颜色。')
  }
  if (!isObject(source.colors) && Object.keys(colors).length === 0) {
    warnings.push('未检测到结构化 colors，已使用当前浅色主题补齐。')
  }
  if (!isObject(source.typography)) {
    warnings.push('未检测到结构化 typography，字体设置已沿用默认值。')
  }
  warnings.push('DesignMD 只生成 App 外观与文章语义 token；Markdown 精确渲染请继续用 Typora CSS 导入。')

  return {
    id,
    config: normalizeThemeConfig(id, draft, fallback),
    warnings,
  }
}
