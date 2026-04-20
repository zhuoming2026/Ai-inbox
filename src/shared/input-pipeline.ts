import { buildFrontmatter, parseFrontmatter } from './inbox-document'
import type { AiProcessingMode, EnrichStatus } from './ai-enrichment'

export type RawInputType = 'text' | 'url' | 'image'
export type PipelineDocumentType = 'note' | 'todo' | 'link' | 'image' | 'research'
export type ParseMode = 'deterministic' | 'ai_enriched' | 'fallback'

export interface PipelineSettings {
  aiProvider?: string
  apiKey?: string
  model?: string
  baseUrl?: string
  aiProcessingMode?: AiProcessingMode
  aiConnectionVerified?: boolean
}

export interface PipelineInput {
  type?: string
  content: string
  source?: 'app' | 'mcp'
}

export interface PipelineDeps {
  now?: Date
  settings?: PipelineSettings
  readDocument(slug: string): string | null
  writeDocument(slug: string, raw: string): void
}

export interface PipelineResult {
  slug: string
  parseMode: ParseMode
  enrichStatus: EnrichStatus
  documentType: PipelineDocumentType
}

interface ClassificationResult {
  rawInputType: RawInputType
  documentType: PipelineDocumentType
  normalizedContent: string
}

interface PersistedDraft {
  slug: string
  frontmatter: Record<string, unknown>
  body: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item'
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function detectRawInputType(typeHint: string | undefined, content: string): RawInputType {
  if (typeHint === 'image') return 'image'
  const trimmed = content.trim()
  if (/^https?:\/\//i.test(trimmed)) return 'url'
  return 'text'
}

function classifyInput(input: PipelineInput): ClassificationResult {
  const trimmed = input.content.trim()
  const rawInputType = detectRawInputType(input.type, trimmed)

  if (input.type === 'todo' || /^todo\s+/i.test(trimmed)) {
    return { rawInputType: 'text', documentType: 'todo', normalizedContent: trimmed.replace(/^todo\s+/i, '').trim() }
  }

  if (input.type === 'research' || /^研究\s+/u.test(trimmed)) {
    return { rawInputType: 'text', documentType: 'research', normalizedContent: trimmed.replace(/^研究\s+/u, '').trim() }
  }

  if (input.type === 'note' || /^记录\s+/u.test(trimmed)) {
    return { rawInputType: 'text', documentType: 'note', normalizedContent: trimmed.replace(/^记录\s+/u, '').trim() }
  }

  if (rawInputType === 'url') {
    return { rawInputType, documentType: 'link', normalizedContent: trimmed }
  }

  if (rawInputType === 'image') {
    return { rawInputType, documentType: 'image', normalizedContent: trimmed }
  }

  return { rawInputType, documentType: 'note', normalizedContent: trimmed }
}

function getInitialEnrichStatus(settings?: PipelineSettings): EnrichStatus {
  return settings?.aiProcessingMode === 'enhance' && settings?.aiConnectionVerified ? 'fetching' : 'none'
}

function baseFrontmatter(params: {
  type: PipelineDocumentType
  title: string
  today: string
  source: 'app' | 'mcp'
  rawInputType: RawInputType
  parseMode?: ParseMode
  enrichStatus?: EnrichStatus
  aiProvider?: string
  enrichError?: string
}) {
  const frontmatter: Record<string, unknown> = {
    type: params.type,
    title: params.title || 'Untitled',
    created: params.today,
    updated: params.today,
    tags: [params.type],
    source: params.source,
    parseMode: params.parseMode || 'deterministic',
    enrichStatus: params.enrichStatus || 'none',
    aiProvider: params.aiProvider || 'none',
    rawInputType: params.rawInputType,
  }

  if (params.enrichError) {
    frontmatter.enrichError = params.enrichError
  }

  return frontmatter
}

function createDraft(classification: ClassificationResult, input: PipelineInput, now: Date, deps: PipelineDeps): PersistedDraft {
  const today = formatDate(now)
  const source = input.source || 'app'
  const enrichStatus = getInitialEnrichStatus(deps.settings)
  const aiProvider = enrichStatus === 'fetching' ? deps.settings?.aiProvider || 'none' : 'none'

  switch (classification.documentType) {
    case 'todo': {
      if (!classification.normalizedContent) {
        throw new Error('TODO 内容不能为空')
      }
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const slug = `todo-${month}`
      const line = `- [ ] ${classification.normalizedContent}`
      const existing = deps.readDocument(slug)

      if (!existing) {
        return {
          slug,
          frontmatter: baseFrontmatter({
            type: 'todo',
            title: `Todo ${month}`,
            today,
            source,
            rawInputType: classification.rawInputType,
            enrichStatus,
            aiProvider,
          }),
          body: ['## Content', '', line].join('\n'),
        }
      }

      const { frontmatter, body } = parseFrontmatter(existing)
      return {
        slug,
        frontmatter: {
          ...frontmatter,
          updated: today,
          parseMode: 'deterministic',
          enrichStatus,
          aiProvider,
          rawInputType: classification.rawInputType,
        },
        body: `${body.trim()}\n${line}\n`,
      }
    }
    case 'link': {
      const parsed = new URL(classification.normalizedContent)
      const title = parsed.hostname.replace(/^www\./, '') || classification.normalizedContent
      return {
        slug: `link-${Date.now()}-${slugify(title)}`,
        frontmatter: baseFrontmatter({
          type: 'link',
          title,
          today,
          source,
          rawInputType: classification.rawInputType,
          enrichStatus,
          aiProvider,
        }),
        body: [
          '## Content',
          '',
          `来源链接：${classification.normalizedContent}`,
          '',
          `域名：${parsed.hostname}`,
          '',
          '## Raw',
          '',
          `[打开原文](${classification.normalizedContent})`,
        ].join('\n'),
      }
    }
    case 'research':
    case 'note': {
      if (!classification.normalizedContent) {
        throw new Error('输入内容不能为空')
      }
      const title = classification.normalizedContent.split('\n')[0].slice(0, 50)
      return {
        slug: `${classification.documentType}-${Date.now()}-${slugify(title)}`,
        frontmatter: baseFrontmatter({
          type: classification.documentType,
          title,
          today,
          source,
          rawInputType: classification.rawInputType,
          enrichStatus,
          aiProvider,
        }),
        body: ['## Content', '', classification.normalizedContent].join('\n'),
      }
    }
    case 'image': {
      const title = classification.normalizedContent.slice(0, 50) || `Image ${today}`
      return {
        slug: `image-${Date.now()}-${slugify(title)}`,
        frontmatter: baseFrontmatter({
          type: 'image',
          title,
          today,
          source,
          rawInputType: classification.rawInputType,
          enrichStatus,
          aiProvider,
        }),
        body: [
          '## Content',
          '',
          classification.normalizedContent || '图片已收件，等待后续 OCR/描述增强。',
        ].join('\n'),
      }
    }
  }
}

function createFallbackDraft(input: PipelineInput, now: Date, error: unknown): PersistedDraft {
  const today = formatDate(now)
  const message = error instanceof Error ? error.message : 'Unknown pipeline error'
  const rawContent = input.content.trim() || 'Untitled'

  return {
    slug: `note-${Date.now()}-${slugify(rawContent)}`,
    frontmatter: baseFrontmatter({
      type: 'note',
      title: rawContent.split('\n')[0].slice(0, 50) || 'Untitled',
      today,
      source: input.source || 'app',
      rawInputType: detectRawInputType(input.type, input.content),
      parseMode: 'fallback',
      enrichStatus: 'failed',
      aiProvider: 'none',
      enrichError: message,
    }),
    body: ['## Content', '', input.content].join('\n'),
  }
}

export async function processInputPipeline(input: PipelineInput, deps: PipelineDeps): Promise<PipelineResult> {
  const now = deps.now || new Date()

  let draft: PersistedDraft
  let documentType: PipelineDocumentType
  let parseMode: ParseMode = 'deterministic'
  let enrichStatus: EnrichStatus = getInitialEnrichStatus(deps.settings)

  try {
    const classification = classifyInput(input)
    documentType = classification.documentType
    draft = createDraft(classification, input, now, deps)
  } catch (error) {
    draft = createFallbackDraft(input, now, error)
    documentType = 'note'
    parseMode = 'fallback'
    enrichStatus = 'failed'
  }

  deps.writeDocument(draft.slug, buildFrontmatter(draft.frontmatter, draft.body))

  return {
    slug: draft.slug,
    parseMode,
    enrichStatus,
    documentType,
  }
}
