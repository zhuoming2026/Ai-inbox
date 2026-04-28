import { parseFrontmatter, buildFrontmatter, upsertMarkdownSection } from './inbox-document'

export type SupportedAiProvider = 'openai' | 'minimax' | 'ollama'
export type EnrichStatus = 'none' | 'fetching' | 'success' | 'failed'
export type AiProcessingMode = 'off' | 'enhance'

export interface AiSettings {
  aiProvider?: string
  apiKey?: string
  model?: string
  baseUrl?: string
  aiProcessingMode?: AiProcessingMode
  aiConnectionVerified?: boolean
}

export interface EnrichmentPayload {
  title?: string
  tags?: string[]
  summaryMarkdown?: string
}

function normalizeProvider(settings: AiSettings): SupportedAiProvider {
  if (settings.aiProvider === 'ollama') return 'ollama'
  if (settings.aiProvider === 'minimax') return 'minimax'
  return 'openai'
}

function requireModel(settings: AiSettings) {
  if (!settings.model?.trim()) {
    throw new Error('请先填写模型名称')
  }
}

function buildOpenAIBaseUrl(settings: AiSettings) {
  const provider = normalizeProvider(settings)
  if (settings.baseUrl?.trim()) {
    const trimmed = settings.baseUrl.trim().replace(/\/$/, '')
    return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`
  }

  if (provider === 'openai') {
    return 'https://api.openai.com/v1/chat/completions'
  }

  throw new Error('请先填写 Base URL')
}

function buildOllamaBaseUrl(settings: AiSettings) {
  const trimmed = settings.baseUrl?.trim().replace(/\/$/, '')
  return trimmed ? `${trimmed}/api/chat` : 'http://127.0.0.1:11434/api/chat'
}

async function requestOpenAICompatible(settings: AiSettings, prompt: string, system: string) {
  requireModel(settings)
  if (!settings.apiKey?.trim()) {
    throw new Error('请先填写 API Key')
  }
  const model = settings.model!.trim()

  const response = await fetch(buildOpenAIBaseUrl(settings), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || `AI 请求失败 (${response.status})`)
  }

  const data = JSON.parse(text)
  return data?.choices?.[0]?.message?.content || ''
}

async function requestOllama(settings: AiSettings, prompt: string, system: string) {
  requireModel(settings)
  const model = settings.model!.trim()

  const response = await fetch(buildOllamaBaseUrl(settings), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      format: 'json',
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || `Ollama 请求失败 (${response.status})`)
  }

  const data = JSON.parse(text)
  return data?.message?.content || ''
}

function extractJsonObject(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('AI 返回内容不是有效 JSON')
    }
    return JSON.parse(match[0])
  }
}

async function requestJson(settings: AiSettings, prompt: string, system: string) {
  const provider = normalizeProvider(settings)
  const raw =
    provider === 'ollama'
      ? await requestOllama(settings, prompt, system)
      : await requestOpenAICompatible(settings, prompt, system)
  return extractJsonObject(raw)
}

export async function testAiConnection(settings: AiSettings) {
  const json = await requestJson(
    settings,
    '返回 JSON：{"ok": true, "message": "pong"}',
    '你是一个连接测试助手。只返回 JSON。'
  )

  if (!json?.ok) {
    throw new Error('AI 测试请求没有返回预期结果')
  }

  return {
    ok: true,
    message: typeof json.message === 'string' ? json.message : '连接成功',
  }
}

export async function enrichDocumentContent(raw: string, settings: AiSettings): Promise<EnrichmentPayload> {
  const { frontmatter, body } = parseFrontmatter(raw)
  const prompt = [
    '请根据下面的文档返回 JSON，字段仅包含 title、tags、summaryMarkdown。',
    '要求：',
    '1. 保留原始信息，不要发明事实。',
    '2. summaryMarkdown 使用 Markdown，整理要点或摘要。',
    '3. tags 返回字符串数组，最多 5 个。',
    '',
    'Frontmatter:',
    JSON.stringify(frontmatter, null, 2),
    '',
    'Body:',
    body,
  ].join('\n')

  const json = await requestJson(
    settings,
    prompt,
    '你是一个收件箱内容整理助手。你会把现有文档整理得更清晰，但不改变事实。只返回 JSON。'
  )

  return {
    title: typeof json?.title === 'string' ? json.title : undefined,
    tags: Array.isArray(json?.tags) ? json.tags.filter((tag: unknown) => typeof tag === 'string').slice(0, 5) : undefined,
    summaryMarkdown: typeof json?.summaryMarkdown === 'string' ? json.summaryMarkdown : undefined,
  }
}

export function applyEnrichmentToRaw(raw: string, enrichment: EnrichmentPayload, meta: {
  provider: string
  status: EnrichStatus
  error?: string | null
}) {
  const { frontmatter, body } = parseFrontmatter(raw)
  const nextFrontmatter: Record<string, unknown> = {
    ...frontmatter,
    updated: new Date().toISOString().split('T')[0],
    enrichStatus: meta.status,
    aiProvider: meta.provider || 'none',
  }

  if (enrichment.title) {
    nextFrontmatter.aiTitle = enrichment.title
    nextFrontmatter.title = enrichment.title
    nextFrontmatter.titleSource = 'ai'
  }
  if (enrichment.tags?.length) nextFrontmatter.tags = enrichment.tags

  if (meta.error) {
    nextFrontmatter.enrichError = meta.error
  } else {
    delete nextFrontmatter.enrichError
  }

  let nextBody = body
  if (enrichment.summaryMarkdown) {
    nextBody = upsertMarkdownSection(body, 'AI 总结', enrichment.summaryMarkdown)
  }

  return buildFrontmatter(nextFrontmatter, nextBody)
}
