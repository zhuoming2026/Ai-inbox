import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { basename, resolve, join } from 'path'
import { homedir } from 'os'
import fs from 'fs'
import chokidar, { type FSWatcher } from 'chokidar'
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
import type { CardMetadataFile, V2CardKind, V2InboxCard } from './src/shared/v2-types'

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
  for (const dirPath of [getAiInboxRoot(), getV2InboxPath(), getMetadataPath(), getEnrichOutputsPath()]) {
    ensureDir(dirPath)
  }
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
    watcher = chokidar.watch([getV2InboxPath(), getMetadataPath(), getAiInboxRoot()], {
      ignoreInitial: true,
      ignored: (path) => path.includes('/enrich/outputs') || path.includes('/enrich/tasks.json'),
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
        const url = req.url || ''

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
