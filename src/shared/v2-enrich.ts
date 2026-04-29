export type V2EnrichTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface V2EnrichTask {
  id: string
  url: string
  instruction: string
  platform: 'generic'
  status: V2EnrichTaskStatus
  createdAt: string
  updatedAt: string
  startedAt?: string
  finishedAt?: string
  error?: string
  outputPath?: string
  outputTitle?: string
  fromPath?: string
}

export interface V2EnrichTaskFile {
  version: 1
  tasks: V2EnrichTask[]
}

export interface V2EnrichCreateTaskInput {
  url: string
  instruction: string
  fromPath?: string
}

export interface V2EnrichSaveAsArticleInput {
  outputPath: string
  workspaceId: string
  filename: string
}

export interface V2EnrichGenericContent {
  title: string
  sourceUrl: string
  createdAt: string
  instruction: string
  summary: string
  excerpt: string
}

export const V2_ENRICH_TASK_FILE_VERSION = 1

export function createEmptyV2EnrichTaskFile(): V2EnrichTaskFile {
  return {
    version: V2_ENRICH_TASK_FILE_VERSION,
    tasks: [],
  }
}

export function normalizeV2EnrichTaskFile(input: unknown): V2EnrichTaskFile {
  if (!input || typeof input !== 'object') return createEmptyV2EnrichTaskFile()
  const maybe = input as Partial<V2EnrichTaskFile>
  const tasks = Array.isArray(maybe.tasks) ? maybe.tasks.map(normalizeTask).filter(Boolean) : []
  return {
    version: V2_ENRICH_TASK_FILE_VERSION,
    tasks: tasks as V2EnrichTask[],
  }
}

export function normalizeV2EnrichCreateTaskInput(input: V2EnrichCreateTaskInput): V2EnrichCreateTaskInput {
  const url = input.url.trim()
  if (!url) throw new Error('请输入 URL')
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('仅支持 http/https URL')
  }
  return {
    url: parsed.toString(),
    instruction: input.instruction.trim(),
    fromPath: input.fromPath?.trim() || undefined,
  }
}

export function buildGenericEnrichMarkdown(content: V2EnrichGenericContent): string {
  return [
    `# ${content.title || 'Untitled'}`,
    '',
    `Source: ${content.sourceUrl}`,
    `Created: ${content.createdAt}`,
    '',
    '## Instruction',
    '',
    content.instruction || 'No instruction provided.',
    '',
    '## Summary',
    '',
    content.summary || 'No summary available.',
    '',
    '## Raw Excerpt',
    '',
    content.excerpt || 'No excerpt available.',
    '',
  ].join('\n')
}

export function createSafeEnrichOutputFilename(title: string, createdAt: string): string {
  const stamp = createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)
  const slug = (title || 'generic-link')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'generic-link'
  return `${slug}-${stamp}.md`
}

function normalizeTask(input: unknown): V2EnrichTask | null {
  if (!input || typeof input !== 'object') return null
  const task = input as Partial<V2EnrichTask>
  if (typeof task.id !== 'string' || typeof task.url !== 'string') return null
  const status = isTaskStatus(task.status) ? task.status : 'queued'
  const createdAt = typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString()
  const updatedAt = typeof task.updatedAt === 'string' ? task.updatedAt : createdAt
  return {
    id: task.id,
    url: task.url,
    instruction: typeof task.instruction === 'string' ? task.instruction : '',
    platform: 'generic',
    status,
    createdAt,
    updatedAt,
    startedAt: typeof task.startedAt === 'string' ? task.startedAt : undefined,
    finishedAt: typeof task.finishedAt === 'string' ? task.finishedAt : undefined,
    error: typeof task.error === 'string' ? task.error : undefined,
    outputPath: typeof task.outputPath === 'string' ? task.outputPath : undefined,
    outputTitle: typeof task.outputTitle === 'string' ? task.outputTitle : undefined,
    fromPath: typeof task.fromPath === 'string' ? task.fromPath : undefined,
  }
}

function isTaskStatus(status: unknown): status is V2EnrichTaskStatus {
  return status === 'queued' || status === 'running' || status === 'succeeded' || status === 'failed'
}
