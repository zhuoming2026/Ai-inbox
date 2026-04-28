export type InboxDocumentType = 'note' | 'todo' | 'link' | 'image' | 'research'
export type DocumentBucket = 'inbox' | 'collected' | 'deleted'

export type InboxFrontmatter = Record<string, unknown>

export interface InboxDocument {
  slug: string
  type: InboxDocumentType
  filename: string
  created: string
  frontmatter: InboxFrontmatter
  body: string
  raw: string
}

export interface RawDocumentParts {
  body: string
  frontmatter: InboxFrontmatter
  frontmatterText: string
  hasFrontmatter: boolean
  parseError: boolean
}

function normalizeFrontmatter(frontmatter: InboxFrontmatter): InboxFrontmatter {
  const nextFrontmatter = { ...frontmatter }

  if (typeof nextFrontmatter.status === 'string' && typeof nextFrontmatter.bucket !== 'string') {
    if (nextFrontmatter.status === 'deleted') nextFrontmatter.bucket = 'deleted'
    if (nextFrontmatter.status === 'archived' || nextFrontmatter.status === 'finished') nextFrontmatter.bucket = 'collected'
  }

  if (typeof nextFrontmatter.bucket !== 'string') {
    nextFrontmatter.bucket = 'inbox'
  }

  if (typeof nextFrontmatter.enrichStatus !== 'string') {
    nextFrontmatter.enrichStatus = 'none'
  }

  if (!Array.isArray(nextFrontmatter.tags)) {
    nextFrontmatter.tags = []
  }

  return nextFrontmatter
}

export function syncFrontmatterBucket(frontmatter: InboxFrontmatter, bucket: DocumentBucket): InboxFrontmatter {
  const nextFrontmatter: InboxFrontmatter = {
    ...frontmatter,
    bucket,
  }

  const currentStatus = typeof nextFrontmatter.status === 'string' ? nextFrontmatter.status : undefined

  if (bucket === 'deleted') {
    nextFrontmatter.status = 'deleted'
    return nextFrontmatter
  }

  if (bucket === 'collected') {
    if (!currentStatus || currentStatus === 'ready' || currentStatus === 'deleted') {
      nextFrontmatter.status = 'archived'
    }
    return nextFrontmatter
  }

  if (!currentStatus || currentStatus === 'deleted' || currentStatus === 'archived') {
    nextFrontmatter.status = 'ready'
  }

  return nextFrontmatter
}

export function parseFrontmatter(content: string): { frontmatter: InboxFrontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: normalizeFrontmatter({}), body: content }

  const frontmatter: InboxFrontmatter = {}
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':')
    if (!key || rest.length === 0) continue

    const rawValue = rest.join(':').trim()

    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      frontmatter[key.trim()] = rawValue.slice(1, -1)
      continue
    }

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      try {
        frontmatter[key.trim()] = JSON.parse(rawValue)
      } catch {
        frontmatter[key.trim()] = rawValue
      }
      continue
    }

    frontmatter[key.trim()] = rawValue
  }

  return { frontmatter: normalizeFrontmatter(frontmatter), body: match[2] }
}

export function buildFrontmatter(frontmatter: InboxFrontmatter, body: string) {
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
  return `---\n${lines.join('\n')}\n---\n\n${body}`
}

export function splitRawDocument(raw: string): RawDocumentParts {
  const normalized = raw.replace(/\r\n/g, '\n')

  if (!normalized.startsWith('---\n')) {
    const { frontmatter } = parseFrontmatter(normalized)
    return {
      body: normalized,
      frontmatter,
      frontmatterText: '',
      hasFrontmatter: false,
      parseError: false,
    }
  }

  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/)
  if (!match) {
    return {
      body: '',
      frontmatter: {},
      frontmatterText: normalized.slice(4),
      hasFrontmatter: true,
      parseError: true,
    }
  }

  const { frontmatter } = parseFrontmatter(normalized)
  return {
    body: match[2] ?? '',
    frontmatter,
    frontmatterText: match[1],
    hasFrontmatter: true,
    parseError: false,
  }
}

export function buildRawDocument(frontmatterText: string, body: string) {
  const normalizedFrontmatter = frontmatterText.replace(/\r\n/g, '\n').trim()
  const normalizedBody = body.replace(/\r\n/g, '\n')

  if (!normalizedFrontmatter) {
    return normalizedBody
  }

  return `---\n${normalizedFrontmatter}\n---\n\n${normalizedBody}`
}

export function detectDocumentType(slug: string): InboxDocumentType {
  if (slug.startsWith('todo-')) return 'todo'
  if (slug.startsWith('image-')) return 'image'
  if (slug.startsWith('link-')) return 'link'
  if (slug.startsWith('research-')) return 'research'
  return 'note'
}

export function getEditableBody(body: string) {
  return body.replace(/^## Content\n\n/, '')
}

export function getPreviewText(body: string) {
  return getEditableBody(body)
    // 兼容旧文档 ## Raw 和新文档 ## 原文
    .replace(/\n## (Raw|原文)\n[\s\S]*$/, '')
    .trim()
}

export function getDocumentTags(frontmatter: InboxFrontmatter): string[] {
  return Array.isArray(frontmatter.tags) ? frontmatter.tags.filter((tag): tag is string => typeof tag === 'string') : []
}

export function getDocumentBucket(frontmatter: InboxFrontmatter): DocumentBucket {
  return frontmatter.bucket === 'collected' || frontmatter.bucket === 'deleted' ? frontmatter.bucket : 'inbox'
}

export function getDocumentTitle(document: Pick<InboxDocument, 'slug' | 'frontmatter'>) {
  return typeof document.frontmatter?.title === 'string' ? document.frontmatter.title : document.slug
}

/**
 * 从正文中提取第一个一级标题（# xxx）
 */
export function extractMarkdownH1(body: string): string {
  if (!body) return ''
  const lines = body.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      return trimmed.slice(2).trim()
    }
  }
  return ''
}

/**
 * 提取第一条有意义文本（非空、非分隔符、非纯 URL）
 */
export function extractFirstMeaningfulLine(text: string): string {
  if (!text) return ''
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // 跳过 markdown 分隔符
    if (/^---+$/.test(trimmed)) continue
    // 跳过纯 URL
    if (/^https?:\/\//i.test(trimmed)) continue
    return trimmed
  }
  return ''
}

/**
 * 根据 rawInput 和 body 派生 contentTitle
 * 优先级：body H1 > rawInput 第一行有效文本
 */
export function deriveContentTitle(rawInput: string, body?: string): string {
  if (body) {
    const h1 = extractMarkdownH1(body)
    if (h1) return h1
  }
  const first = extractFirstMeaningfulLine(rawInput)
  if (first) return first.slice(0, 80)
  return ''
}

/**
 * 标题来源类型
 */
export type TitleSource = 'ai' | 'content' | 'fallback' | 'manual' | ''

/**
 * 解析 AI 返回的 title 字段名
 */
export function getAiTitle(frontmatter: InboxFrontmatter): string {
  return typeof frontmatter.aiTitle === 'string' ? frontmatter.aiTitle : ''
}

/**
 * 解析 contentTitle
 */
export function getContentTitle(frontmatter: InboxFrontmatter): string {
  return typeof frontmatter.contentTitle === 'string' ? frontmatter.contentTitle : ''
}

/**
 * 解析 titleSource
 */
export function getTitleSource(frontmatter: InboxFrontmatter): TitleSource {
  const val = frontmatter.titleSource
  if (val === 'ai' || val === 'content' || val === 'fallback' || val === 'manual') return val
  return ''
}

/**
 * 解析 displayTitle（展示优先级：aiTitle > contentTitle > fallback > slug）
 */
export function resolveDisplayTitle(frontmatter: InboxFrontmatter, body: string, slug: string): string {
  const aiTitle = getAiTitle(frontmatter)
  if (aiTitle) return aiTitle

  const contentTitle = getContentTitle(frontmatter)
  if (contentTitle) return contentTitle

  // 旧文档只有 title 时，尝试从 body 提取
  const legacyTitle = typeof frontmatter.title === 'string' ? frontmatter.title : ''
  if (legacyTitle && legacyTitle !== slug) return legacyTitle

  const bodyH1 = extractMarkdownH1(body)
  if (bodyH1) return bodyH1

  return slug
}

/**
 * 检查 body 中是否存在指定区块（heading）
 * 例如 hasMarkdownSection(body, 'AI 总结') 检查是否存在 ## AI 总结
 */
export function hasMarkdownSection(body: string, heading: string): boolean {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^##\\s+${escaped}\\s*$`, 'm')
  return regex.test(body)
}

/**
 * 获取 body 中指定区块的内容
 * 返回 head+content（不含 heading 行）或 null（不存在）
 */
export function getMarkdownSection(body: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=^##\\s|\\n*$)`, 'm')
  const match = body.match(regex)
  return match ? match[1].trim() : null
}

/**
 * 在 body 中插入或替换指定区块
 * - 区块存在则替换内容
 * - 不存在则插入到 H1 之后（或 ## 原文 之前）
 */
export function upsertMarkdownSection(body: string, heading: string, content: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const sectionMarker = `## ${heading}`
  const newSection = `${sectionMarker}\n\n${content}`
  const regex = new RegExp(`^##\\s+${escaped}\\s*\\n[\\s\\S]*?(?=^##\\s|\\n*$)`, 'm')

  if (regex.test(body)) {
    return body.replace(regex, newSection)
  }

  // 尝试插到 H1 之后
  const h1Match = body.match(/^(#\s+.+\n)\n*/m)
  if (h1Match) {
    return body.replace(h1Match[0], h1Match[1] + '\n' + newSection + '\n\n')
  }

  // 尝试插到 ## 原文 之前
  const rawMatch = body.match(/^(\n*##\s+原文\s*)$/m)
  if (rawMatch) {
    return body.replace(rawMatch[1], newSection + '\n\n' + rawMatch[1])
  }

  // 否则追加到文末
  return body ? body.trimEnd() + '\n\n' + newSection : newSection
}

export function getDocumentDate(frontmatter: InboxFrontmatter, key: 'created' | 'updated') {
  return typeof frontmatter[key] === 'string' ? frontmatter[key] : ''
}

export function getBucketLabel(bucket: DocumentBucket) {
  const labels: Record<DocumentBucket, string> = {
    inbox: 'Inbox',
    collected: 'Collected',
    deleted: 'Deleted',
  }
  return labels[bucket]
}

export function toInboxDocument(params: {
  slug: string
  content: string
  created: string
  filename?: string
}): InboxDocument {
  const { frontmatter, body } = parseFrontmatter(params.content)

  return {
    slug: params.slug,
    type: detectDocumentType(params.slug),
    filename: params.filename || `${params.slug}.md`,
    created: params.created,
    frontmatter,
    body,
    raw: params.content,
  }
}
