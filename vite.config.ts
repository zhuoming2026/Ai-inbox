import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve, join } from 'path'
import { homedir } from 'os'
import fs from 'fs'
import chokidar, { type FSWatcher } from 'chokidar'
import { buildFrontmatter, parseFrontmatter, toInboxDocument } from './src/shared/inbox-document'
import { processInputPipeline } from './src/shared/input-pipeline'
import { applyEnrichmentToRaw, enrichDocumentContent, testAiConnection, type AiSettings } from './src/shared/ai-enrichment'

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

function readScratchpad() {
  const filepath = getScratchpadPath()
  if (!fs.existsSync(filepath)) return ''
  return fs.readFileSync(filepath, 'utf-8')
}

function writeScratchpad(content: string) {
  fs.writeFileSync(getScratchpadPath(), content, 'utf-8')
}

function listInbox() {
  const inboxPath = getInboxPath()
  ensureDir(inboxPath)

  return fs
    .readdirSync(inboxPath)
    .filter((filename) => filename.endsWith('.md'))
    .map((filename) => {
      const filepath = join(inboxPath, filename)
      const stats = fs.statSync(filepath)
      const content = fs.readFileSync(filepath, 'utf-8')
      const slug = filename.replace('.md', '')
      return toInboxDocument({
        slug,
        filename,
        content,
        created: stats.birthtime.toISOString(),
      })
    })
    .sort((a, b) => (b.created > a.created ? 1 : -1))
}

function readInboxFile(slug: string) {
  const filepath = join(getInboxPath(), slug.endsWith('.md') ? slug : `${slug}.md`)
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
  const filepath = join(getInboxPath(), slug.endsWith('.md') ? slug : `${slug}.md`)
  if (!fs.existsSync(filepath)) return null
  return fs.readFileSync(filepath, 'utf-8')
}

function getInboxFilePath(slug: string) {
  return join(getInboxPath(), `${slug}.md`)
}

function setDocumentEnrichStatus(slug: string, status: 'none' | 'fetching' | 'success' | 'failed', error?: string | null) {
  const filepath = getInboxFilePath(slug)
  if (!fs.existsSync(filepath)) return
  const raw = fs.readFileSync(filepath, 'utf-8')
  const { frontmatter, body } = parseFrontmatter(raw)
  const nextFrontmatter = {
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
  const raw = fs.readFileSync(filepath, 'utf-8')
  const { frontmatter, body } = parseFrontmatter(raw)
  fs.writeFileSync(
    filepath,
    buildFrontmatter(
      {
        ...frontmatter,
        updated: new Date().toISOString().split('T')[0],
        bucket,
      },
      body
    ),
    'utf-8'
  )
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
  const filepath = join(getInboxPath(), `${slug}.md`)
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
  const filepath = join(getInboxPath(), `${slug}.md`)
  if (!fs.existsSync(filepath)) return false

  fs.writeFileSync(filepath, raw, 'utf-8')
  return true
}

function deleteInboxFile(slug: string) {
  const filepath = join(getInboxPath(), `${slug}.md`)
  if (!fs.existsSync(filepath)) return false

  setDocumentBucket(slug, 'deleted')
  return true
}

function archiveInboxFile(slug: string) {
  const inboxFile = join(getInboxPath(), `${slug}.md`)
  if (!fs.existsSync(inboxFile)) return false

  const archivePath = getArchivePath()
  ensureDir(archivePath)
  fs.copyFileSync(inboxFile, join(archivePath, `${slug}.md`))
  setDocumentBucket(slug, 'collected')
  return true
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
    ensureDir(getInboxPath())
    watcher = chokidar.watch(getInboxPath(), { ignoreInitial: true })
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

        if (url === '/__dev_api/process-input' && req.method === 'POST') {
          try {
            const body = (await readJsonBody(req)) as { type: string; content: string }
            const result = await processInputPipeline(
              { type: body.type, content: body.content, source: 'app' },
              {
                settings: getAiSettings(),
                readDocument: (slug: string) => {
                  const filepath = getInboxFilePath(slug)
                  return fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : null
                },
                writeDocument: (slug: string, raw: string) => {
                  ensureDir(getInboxPath())
                  fs.writeFileSync(getInboxFilePath(slug), raw, 'utf-8')
                },
              })
            sendJson(res, 200, result)
            if (result.enrichStatus === 'fetching') {
              queueMicrotask(async () => {
                try {
                  await enrichDocumentBySlug(result.slug)
                } catch {}
              })
            }
          } catch (error) {
            sendJson(res, 400, {
              error: error instanceof Error ? error.message : '处理输入失败',
            })
          }
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
