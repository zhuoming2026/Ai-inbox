import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { basename, dirname, extname, relative, resolve, join } from 'path'
import { homedir } from 'os'
import fs from 'fs'
import chokidar, { type FSWatcher } from 'chokidar'
import { randomUUID } from 'crypto'
import { buildFrontmatter, parseFrontmatter, toInboxDocument } from './src/shared/inbox-document'
import { applyEnrichmentToRaw, enrichDocumentContent, testAiConnection, type AiSettings } from './src/shared/ai-enrichment'
import {
  createDefaultCardMetadata,
  createEmptyCardMetadataFile,
  normalizeCardMetadataFile,
} from './src/shared/v2-card-metadata'
import {
  createInboxFilename,
  detectCaptureKind,
  extractMarkdownCardTitle,
  extractMarkdownPreview,
} from './src/shared/v2-markdown'
import {
  buildGenericEnrichMarkdown,
  createEmptyV2EnrichTaskFile,
  createSafeEnrichOutputFilename,
  normalizeV2EnrichCreateTaskInput,
  normalizeV2EnrichTaskFile,
  type V2EnrichCreateTaskInput,
  type V2EnrichGenericContent,
  type V2EnrichSaveAsArticleInput,
  type V2EnrichTask,
  type V2EnrichTaskFile,
} from './src/shared/v2-enrich'
import type { CardMetadataFile, V2CardKind, V2InboxCard } from './src/shared/v2-types'
import type {
  WorkspaceAddInput,
  WorkspaceConfig,
  WorkspaceCreateFileInput,
  WorkspaceFileMutationResult,
  WorkspaceFileTreeNode,
  WorkspaceListResult,
  WorkspaceRenameFileInput,
  WorkspaceTreeResult,
  WorkspaceUpdateInput,
} from './src/shared/v2-workspace'
import {
  BUILTIN_ENRICH_OUTPUTS_WORKSPACE_ID,
  BUILTIN_INBOX_WORKSPACE_ID,
} from './src/shared/v2-workspace'

type AppSettings = {
  inboxPath: string
  archivePath: string
  mcpHttpPort: number
  aiProvider: string
  apiKey: string
  model: string
  baseUrl: string
  aiProcessingMode: 'off' | 'enhance'
  aiConnectionVerified: boolean
  theme: string
  activeWorkspaceId: string
  workspaces: WorkspaceConfig[]
}

const settingsFile = join(homedir(), '.ai-inbox-app.dev.json')

const defaultSettings: AppSettings = {
  inboxPath: '~/ai-inbox',
  archivePath: '~/lzm/llm-wiki/MyNote',
  mcpHttpPort: 3100,
  aiProvider: 'minimax',
  apiKey: '',
  model: '',
  baseUrl: '',
  aiProcessingMode: 'off',
  aiConnectionVerified: false,
  theme: 'system',
  activeWorkspaceId: BUILTIN_INBOX_WORKSPACE_ID,
  workspaces: [],
}

function resolveHomePath(input: string): string {
  return input.startsWith('~/') ? join(homedir(), input.slice(2)) : input
}

function getSettings(): AppSettings {
  if (!fs.existsSync(settingsFile)) return { ...defaultSettings }

  try {
    const parsed = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
    return { ...defaultSettings, ...parsed }
  } catch {
    return { ...defaultSettings }
  }
}

function saveSettings(nextSettings: Partial<AppSettings>): AppSettings {
  const merged = { ...getSettings(), ...nextSettings }
  fs.writeFileSync(settingsFile, JSON.stringify(merged, null, 2), 'utf-8')
  return merged
}

function getInboxPath(): string {
  return resolveHomePath(getSettings().inboxPath)
}

function getAiInboxRoot(): string {
  return getInboxPath()
}

function getV2InboxPath(): string {
  return join(getAiInboxRoot(), 'inbox')
}

function getMetadataPath(): string {
  return join(getAiInboxRoot(), 'metadata')
}

function getCardsMetadataPath(): string {
  return join(getMetadataPath(), 'cards.json')
}

function getEnrichOutputsPath(): string {
  return join(getAiInboxRoot(), 'enrich', 'outputs')
}

function getEnrichPath(): string {
  return join(getAiInboxRoot(), 'enrich')
}

function getEnrichTasksPath(): string {
  return join(getEnrichPath(), 'tasks.json')
}

function createBuiltinWorkspaces(): WorkspaceConfig[] {
  const now = new Date().toISOString()
  return [
    {
      id: BUILTIN_INBOX_WORKSPACE_ID,
      name: 'Inbox',
      path: getV2InboxPath(),
      kind: 'builtin',
      enabled: true,
      readonly: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: BUILTIN_ENRICH_OUTPUTS_WORKSPACE_ID,
      name: 'Enrich Output',
      path: getEnrichOutputsPath(),
      kind: 'builtin',
      enabled: true,
      readonly: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function readUserWorkspaces(): WorkspaceConfig[] {
  return getSettings().workspaces
    .filter((workspace) => workspace.kind === 'user')
    .map((workspace) => ({
      ...workspace,
      path: resolveHomePath(workspace.path),
      kind: 'user',
      enabled: workspace.enabled !== false,
      readonly: false,
    }))
}

function writeUserWorkspaces(workspaces: WorkspaceConfig[]) {
  saveSettings({ workspaces: workspaces.filter((workspace) => workspace.kind === 'user') })
}

function listWorkspaces(): WorkspaceListResult {
  ensureV2Directories()
  const items = [...createBuiltinWorkspaces(), ...readUserWorkspaces()]
  const activeWorkspaceId = getSettings().activeWorkspaceId || BUILTIN_INBOX_WORKSPACE_ID
  return {
    items,
    activeWorkspaceId: items.some((workspace) => workspace.id === activeWorkspaceId)
      ? activeWorkspaceId
      : BUILTIN_INBOX_WORKSPACE_ID,
  }
}

function addWorkspace(input: WorkspaceAddInput): WorkspaceConfig {
  const workspacePath = resolveHomePath(input.path)
  if (!fs.existsSync(workspacePath) || !fs.statSync(workspacePath).isDirectory()) {
    throw new Error('请选择有效的 Markdown 文件夹')
  }

  const now = new Date().toISOString()
  const workspace: WorkspaceConfig = {
    id: `user:${randomUUID()}`,
    name: input.name?.trim() || basename(workspacePath) || 'Workspace',
    path: workspacePath,
    kind: 'user',
    enabled: true,
    readonly: false,
    createdAt: now,
    updatedAt: now,
  }
  writeUserWorkspaces([...readUserWorkspaces(), workspace])
  saveSettings({ activeWorkspaceId: workspace.id })
  return workspace
}

function updateWorkspace(id: string, patch: WorkspaceUpdateInput): WorkspaceConfig {
  const workspaces = readUserWorkspaces()
  const current = workspaces.find((workspace) => workspace.id === id)
  if (!current) throw new Error('内置 workspace 不支持修改')

  const nextPath = patch.path ? resolveHomePath(patch.path) : current.path
  if (patch.path && (!fs.existsSync(nextPath) || !fs.statSync(nextPath).isDirectory())) {
    throw new Error('请选择有效的 Markdown 文件夹')
  }

  const nextWorkspace = {
    ...current,
    name: patch.name?.trim() || current.name,
    path: nextPath,
    enabled: patch.enabled ?? current.enabled,
    updatedAt: new Date().toISOString(),
  }
  writeUserWorkspaces(workspaces.map((workspace) => workspace.id === id ? nextWorkspace : workspace))
  return nextWorkspace
}

function removeWorkspace(id: string) {
  const workspaces = readUserWorkspaces()
  if (!workspaces.some((workspace) => workspace.id === id)) {
    throw new Error('内置 workspace 不支持移除')
  }
  writeUserWorkspaces(workspaces.filter((workspace) => workspace.id !== id))
  if (getSettings().activeWorkspaceId === id) {
    saveSettings({ activeWorkspaceId: BUILTIN_INBOX_WORKSPACE_ID })
  }
}

function isPathInside(parentPath: string, childPath: string) {
  const rel = relative(resolve(parentPath), resolve(childPath))
  return rel === '' || (!!rel && !rel.startsWith('..') && !rel.startsWith('/'))
}

function isSafeMarkdownFile(filepath: string) {
  return extname(filepath).toLowerCase() === '.md'
}

function findWorkspaceForPath(filepath: string) {
  const resolvedPath = resolve(filepath)
  return listWorkspaces().items.find((workspace) =>
    workspace.enabled && isPathInside(workspace.path, resolvedPath)
  )
}

function getWritableWorkspace(workspaceId: string): WorkspaceConfig {
  const workspace = listWorkspaces().items.find((item) => item.id === workspaceId)
  if (!workspace || !workspace.enabled) throw new Error('Workspace 未启用')
  if (workspace.readonly || workspace.kind !== 'user') throw new Error('内置 workspace 暂不支持文件管理操作')
  return workspace
}

function getWritableWorkspaceForFile(filepath: string): WorkspaceConfig {
  const workspace = findWorkspaceForPath(filepath)
  if (!workspace || !workspace.enabled || !isSafeMarkdownFile(filepath)) throw new Error('文件不属于已启用 workspace')
  if (workspace.readonly || workspace.kind !== 'user') throw new Error('内置 workspace 暂不支持文件管理操作')
  return workspace
}

function normalizeMarkdownFilename(filename: string): string {
  const trimmed = filename.trim()
  if (!trimmed) throw new Error('请输入文件名')
  const withExtension = trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`
  if (withExtension.startsWith('.')) throw new Error('文件名不能以 . 开头')
  if (withExtension.includes('/') || withExtension.includes('\\') || basename(withExtension) !== withExtension) {
    throw new Error('文件名不能包含路径')
  }
  if (!isSafeMarkdownFile(withExtension)) throw new Error('只支持 Markdown 文件')
  return withExtension
}

function createWorkspaceMarkdownFile(input: WorkspaceCreateFileInput): WorkspaceFileMutationResult {
  const workspace = getWritableWorkspace(input.workspaceId)
  const filename = normalizeMarkdownFilename(input.filename)
  const filepath = resolve(workspace.path, filename)
  if (!isPathInside(workspace.path, filepath)) throw new Error('文件路径超出 workspace')
  if (fs.existsSync(filepath)) throw new Error('文件已存在')
  fs.writeFileSync(filepath, '', 'utf-8')
  return { path: filepath }
}

function renameWorkspaceMarkdownFile(input: WorkspaceRenameFileInput): WorkspaceFileMutationResult {
  const sourcePath = resolve(input.path)
  const workspace = getWritableWorkspaceForFile(sourcePath)
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) throw new Error('文件不存在')
  const filename = normalizeMarkdownFilename(input.filename)
  const nextPath = resolve(dirname(sourcePath), filename)
  if (!isPathInside(workspace.path, nextPath) || !isSafeMarkdownFile(nextPath)) throw new Error('文件路径超出 workspace')
  if (sourcePath === nextPath) return { path: sourcePath }
  if (fs.existsSync(nextPath)) throw new Error('目标文件已存在')
  fs.renameSync(sourcePath, nextPath)
  return { path: nextPath }
}

function deleteWorkspaceMarkdownFile(filepath: string) {
  const resolvedPath = resolve(filepath)
  getWritableWorkspaceForFile(resolvedPath)
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) throw new Error('文件不存在')
  fs.unlinkSync(resolvedPath)
}

function readWorkspaceDirectory(rootPath: string, dirPath: string, depth: number): WorkspaceFileTreeNode[] {
  if (!fs.existsSync(dirPath) || depth > 8) return []

  const nodes: WorkspaceFileTreeNode[] = []
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const filepath = join(dirPath, entry.name)
    const relativePath = relative(rootPath, filepath)

    if (entry.isDirectory()) {
      const children = readWorkspaceDirectory(rootPath, filepath, depth + 1)
      if (children.length) {
        nodes.push({ id: filepath, name: entry.name, path: filepath, relativePath, type: 'directory', children })
      }
      continue
    }

    if (!entry.isFile() || !isSafeMarkdownFile(filepath)) continue
    const stats = fs.statSync(filepath)
    nodes.push({
      id: filepath,
      name: entry.name,
      path: filepath,
      relativePath,
      type: 'file',
      updatedAt: stats.mtime.toISOString(),
    })
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function readWorkspaceTree(workspaceId?: string): WorkspaceTreeResult[] {
  return listWorkspaces().items
    .filter((workspace) => workspace.enabled && (!workspaceId || workspace.id === workspaceId))
    .map((workspace) => ({
      workspaceId: workspace.id,
      rootPath: workspace.path,
      nodes: readWorkspaceDirectory(workspace.path, workspace.path, 0),
    }))
}

function readWorkspaceMarkdownFile(filepath: string) {
  const resolvedPath = resolve(filepath)
  const workspace = findWorkspaceForPath(resolvedPath)
  if (!workspace || !isSafeMarkdownFile(resolvedPath)) throw new Error('文件不属于已启用 workspace')
  if (!fs.existsSync(resolvedPath)) return null
  return fs.readFileSync(resolvedPath, 'utf-8')
}

function writeWorkspaceMarkdownFile(filepath: string, raw: string) {
  const resolvedPath = resolve(filepath)
  const workspace = findWorkspaceForPath(resolvedPath)
  if (!workspace || !isSafeMarkdownFile(resolvedPath)) throw new Error('文件不属于已启用 workspace')
  if (!fs.existsSync(resolvedPath)) throw new Error('文件不存在')
  fs.writeFileSync(resolvedPath, raw, 'utf-8')
}

function getArchivePath(): string {
  return resolveHomePath(getSettings().archivePath)
}

function getAiSettings(): AiSettings {
  const settings = getSettings()
  return {
    aiProvider: settings.aiProvider,
    apiKey: settings.apiKey,
    model: settings.model,
    baseUrl: settings.baseUrl,
    aiProcessingMode: settings.aiProcessingMode,
    aiConnectionVerified: settings.aiConnectionVerified,
  }
}

function getScratchpadPath() {
  return join(homedir(), '.ai-inbox-app-dev-scratchpad.md')
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function ensureV2Directories() {
  for (const dirPath of [getAiInboxRoot(), getV2InboxPath(), getMetadataPath(), getEnrichPath(), getEnrichOutputsPath()]) {
    ensureDir(dirPath)
  }
}

function readEnrichTaskFile(): V2EnrichTaskFile {
  ensureV2Directories()
  const filepath = getEnrichTasksPath()
  if (!fs.existsSync(filepath)) return createEmptyV2EnrichTaskFile()
  try {
    return normalizeV2EnrichTaskFile(JSON.parse(fs.readFileSync(filepath, 'utf-8')))
  } catch {
    return createEmptyV2EnrichTaskFile()
  }
}

function writeEnrichTaskFile(file: V2EnrichTaskFile) {
  ensureV2Directories()
  fs.writeFileSync(getEnrichTasksPath(), JSON.stringify(file, null, 2), 'utf-8')
}

function listEnrichTasks(): V2EnrichTask[] {
  return readEnrichTaskFile().tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function createEnrichTask(input: V2EnrichCreateTaskInput): V2EnrichTask {
  const normalized = normalizeV2EnrichCreateTaskInput(input)
  const now = new Date().toISOString()
  const task: V2EnrichTask = {
    id: `enrich:${randomUUID()}`,
    url: normalized.url,
    instruction: normalized.instruction,
    platform: 'generic',
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    fromPath: normalized.fromPath,
  }
  const file = readEnrichTaskFile()
  file.tasks.unshift(task)
  writeEnrichTaskFile(file)
  return task
}

function updateEnrichTask(id: string, updater: (task: V2EnrichTask) => V2EnrichTask): V2EnrichTask {
  const file = readEnrichTaskFile()
  const index = file.tasks.findIndex((task) => task.id === id)
  if (index < 0) throw new Error('任务不存在')
  const nextTask = updater(file.tasks[index])
  file.tasks[index] = nextTask
  writeEnrichTaskFile(file)
  return nextTask
}

async function fetchGenericLinkContent(task: V2EnrichTask): Promise<V2EnrichGenericContent> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(task.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AI-inbox/1.0 GenericLinkEnrich',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
    })
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)
    const html = await response.text()
    const title = extractHtmlTitle(html) || new URL(task.url).hostname
    const description = extractMetaDescription(html)
    const text = htmlToReadableText(html)
    const excerpt = text.slice(0, 2400)
    return {
      title,
      sourceUrl: task.url,
      createdAt: new Date().toISOString(),
      instruction: task.instruction,
      summary: description || excerpt.slice(0, 900) || `Fetched ${task.url}`,
      excerpt,
    }
  } finally {
    clearTimeout(timer)
  }
}

function extractHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? decodeHtmlEntities(match[1]).trim().replace(/\s+/g, ' ') : ''
}

function extractMetaDescription(html: string) {
  const match = html.match(/<meta\s+[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*>/i)
  return match ? decodeHtmlEntities(match[1]).trim().replace(/\s+/g, ' ') : ''
}

function htmlToReadableText(html: string) {
  return decodeHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

async function runEnrichTask(id: string): Promise<V2EnrichTask> {
  const startedAt = new Date().toISOString()
  const runningTask = updateEnrichTask(id, (task) => ({
    ...task,
    status: 'running',
    startedAt,
    updatedAt: startedAt,
    error: undefined,
  }))

  try {
    const content = await fetchGenericLinkContent(runningTask)
    const markdown = buildGenericEnrichMarkdown(content)
    let filename = createSafeEnrichOutputFilename(content.title, content.createdAt)
    let outputPath = join(getEnrichOutputsPath(), filename)
    let suffix = 1
    while (fs.existsSync(outputPath)) {
      filename = filename.replace(/\.md$/i, `-${suffix}.md`)
      outputPath = join(getEnrichOutputsPath(), filename)
      suffix += 1
    }
    fs.writeFileSync(outputPath, markdown, 'utf-8')
    const finishedAt = new Date().toISOString()
    return updateEnrichTask(id, (task) => ({
      ...task,
      status: 'succeeded',
      updatedAt: finishedAt,
      finishedAt,
      error: undefined,
      outputPath,
      outputTitle: content.title,
    }))
  } catch (error) {
    const finishedAt = new Date().toISOString()
    const message = error instanceof Error ? error.message : 'Generic link enrich failed'
    return updateEnrichTask(id, (task) => ({
      ...task,
      status: 'failed',
      updatedAt: finishedAt,
      finishedAt,
      error: message,
    }))
  }
}

function retryEnrichTask(id: string) {
  updateEnrichTask(id, (task) => ({
    ...task,
    status: 'queued',
    updatedAt: new Date().toISOString(),
    startedAt: undefined,
    finishedAt: undefined,
    error: undefined,
  }))
  return runEnrichTask(id)
}

function deleteEnrichTask(id: string) {
  const file = readEnrichTaskFile()
  const nextTasks = file.tasks.filter((task) => task.id !== id)
  if (nextTasks.length === file.tasks.length) throw new Error('任务不存在')
  writeEnrichTaskFile({ ...file, tasks: nextTasks })
}

function readEnrichOutput(filepath: string) {
  const resolvedPath = resolve(filepath)
  if (!isPathInside(getEnrichOutputsPath(), resolvedPath) || !isSafeMarkdownFile(resolvedPath)) {
    throw new Error('文件不属于 Enrich Output')
  }
  if (!fs.existsSync(resolvedPath)) return null
  return fs.readFileSync(resolvedPath, 'utf-8')
}

function saveEnrichOutputAsArticle(input: V2EnrichSaveAsArticleInput): WorkspaceFileMutationResult {
  const raw = readEnrichOutput(input.outputPath)
  if (typeof raw !== 'string') throw new Error('输出文件不存在')
  const result = createWorkspaceMarkdownFile({
    workspaceId: input.workspaceId,
    filename: input.filename,
  })
  fs.writeFileSync(result.path, raw, 'utf-8')
  return result
}

function readCardMetadataFile(): CardMetadataFile {
  ensureV2Directories()
  const filepath = getCardsMetadataPath()
  if (!fs.existsSync(filepath)) return createEmptyCardMetadataFile()

  try {
    return normalizeCardMetadataFile(JSON.parse(fs.readFileSync(filepath, 'utf-8')))
  } catch {
    return createEmptyCardMetadataFile()
  }
}

function writeCardMetadataFile(file: CardMetadataFile) {
  ensureV2Directories()
  fs.writeFileSync(getCardsMetadataPath(), JSON.stringify(file, null, 2), 'utf-8')
}

function getMetadataKey(filename: string) {
  return basename(filename)
}

function ensureCardMetadataForFile(params: {
  filename: string
  createdAt: string
  updatedAt: string
  kind?: V2CardKind
}) {
  const metadata = readCardMetadataFile()
  const key = getMetadataKey(params.filename)
  if (!metadata.items[key]) {
    metadata.items[key] = createDefaultCardMetadata({
      kind: params.kind,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    })
    writeCardMetadataFile(metadata)
  }
  return metadata.items[key]
}

function readScratchpad() {
  const filepath = getScratchpadPath()
  if (!fs.existsSync(filepath)) return ''
  return fs.readFileSync(filepath, 'utf-8')
}

function writeScratchpad(content: string) {
  fs.writeFileSync(getScratchpadPath(), content, 'utf-8')
}

function listInbox() {
  ensureV2Directories()
  const seen = new Set<string>()
  const entries: Array<{ filepath: string; filename: string }> = []

  for (const dirPath of [getV2InboxPath(), getAiInboxRoot()]) {
    if (!fs.existsSync(dirPath)) continue
    for (const filename of fs.readdirSync(dirPath).filter((file) => file.endsWith('.md'))) {
      if (seen.has(filename)) continue
      seen.add(filename)
      entries.push({ filepath: join(dirPath, filename), filename })
    }
  }

  return entries
    .map(({ filepath, filename }) => {
      const stats = fs.statSync(filepath)
      const raw = fs.readFileSync(filepath, 'utf-8')
      const slug = filename.replace('.md', '')
      const title = extractMarkdownCardTitle(raw)
      const metadata = ensureCardMetadataForFile({
        filename,
        createdAt: stats.birthtime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
      })
      return {
        id: filename,
        slug,
        filename,
        path: filepath,
        title,
        hasTitle: Boolean(title),
        preview: extractMarkdownPreview(raw),
        kind: metadata.kind,
        type: metadata.kind,
        bucket: metadata.bucket,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        created: metadata.createdAt.split('T')[0],
        raw,
        tags: [],
        enrichStatus: 'none',
      } satisfies V2InboxCard
    })
    .sort((a, b) => (b.created > a.created ? 1 : -1))
}

function readInboxFile(slug: string) {
  const filepath = getInboxFilePath(slug)
  if (!fs.existsSync(filepath)) return null
  const stats = fs.statSync(filepath)
  const filename = filepath.split('/').pop() || `${slug}.md`
  const content = fs.readFileSync(filepath, 'utf-8')
  return toInboxDocument({
    slug: filename.replace('.md', ''),
    filename,
    content,
    created: stats.birthtime.toISOString(),
  })
}

function readInboxRawFile(slug: string) {
  const filepath = getInboxFilePath(slug)
  if (!fs.existsSync(filepath)) return null
  return fs.readFileSync(filepath, 'utf-8')
}

function getInboxFilePath(slug: string) {
  const filename = slug.endsWith('.md') ? slug : `${slug}.md`
  const v2Path = join(getV2InboxPath(), filename)
  if (fs.existsSync(v2Path)) return v2Path

  const legacyPath = join(getAiInboxRoot(), filename)
  if (fs.existsSync(legacyPath)) return legacyPath

  return v2Path
}

function setDocumentEnrichStatus(slug: string, status: 'none' | 'fetching' | 'success' | 'failed', error?: string | null) {
  const filepath = getInboxFilePath(slug)
  if (!fs.existsSync(filepath)) return
  const raw = fs.readFileSync(filepath, 'utf-8')
  const { frontmatter, body } = parseFrontmatter(raw)
  const nextFrontmatter: Record<string, unknown> = {
    ...frontmatter,
    updated: new Date().toISOString().split('T')[0],
    enrichStatus: status,
  }
  if (error) {
    nextFrontmatter.enrichError = error
  } else {
    delete nextFrontmatter.enrichError
  }
  fs.writeFileSync(filepath, buildFrontmatter(nextFrontmatter, body), 'utf-8')
}

function setDocumentBucket(slug: string, bucket: 'inbox' | 'collected' | 'deleted') {
  const filepath = getInboxFilePath(slug)
  if (!fs.existsSync(filepath)) return
  const stats = fs.statSync(filepath)
  const key = getMetadataKey(basename(filepath))
  const metadata = readCardMetadataFile()
  const current = metadata.items[key] || createDefaultCardMetadata({
    createdAt: stats.birthtime.toISOString(),
    updatedAt: stats.mtime.toISOString(),
  })
  metadata.items[key] = {
    ...current,
    bucket,
    updatedAt: new Date().toISOString(),
  }
  writeCardMetadataFile(metadata)
}

async function enrichDocumentBySlug(slug: string) {
  const filepath = getInboxFilePath(slug)
  if (!fs.existsSync(filepath)) {
    throw new Error('文件不存在')
  }

  const settings = getAiSettings()
  if (!settings.aiConnectionVerified) {
    throw new Error('AI 尚未通过测试，请先在设置页测试连接')
  }

  setDocumentEnrichStatus(slug, 'fetching')

  try {
    const raw = fs.readFileSync(filepath, 'utf-8')
    const enrichment = await enrichDocumentContent(raw, settings)
    const nextRaw = applyEnrichmentToRaw(raw, enrichment, {
      provider: settings.aiProvider || 'none',
      status: 'success',
    })
    fs.writeFileSync(filepath, nextRaw, 'utf-8')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI enrich failed'
    setDocumentEnrichStatus(slug, 'failed', message)
    throw error
  }
}

function updateInboxFile(slug: string, data: { frontmatter?: Record<string, unknown>; body?: string }) {
  const filepath = getInboxFilePath(slug)
  if (!fs.existsSync(filepath)) return false

  const current = fs.readFileSync(filepath, 'utf-8')
  const { frontmatter, body } = parseFrontmatter(current)
  fs.writeFileSync(
    filepath,
    buildFrontmatter({ ...frontmatter, ...(data.frontmatter || {}) }, data.body ?? body),
    'utf-8'
  )
  return true
}

function writeInboxRawFile(slug: string, raw: string) {
  const filepath = getInboxFilePath(slug)
  if (!fs.existsSync(filepath)) return false

  fs.writeFileSync(filepath, raw, 'utf-8')
  return true
}

function deleteInboxFile(slug: string) {
  const filepath = getInboxFilePath(slug)
  if (!fs.existsSync(filepath)) return false

  setDocumentBucket(slug, 'deleted')
  return true
}

function archiveInboxFile(slug: string) {
  const inboxFile = getInboxFilePath(slug)
  if (!fs.existsSync(inboxFile)) return false

  const archivePath = getArchivePath()
  ensureDir(archivePath)
  fs.copyFileSync(inboxFile, join(archivePath, basename(inboxFile)))
  setDocumentBucket(slug, 'collected')
  return true
}

function captureV2InboxMarkdown(type: string | undefined, content: string) {
  const raw = content.trim()
  if (!raw) throw new Error('输入内容不能为空')

  ensureV2Directories()
  const filename = createInboxFilename()
  const filepath = join(getV2InboxPath(), filename)
  const kind = detectCaptureKind(type, raw)
  fs.writeFileSync(filepath, raw, 'utf-8')

  const now = new Date().toISOString()
  const metadata = readCardMetadataFile()
  metadata.items[getMetadataKey(filename)] = createDefaultCardMetadata({
    kind,
    createdAt: now,
    updatedAt: now,
  })
  writeCardMetadataFile(metadata)

  return {
    slug: filename.replace(/\.md$/, ''),
    filename,
    path: filepath,
    documentType: kind,
    enrichStatus: 'none' as const,
    parseMode: 'deterministic' as const,
  }
}

function devInboxPlugin(): Plugin {
  let watcher: FSWatcher | null = null
  const clients = new Set<import('node:http').ServerResponse>()

  const sendInboxUpdated = () => {
    for (const client of clients) {
      client.write('event: inbox-updated\n')
      client.write('data: {}\n\n')
    }
  }

  const refreshWatcher = () => {
    watcher?.close()
    ensureV2Directories()
    const workspacePaths = listWorkspaces().items
      .filter((workspace) => workspace.enabled)
      .map((workspace) => workspace.path)
    watcher = chokidar.watch(Array.from(new Set([getV2InboxPath(), getMetadataPath(), getAiInboxRoot(), ...workspacePaths])), {
      ignoreInitial: true,
      ignored: (path) => path.includes('/enrich/tasks.json'),
    })
    watcher.on('all', sendInboxUpdated)
  }

  const readJsonBody = async (req: NodeJS.ReadableStream) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    if (chunks.length === 0) return {}
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
  }

  const sendJson = (res: import('node:http').ServerResponse, status: number, data: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(data))
  }

  return {
    name: 'dev-inbox-api',
    configureServer(server) {
      refreshWatcher()

      server.middlewares.use(async (req, res, next) => {
        const parsedUrl = new URL(req.url || '/', 'http://localhost')
        const url = parsedUrl.pathname

        if (url === '/__dev_api/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          })
          res.write('event: connected\n')
          res.write('data: {}\n\n')
          clients.add(res)
          req.on('close', () => clients.delete(res))
          return
        }

        if (url === '/__dev_api/settings' && req.method === 'GET') {
          sendJson(res, 200, getSettings())
          return
        }

        if (url === '/__dev_api/settings' && req.method === 'POST') {
          const body = (await readJsonBody(req)) as Partial<AppSettings>
          const settings = saveSettings(body)
          refreshWatcher()
          sendJson(res, 200, settings)
          return
        }

        if (url === '/__dev_api/scratchpad' && req.method === 'GET') {
          sendJson(res, 200, { content: readScratchpad() })
          return
        }

        if (url === '/__dev_api/scratchpad' && req.method === 'POST') {
          const body = (await readJsonBody(req)) as { content: string }
          writeScratchpad(body.content || '')
          sendJson(res, 200, { ok: true })
          return
        }

        if (url === '/__dev_api/ai/test' && req.method === 'POST') {
          try {
            const body = (await readJsonBody(req)) as Partial<AppSettings>
            const result = await testAiConnection({ ...getAiSettings(), ...body })
            sendJson(res, 200, result)
          } catch (error) {
            sendJson(res, 400, {
              error: error instanceof Error ? error.message : 'AI 测试失败',
            })
          }
          return
        }

        if (url === '/__dev_api/workspace' && req.method === 'GET') {
          sendJson(res, 200, listWorkspaces())
          return
        }

        if (url === '/__dev_api/workspace' && req.method === 'POST') {
          try {
            const workspace = addWorkspace((await readJsonBody(req)) as WorkspaceAddInput)
            refreshWatcher()
            sendJson(res, 200, workspace)
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : 'Workspace 添加失败' })
          }
          return
        }

        if (url === '/__dev_api/workspace/tree' && req.method === 'GET') {
          sendJson(res, 200, readWorkspaceTree(parsedUrl.searchParams.get('workspaceId') || undefined))
          return
        }

        if (url === '/__dev_api/workspace/file' && req.method === 'GET') {
          try {
            const filepath = parsedUrl.searchParams.get('path') || ''
            const raw = readWorkspaceMarkdownFile(filepath)
            sendJson(res, raw === null ? 404 : 200, raw === null ? { error: 'File not found' } : { raw })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '文件读取失败' })
          }
          return
        }

        if (url === '/__dev_api/workspace/file' && req.method === 'POST') {
          try {
            const body = (await readJsonBody(req)) as { path: string; raw: string }
            writeWorkspaceMarkdownFile(body.path, body.raw || '')
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '文件保存失败' })
          }
          return
        }

        if (url === '/__dev_api/workspace/file/create' && req.method === 'POST') {
          try {
            const result = createWorkspaceMarkdownFile((await readJsonBody(req)) as WorkspaceCreateFileInput)
            refreshWatcher()
            sendJson(res, 200, result)
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '文件创建失败' })
          }
          return
        }

        if (url === '/__dev_api/workspace/file/rename' && req.method === 'POST') {
          try {
            const result = renameWorkspaceMarkdownFile((await readJsonBody(req)) as WorkspaceRenameFileInput)
            refreshWatcher()
            sendJson(res, 200, result)
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '文件重命名失败' })
          }
          return
        }

        if (url === '/__dev_api/workspace/file' && req.method === 'DELETE') {
          try {
            const body = (await readJsonBody(req)) as { path: string }
            deleteWorkspaceMarkdownFile(body.path)
            refreshWatcher()
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '文件删除失败' })
          }
          return
        }

        const workspaceMatch = url.match(/^\/__dev_api\/workspace\/([^/]+)$/)
        if (workspaceMatch && req.method === 'POST') {
          try {
            const workspace = updateWorkspace(
              decodeURIComponent(workspaceMatch[1]),
              (await readJsonBody(req)) as WorkspaceUpdateInput
            )
            refreshWatcher()
            sendJson(res, 200, workspace)
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : 'Workspace 更新失败' })
          }
          return
        }

        if (workspaceMatch && req.method === 'DELETE') {
          try {
            removeWorkspace(decodeURIComponent(workspaceMatch[1]))
            refreshWatcher()
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : 'Workspace 移除失败' })
          }
          return
        }

        if (url === '/__dev_api/v2/enrich/tasks' && req.method === 'GET') {
          sendJson(res, 200, listEnrichTasks())
          return
        }

        if (url === '/__dev_api/v2/enrich/tasks' && req.method === 'POST') {
          try {
            const task = createEnrichTask((await readJsonBody(req)) as V2EnrichCreateTaskInput)
            sendJson(res, 200, task)
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '任务创建失败' })
          }
          return
        }

        const v2EnrichTaskMatch = url.match(/^\/__dev_api\/v2\/enrich\/tasks\/([^/]+)\/(run|retry)$/)
        if (v2EnrichTaskMatch && req.method === 'POST') {
          try {
            const id = decodeURIComponent(v2EnrichTaskMatch[1])
            const action = v2EnrichTaskMatch[2]
            const task = action === 'retry' ? await retryEnrichTask(id) : await runEnrichTask(id)
            refreshWatcher()
            sendJson(res, 200, task)
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '任务执行失败' })
          }
          return
        }

        const v2EnrichTaskDeleteMatch = url.match(/^\/__dev_api\/v2\/enrich\/tasks\/([^/]+)$/)
        if (v2EnrichTaskDeleteMatch && req.method === 'DELETE') {
          try {
            deleteEnrichTask(decodeURIComponent(v2EnrichTaskDeleteMatch[1]))
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '任务删除失败' })
          }
          return
        }

        if (url === '/__dev_api/v2/enrich/output' && req.method === 'GET') {
          try {
            const raw = readEnrichOutput(parsedUrl.searchParams.get('path') || '')
            sendJson(res, raw === null ? 404 : 200, raw === null ? { error: 'File not found' } : { raw })
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '输出读取失败' })
          }
          return
        }

        if (url === '/__dev_api/v2/enrich/save-as-article' && req.method === 'POST') {
          try {
            const result = saveEnrichOutputAsArticle((await readJsonBody(req)) as V2EnrichSaveAsArticleInput)
            refreshWatcher()
            sendJson(res, 200, result)
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : '保存文章失败' })
          }
          return
        }

        const enrichMatch = url.match(/^\/__dev_api\/inbox\/([^/]+)\/enrich$/)
        if (enrichMatch && req.method === 'POST') {
          try {
            await enrichDocumentBySlug(decodeURIComponent(enrichMatch[1]))
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 400, {
              error: error instanceof Error ? error.message : 'AI enrich 失败',
            })
          }
          return
        }

        const bucketMatch = url.match(/^\/__dev_api\/inbox\/([^/]+)\/bucket$/)
        if (bucketMatch && req.method === 'POST') {
          try {
            const body = (await readJsonBody(req)) as { bucket: 'inbox' | 'collected' | 'deleted' }
            setDocumentBucket(decodeURIComponent(bucketMatch[1]), body.bucket)
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 400, {
              error: error instanceof Error ? error.message : 'Bucket 更新失败',
            })
          }
          return
        }

        if (url === '/__dev_api/inbox' && req.method === 'GET') {
          sendJson(res, 200, listInbox())
          return
        }

        if (url === '/__dev_api/v2/cards' && req.method === 'GET') {
          sendJson(res, 200, listInbox())
          return
        }

        if (url === '/__dev_api/v2/inbox/capture' && req.method === 'POST') {
          try {
            const body = (await readJsonBody(req)) as { type?: string; content: string }
            sendJson(res, 200, captureV2InboxMarkdown(body.type, body.content))
          } catch (error) {
            sendJson(res, 400, {
              error: error instanceof Error ? error.message : '处理输入失败',
            })
          }
          return
        }

        if (url === '/__dev_api/process-input' && req.method === 'POST') {
          try {
            const body = (await readJsonBody(req)) as { type: string; content: string }
            const result = captureV2InboxMarkdown(body.type, body.content)
            sendJson(res, 200, result)
          } catch (error) {
            sendJson(res, 400, {
              error: error instanceof Error ? error.message : '处理输入失败',
            })
          }
          return
        }

        const v2BucketMatch = url.match(/^\/__dev_api\/v2\/cards\/([^/]+)\/bucket$/)
        if (v2BucketMatch && req.method === 'POST') {
          try {
            const body = (await readJsonBody(req)) as { bucket: 'inbox' | 'collected' | 'deleted' }
            setDocumentBucket(decodeURIComponent(v2BucketMatch[1]), body.bucket)
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 400, {
              error: error instanceof Error ? error.message : 'Bucket 更新失败',
            })
          }
          return
        }

        const v2KindMatch = url.match(/^\/__dev_api\/v2\/cards\/([^/]+)\/kind$/)
        if (v2KindMatch && req.method === 'POST') {
          try {
            const body = (await readJsonBody(req)) as { kind: V2CardKind }
            const filepath = getInboxFilePath(decodeURIComponent(v2KindMatch[1]))
            if (!fs.existsSync(filepath)) {
              sendJson(res, 404, { error: 'File not found' })
              return
            }
            const stats = fs.statSync(filepath)
            const key = getMetadataKey(basename(filepath))
            const metadata = readCardMetadataFile()
            const current = metadata.items[key] || createDefaultCardMetadata({
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
            })
            metadata.items[key] = {
              ...current,
              kind: body.kind === 'todo' ? 'todo' : 'note',
              updatedAt: new Date().toISOString(),
            }
            writeCardMetadataFile(metadata)
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 400, {
              error: error instanceof Error ? error.message : 'Kind 更新失败',
            })
          }
          return
        }

        const v2RawMatch = url.match(/^\/__dev_api\/v2\/inbox\/([^/]+)\/raw$/)
        if (v2RawMatch && req.method === 'GET') {
          const raw = readInboxRawFile(decodeURIComponent(v2RawMatch[1]))
          sendJson(res, raw === null ? 404 : 200, raw === null ? { error: 'File not found' } : { raw })
          return
        }

        if (v2RawMatch && req.method === 'POST') {
          const body = (await readJsonBody(req)) as { raw: string }
          const ok = writeInboxRawFile(decodeURIComponent(v2RawMatch[1]), body.raw || '')
          sendJson(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'File not found' })
          return
        }

        const archiveMatch = url.match(/^\/__dev_api\/inbox\/([^/]+)\/archive$/)
        if (archiveMatch && req.method === 'POST') {
          const ok = archiveInboxFile(decodeURIComponent(archiveMatch[1]))
          sendJson(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'File not found' })
          return
        }

        const fileMatch = url.match(/^\/__dev_api\/inbox\/([^/]+)$/)
        if (fileMatch && req.method === 'GET') {
          const content = readInboxFile(decodeURIComponent(fileMatch[1]))
          sendJson(res, content === null ? 404 : 200, content === null ? { error: 'File not found' } : content)
          return
        }

        const rawFileMatch = url.match(/^\/__dev_api\/inbox\/([^/]+)\/raw$/)
        if (rawFileMatch && req.method === 'GET') {
          const raw = readInboxRawFile(decodeURIComponent(rawFileMatch[1]))
          sendJson(res, raw === null ? 404 : 200, raw === null ? { error: 'File not found' } : { raw })
          return
        }

        if (rawFileMatch && req.method === 'POST') {
          const body = (await readJsonBody(req)) as { raw: string }
          const ok = writeInboxRawFile(decodeURIComponent(rawFileMatch[1]), body.raw || '')
          sendJson(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'File not found' })
          return
        }

        if (fileMatch && req.method === 'POST') {
          const ok = updateInboxFile(decodeURIComponent(fileMatch[1]), (await readJsonBody(req)) as any)
          sendJson(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'File not found' })
          return
        }

        if (fileMatch && req.method === 'DELETE') {
          const ok = deleteInboxFile(decodeURIComponent(fileMatch[1]))
          sendJson(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'File not found' })
          return
        }

        next()
      })
    },
    closeBundle() {
      watcher?.close()
      watcher = null
      clients.clear()
    },
  }
}

export default defineConfig(async () => {
  return {
    plugins: [
      vue(),
      devInboxPlugin(),
      electron([
        {
          entry: 'electron/main.ts',
          onstart(options) {
            options.startup()
          },
          vite: {
            build: {
              rollupOptions: {
                external: ['chokidar', 'electron-store', 'fsevents'],
              },
            },
          },
        },
        { entry: 'electron/preload.ts' },
      ]),
      renderer(),
    ],
    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },
    base: './',
  }
})
