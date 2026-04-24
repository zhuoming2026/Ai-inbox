/**
 * Typora Theme Converter
 * 将 Typora CSS 转换成 ai-inbox 可用的 scoped typography CSS。
 *
 * 策略：
 * - 使用 PostCSS 解析 CSS AST，不使用正则。
  * - 选择器映射：#write h1 → [data-ai-theme='<id>'] .tiptap h1
 * - 规则过滤：丢弃 sidebar、CodeMirror、@import 远程资源等。
 * - token 提取：从规则中提取语义化 CSS 变量。
 * - 暗色识别：基于背景色亮度判断。
 */

import postcss from 'postcss'
import type { ImportedThemeMetadata } from './imported-theme'

export interface ConvertTyporaThemeInput {
  css: string
  fileName: string
  existingIds?: string[]
}

export interface ConvertTyporaThemeOutput {
  id: string
  name: string
  css: string
  metadata: ImportedThemeMetadata
  warnings: string[]
}

// ─── Slug 工具 ────────────────────────────────────────────────────────────────

/**
 * 从字符串生成 URL-safe slug。
 * 1. 转小写
 * 2. 非字母数字替换为 -
 * 3. 合并连续 -
 * 4. 去掉首尾 -
 * 5. 加 typora- 前缀
 */
export function toTyporaSlug(name: string, existingIds: string[] = []): string {
  if (!name) {
    name = 'imported-theme'
  }

  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  const prefixed = base ? `typora-${base}` : 'typora-imported-theme'

  if (!existingIds.includes(prefixed)) {
    return prefixed
  }

  // 同名冲突，追加数字后缀
  let counter = 2
  while (existingIds.includes(`${prefixed}-${counter}`)) {
    counter++
  }
  return `${prefixed}-${counter}`
}

// ─── 颜色工具 ────────────────────────────────────────────────────────────────

type Rgb = { r: number; g: number; b: number }

function parseHexColor(hex: string): Rgb | null {
  const cleaned = hex.trim().replace('#', '')
  let value: string
  if (cleaned.length === 3) {
    value = cleaned.split('').map((c) => `${c}${c}`).join('')
  } else if (cleaned.length === 6) {
    value = cleaned
  } else {
    return null
  }
  const parsed = Number.parseInt(value, 16)
  if (Number.isNaN(parsed)) return null
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  }
}

function parseRgbColor(rgb: string): Rgb | null {
  const match = rgb.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (match) {
    return {
      r: Number.parseInt(match[1], 10),
      g: Number.parseInt(match[2], 10),
      b: Number.parseInt(match[3], 10),
    }
  }
  return null
}

function colorBrightness(color: Rgb): number {
  // 相对亮度公式 (W3C)
  return (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255
}

// ─── Metadata 解析 ───────────────────────────────────────────────────────────

/**
 * 从 CSS 顶部注释中解析 name 字段。
 * 期望格式：
 * /*
 * name: Vue
 * author: ...
 * *\/
 */
function parseMetadataFromComment(css: string): { name?: string } {
  const match = css.match(/\/\*[\s\S]*?\*\//)
  if (!match) return {}

  const text = match[0]
  const nameResult = text.match(/\bname:\s*(.+)/)
  return {
    name: nameResult ? nameResult[1].trim() : undefined,
  }
}

// ─── 亮度 / 暗色判断 ─────────────────────────────────────────────────────────

function extractBackgroundFromDecls(decls: postcss.Declaration[]): string | null {
  for (const decl of decls) {
    if (
      (decl.prop === 'background' || decl.prop === 'background-color') &&
      decl.value &&
      decl.value !== 'transparent' &&
      decl.value !== 'inherit' &&
      decl.value !== 'initial'
    ) {
      return decl.value
    }
  }
  return null
}

function detectIsDark(background: string | null, warnings: string[]): boolean {
  if (!background) {
    warnings.push('无法识别背景色，默认作为浅色主题')
    return false
  }

  let rgb = parseHexColor(background)
  if (!rgb) {
    rgb = parseRgbColor(background)
  }
  if (!rgb) {
    warnings.push(`背景色无法解析 "${background}"，默认作为浅色主题`)
    return false
  }

  return colorBrightness(rgb) < 0.5
}

// ─── 选择器映射 ──────────────────────────────────────────────────────────────

/**
 * 单个 Typora selector → 一条 ai-inbox scoped selector。
 *
 * #write           → [data-ai-theme='<id>'] .tiptap
 * #write h1        → [data-ai-theme='<id>'] .tiptap h1
 * .md-fences       → [data-ai-theme='<id>'] .tiptap pre
 * .md-fences code  → [data-ai-theme='<id>'] .tiptap pre code
 * .task-list       → [data-ai-theme='<id>'] .tiptap ul[data-type="taskList"]
 */
function mapSingleSelector(selector: string, themeId: string): string | null {
  const trimmed = selector.trim()
  let mapped = trimmed

  if (isTyporaUiSelector(trimmed)) {
    return null
  }

  if (/#write\b/.test(mapped)) {
    // #write 后面可能有空格和内容，也可能没有
    mapped = mapped.replace(/#write\b/, `[data-ai-theme='${themeId}'] .tiptap`)
  } else if (/\.md-fences\b/.test(mapped)) {
    mapped = mapped.replace(/\.md-fences\b/, `[data-ai-theme='${themeId}'] .tiptap pre`)
  } else if (/\.task-list\b/.test(mapped)) {
    mapped = mapped.replace(/\.task-list\b/, `[data-ai-theme='${themeId}'] .tiptap ul[data-type="taskList"]`)
  } else if (isPortableContentSelector(mapped)) {
    mapped = `[data-ai-theme='${themeId}'] .tiptap ${mapped}`
  } else {
    // 未知前缀，记录 warning 并返回 null
    return null
  }

  // 如果映射后仍然包含 #write（替换失败），丢弃
  if (mapped.includes('#write')) {
    return null
  }

  return mapped
}

/**
 * 映射完整 selector（可能包含逗号分隔的多个）：
 *
 * #write h1, #write p → 两路输出
  * [data-ai-theme='<id>'] .tiptap h1,
 * [data-ai-theme='<id>'] .rich-editor__content h1,
 * [data-ai-theme='<id>'] .tiptap p,
 * [data-ai-theme='<id>'] .rich-editor__content p
 */
function mapSelector(selector: string, themeId: string, warnings: string[]): string | null {
  // 1. 按逗号拆分
  const parts = selector.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return null

  // 2. 逐个映射，每个部分产生两条 scoped selector（.tiptap + .rich-editor__content）
  const scopedSelectors: string[] = []

  for (const part of parts) {
    const mapped = mapSingleSelector(part, themeId)
    if (mapped === null) {
      warnings.push(`已忽略无法映射的选择器: ${part}`)
      continue
    }

    // 生成 .tiptap 版本和 .rich-editor__content 版本
    const tipTapSelector = mapped.replace(
      `[data-ai-theme='${themeId}'] .tiptap`,
      `[data-ai-theme='${themeId}'] .tiptap`
    )
    const richSelector = mapped.replace(
      `[data-ai-theme='${themeId}'] .tiptap`,
      `[data-ai-theme='${themeId}'] .rich-editor__content`
    )

    scopedSelectors.push(tipTapSelector, richSelector)
  }

  if (scopedSelectors.length === 0) {
    return null
  }

  // 3. 用逗号合并
  return scopedSelectors.join(',\n')
}

// ─── 声明过滤 ────────────────────────────────────────────────────────────────

const BLOCKED_PROPERTIES = new Set([
  'position',
  'z-index',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'max-width',
  'max-height',
  'min-width',
  'min-height',
])

const OVERFLOW_ALLOWED_ON = ['pre', 'code', '.md-fences']

function isDeclarationAllowed(prop: string, selector: string): boolean {
  if (prop === 'overflow') {
    // overflow 只在 pre 相关选择器中允许
    return OVERFLOW_ALLOWED_ON.some((allowed) => selector.includes(allowed))
  }
  return !BLOCKED_PROPERTIES.has(prop)
}

// ─── 规则过滤 ────────────────────────────────────────────────────────────────

const BLOCKED_SELECTORS = new Set([
  '*',
  'html',
  'body',
  ':root',
  '.sidebar',
  '.outline-content',
  '.file-node',
  '.megamenu',
  '.footer',
  '.typora-export',
  '.CodeMirror',
  '.cm-s-inner',
  '.md-meta',
  '.md-line',
  '.md-toc',
])

function isTyporaUiSelector(selector: string): boolean {
  const parts = selector.split(/[\s>+~]+/)
  for (const part of parts) {
    const normalized = part.trim()
    if (BLOCKED_SELECTORS.has(normalized)) {
      return true
    }
    // 拒绝包含这些关键词的选择器
    if (normalized.includes('.sidebar') || normalized.includes('.typora-export') || normalized.includes('.CodeMirror')) {
      return true
    }
  }
  return false
}

const PORTABLE_CONTENT_SELECTOR_RE = /^(h[1-6]|p|a|blockquote|ul|ol|li|table|thead|tbody|tr|th|td|pre|code|img|figure|figcaption|mark|hr|strong|em|sup|sub|del|kbd|details|summary|nav)(?=[\s.#:[>+~]|$)/i

function isPortableContentSelector(selector: string): boolean {
  if (!PORTABLE_CONTENT_SELECTOR_RE.test(selector)) return false
  return !/\b(html|body|script|style)\b/i.test(selector)
}

// ─── CSS 变换 ────────────────────────────────────────────────────────────────

interface CssRule {
  selector: string
  mappedSelector: string
  decls: postcss.Declaration[]
  parentWarnings: string[]
}

function transformRule(rule: postcss.Rule, themeId: string, warnings: string[]): CssRule | null {
  const selector = rule.selector

  if (rule.parent?.type === 'atrule') {
    const atRule = rule.parent as postcss.AtRule
    if (atRule.name === 'media' || atRule.name === 'page' || atRule.name.includes('keyframes')) {
      warnings.push(`已忽略 @${atRule.name} 内的选择器: ${selector}`)
      return null
    }
  }

  const mappedSelector = mapSelector(selector, themeId, warnings)
  if (!mappedSelector) {
    // warning already pushed inside mapSelector
    return null
  }

  const decls: postcss.Declaration[] = []
  const parentWarnings: string[] = []

  rule.walkDecls((decl) => {
    // 跳过 @import
    if (decl.prop === 'import') {
      parentWarnings.push(`已忽略 @import: ${decl.value}`)
      return
    }

    // 检查 url() 远程资源
    const value = decl.value
    if (
      value.includes('url(') &&
      (value.includes('http://') || (value.includes('https://') && !value.includes("'#") && !value.includes('" #')))
    ) {
      // 允许 data URI 和相对路径
      if (!value.match(/url\s*\(\s*['"]?\s*https?:\/\//)) {
        decls.push(decl)
        return
      }
      parentWarnings.push(`已忽略远程资源: ${decl.prop}: ${value}`)
      return
    }

    if (!isDeclarationAllowed(decl.prop, selector)) {
      parentWarnings.push(`已忽略不适用的声明: ${decl.prop}（在 ${selector} 中）`)
      return
    }

    decls.push(decl)
  })

  for (const w of parentWarnings) {
    warnings.push(w)
  }

  if (decls.length === 0) {
    return null
  }

  return {
    selector,
    mappedSelector,
    decls,
    parentWarnings,
  }
}

// ─── token 提取 ─────────────────────────────────────────────────────────────

interface TokenExtraction {
  typographyTokens: Record<string, string>
  appShellTokens: Record<string, string>
}

function extractTokens(rules: postcss.Rule[], _themeId: string): TokenExtraction {
  const tokens: TokenExtraction = {
    typographyTokens: {},
    appShellTokens: {},
  }

  const add = (
    map: Record<string, string>,
    key: string,
    value: string,
    _prop: string,
  ) => {
    if (value && value !== 'inherit' && value !== 'initial' && value !== 'transparent') {
      map[key] = value
    }
  }

  for (const rule of rules) {
    const selector = rule.selector

    // 只从 #write 相关选择器中提取 token
    if (!selector.includes('#write') && !selector.includes('.md-fences')) {
      continue
    }

    rule.walkDecls((decl) => {
      const prop = decl.prop
      const value = decl.value
      const isWrite = selector.includes('#write')
      const isCode = selector.includes('.md-fences') || selector === '#write pre' || selector === '#write code'

      if (isWrite) {
        if (prop === 'background' || prop === 'background-color') {
          add(tokens.typographyTokens, '--typography-bg', value, prop)
          add(tokens.appShellTokens, '--bg-primary', value, prop)
          add(tokens.appShellTokens, '--bg-card', value, prop)
        } else if (prop === 'color') {
          if (selector.match(/\b(h1|h2|h3|h4|h5|h6)\b/)) {
            add(tokens.typographyTokens, '--typography-heading', value, prop)
          } else {
            add(tokens.typographyTokens, '--typography-text', value, prop)
            add(tokens.appShellTokens, '--text-primary', value, prop)
          }
        } else if (prop === 'font-family') {
          add(tokens.typographyTokens, '--typography-font-body', value, prop)
          add(tokens.appShellTokens, '--font-body', value, prop)
        } else if (prop === 'border-color') {
          add(tokens.typographyTokens, '--typography-table-border', value, prop)
          add(tokens.appShellTokens, '--border-subtle', value, prop)
          add(tokens.appShellTokens, '--border-strong', value, prop)
        } else if (prop === 'border') {
          add(tokens.typographyTokens, '--typography-blockquote-border', value, prop)
        }
      }

      if (isCode) {
        if (prop === 'background' || prop === 'background-color') {
          add(tokens.typographyTokens, '--typography-code-block-bg', value, prop)
          add(tokens.appShellTokens, '--surface-code-block', value, prop)
        } else if (prop === 'color') {
          add(tokens.typographyTokens, '--typography-code-block-color', value, prop)
        }
      }

      // 链接颜色
      if (selector.includes('#write a') || selector === '#write a') {
        if (prop === 'color') {
          add(tokens.typographyTokens, '--typography-link', value, prop)
          add(tokens.appShellTokens, '--color-primary', value, prop)
          add(tokens.appShellTokens, '--color-link', value, prop)
        }
      }

      // 引用块
      if (selector.includes('blockquote')) {
        if (prop === 'border-left-color') {
          add(tokens.typographyTokens, '--typography-blockquote-border', value, prop)
        } else if (prop === 'background-color') {
          add(tokens.typographyTokens, '--typography-blockquote-bg', value, prop)
        }
      }
    })
  }

  return tokens
}

// ─── 主转换函数 ──────────────────────────────────────────────────────────────

export async function convertTyporaTheme(input: ConvertTyporaThemeInput): Promise<ConvertTyporaThemeOutput> {
  const { css, fileName, existingIds = [] } = input
  const warnings: string[] = []

  // 1. 解析 metadata
  const metaFromComment = parseMetadataFromComment(css)
  const name = metaFromComment.name || fileName.replace(/\.css$/i, '')
  const id = toTyporaSlug(name, existingIds)

  // 2. PostCSS 解析
  const result = postcss.parse(css)

  // 3. 遍历规则
  const transformedRules: CssRule[] = []
  let backgroundColor: string | null = null
  const allRules: postcss.Rule[] = []

  result.walkRules((rule) => {
    if (rule.type !== 'rule') return
    allRules.push(rule as postcss.Rule)

    // 收集 #write 的背景色（用于暗色判断）
    if (rule.selector.split(',').map((s) => s.trim()).includes('#write')) {
      const bg = extractBackgroundFromDecls((rule as postcss.Rule).nodes as postcss.Declaration[])
      if (bg && !backgroundColor) {
        backgroundColor = bg
      }
    }

    const transformed = transformRule(rule as postcss.Rule, id, warnings)
    if (transformed) {
      transformedRules.push(transformed)
    }
  })

  // 4. 暗色判断
  const isDark = detectIsDark(backgroundColor, warnings)

  // 5. 提取 token
  const { typographyTokens, appShellTokens } = extractTokens(allRules, id)

  // 6. 生成输出 CSS
  const lines: string[] = []

  // 合并 token 块（typography + app shell）统一用 [data-ai-theme] 入口
  const allTokens = { ...appShellTokens, ...typographyTokens }
  if (Object.keys(allTokens).length > 0) {
    lines.push(`[data-ai-theme='${id}'] {`)
    for (const [key, value] of Object.entries(allTokens)) {
      lines.push(`  ${key}: ${value};`)
    }
    lines.push('}')
    lines.push('')
  }

  // scoped selector rules
  for (const { mappedSelector, decls } of transformedRules) {
    lines.push(`${mappedSelector} {`)
    for (const decl of decls) {
      lines.push(`  ${decl.prop}: ${decl.value};`)
    }
    lines.push('}')
  }

  const outputCss = lines.join('\n')

  const metadata: ImportedThemeMetadata = {
    id,
    name,
    source: 'typora',
    sourceFileName: fileName,
    createdAt: new Date().toISOString(),
    isDark,
    warnings,
    assets: {
      fontsDir: 'assets/fonts',
      imagesDir: 'assets/images',
    },
  }

  return {
    id,
    name,
    css: outputCss,
    metadata,
    warnings,
  }
}
