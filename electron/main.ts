import { app, BrowserWindow, ipcMain, dialog, globalShortcut } from 'electron'
import { basename, dirname, extname, join, relative, resolve } from 'path'
import * as fs from 'fs'
import * as http from 'http'
import { spawn, ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
import Store from 'electron-store'
import chokidar from 'chokidar'
import { buildFrontmatter, parseFrontmatter, toInboxDocument } from '../src/shared/inbox-document'
import { applyEnrichmentToRaw, enrichDocumentContent, testAiConnection, type AiSettings } from '../src/shared/ai-enrichment'
import { defaultThemeConfigs } from '../src/styles/theme-presets'
import {
  createDefaultCardMetadata,
  createEmptyCardMetadataFile,
  normalizeCardMetadataFile,
} from '../src/shared/v2-card-metadata'
import {
  createInboxFilename,
  detectCaptureKind,
  extractMarkdownCardTitle,
  extractMarkdownPreview,
} from '../src/shared/v2-markdown'
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
} from '../src/shared/v2-enrich'
import type { CardMetadataFile, V2CardBucket, V2CardKind, V2InboxCard } from '../src/shared/v2-types'
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
} from '../src/shared/v2-workspace'
import {
  BUILTIN_ENRICH_OUTPUTS_WORKSPACE_ID,
  BUILTIN_INBOX_WORKSPACE_ID,
} from '../src/shared/v2-workspace'

let win: BrowserWindow | null = null

const store = new Store({
  defaults: {
    inboxPath: '~/ai-inbox',
    archivePath: '~/lzm/llm-wiki/MyNote',
    mcpHttpPort: 3100,
    aiProvider: 'minimax',
    apiKey: '',
    model: '',
    baseUrl: '',
    aiProcessingMode: 'off',
    aiConnectionVerified: false,
    themeMode: 'system',
    lightTheme: 'light',
    darkTheme: 'dark',
    editorTypographyTheme: 'typora-github',
    editorCodeTheme: 'github',
    activeThemeId: 'light',
    customThemes: defaultThemeConfigs,
    activeWorkspaceId: BUILTIN_INBOX_WORKSPACE_ID,
    workspaces: [],
  }
})

// MCP Child Process
let mcpProcess: ChildProcess | null = null
let mcpRequestId = 0
const mcpPendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>()
let mcpLastError: string | null = null

// MCP HTTP Server
let httpMcpServer: http.Server | null = null
let httpMcpLastError: string | null = null

function getMcpServerPath(): string {
  if (app.isPackaged) {
    // 打包模式：使用 app resources 中的内置 MCP
    return join(process.resourcesPath, 'mcp-child.js')
  }
  // 开发模式：优先使用项目内 resources/mcp-child.js
  const projectLocal = join(app.getAppPath(), 'resources', 'mcp-child.js')
  if (fs.existsSync(projectLocal)) {
    return projectLocal
  }
  // Fallback：外部安装路径
  return join(app.getPath('home'), 'ai-inbox-mcp', 'dist', 'index.js')
}

function getMcpStatus() {
  return {
    stdioRunning: Boolean(mcpProcess),
    httpRunning: httpMcpServer !== null,
    httpPort: store.get('mcpHttpPort') as number,
    error: mcpLastError || httpMcpLastError
  }
}

function startMcpProcess() {
  if (mcpProcess) {
    mcpLastError = null
    return getMcpStatus()
  }

  const mcpPath = getMcpServerPath()
  if (!fs.existsSync(mcpPath)) {
    mcpLastError = `MCP server not found at: ${mcpPath}`
    console.error('[ai-inbox]', mcpLastError)
    return getMcpStatus()
  }

  mcpProcess = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  })
  mcpLastError = null

  mcpProcess.stdout?.on('data', (data: Buffer) => {
    try {
      const lines = data.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        const resp = JSON.parse(line)
        if (resp.id !== undefined && mcpPendingRequests.has(resp.id)) {
          const { resolve, reject } = mcpPendingRequests.get(resp.id)!
          mcpPendingRequests.delete(resp.id)
          if (resp.error) reject(resp.error)
          else resolve(resp.result)
        }
      }
    } catch {}
  })

  mcpProcess.stderr?.on('data', (data: Buffer) => {
    mcpLastError = data.toString().trim() || 'MCP process reported an error'
    console.error('[ai-inbox] MCP stderr:', data.toString())
  })

  mcpProcess.on('exit', (code) => {
    console.error('[ai-inbox] MCP process exited with code:', code)
    mcpProcess = null
    if (code && code !== 0) {
      mcpLastError = `MCP process exited with code ${code}`
    }
  })

  return getMcpStatus()
}

function stopMcpProcess() {
  if (mcpProcess) {
    mcpProcess.kill()
    mcpProcess = null
  }
  mcpPendingRequests.clear()
  mcpLastError = null
  return getMcpStatus()
}

function callMcpTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!mcpProcess?.stdin) {
      reject(new Error('MCP process not running'))
      return
    }
    const id = ++mcpRequestId
    mcpPendingRequests.set(id, { resolve, reject })
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    }
    mcpProcess.stdin.write(JSON.stringify(request) + '\n')
  })
}

// ─── HTTP MCP 工具处理 ────────────────────────────────────────────────────────

function httpMcpExpandTilde(filepath: string): string {
  if (filepath.startsWith('~/')) {
    return join(app.getPath('home'), filepath.slice(2))
  }
  return filepath
}

function httpMcpGetConfig() {
  return {
    inboxPath: store.get('inboxPath') as string || '~/ai-inbox',
    archivePath: store.get('archivePath') as string || '~/lzm/llm-wiki/MyNote',
    mcpHttpPort: store.get('mcpHttpPort') as number || 3100,
    aiProcessingMode: store.get('aiProcessingMode') as string || 'off',
  }
}

function httpMcpSlugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item'
}

function httpMcpDetectIntent(content: string): { rawInputType: string; documentType: string; normalizedContent: string } {
  const trimmed = content.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return { rawInputType: 'url', documentType: 'link', normalizedContent: trimmed }
  }
  if (/^todo\s+/i.test(trimmed)) {
    return { rawInputType: 'text', documentType: 'todo', normalizedContent: trimmed.replace(/^todo\s+/i, '').trim() }
  }
  return { rawInputType: 'text', documentType: 'note', normalizedContent: trimmed }
}

async function httpMcpHandleTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const result = (() => {
      const config = httpMcpGetConfig()
      const inboxPath = httpMcpExpandTilde(config.inboxPath)

      switch (name) {
        case 'process_note':
        case 'process_todo': {
          const content = (args.content as string) || ''
          const now = new Date()
          const today = now.toISOString().split('T')[0]
          const classification = httpMcpDetectIntent(content)
          const { rawInputType, documentType, normalizedContent } = classification

          if (documentType === 'todo') {
            if (!normalizedContent) throw new Error('TODO 内容不能为空')
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            const slug = `todo-${month}`
            const line = `- [ ] ${normalizedContent}`
            if (!fs.existsSync(inboxPath)) fs.mkdirSync(inboxPath, { recursive: true })
            const todoPath = join(inboxPath, `${slug}.md`)
            if (fs.existsSync(todoPath)) {
              const raw = fs.readFileSync(todoPath, 'utf-8')
              const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
              if (match) {
                const body = match[2] || ''
                const newRaw = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
                const updatedRaw = `---\nupdated: ${today}\n---\n\n${newRaw}${newRaw ? '\n' : ''}${line}\n`
                fs.writeFileSync(todoPath, updatedRaw, 'utf-8')
              }
            } else {
              const body = `## Content\n\n${line}\n`
              fs.writeFileSync(todoPath, `---\ntype: todo\ntitle: "Todo ${month}"\ncreated: ${today}\nupdated: ${today}\nbucket: inbox\nsource: mcp\n---\n\n${body}`, 'utf-8')
            }
            return { ok: true, slug, documentType: 'todo', action: 'appended' }
          }

          // note
          if (!normalizedContent) throw new Error('输入内容不能为空')
          const firstLine = normalizedContent.split('\n')[0]?.trim() || ''
          const contentTitle = firstLine.slice(0, 80)
          const title = contentTitle || 'Untitled'
          const slug = `note-${Date.now()}-${httpMcpSlugify(title)}`
          if (!fs.existsSync(inboxPath)) fs.mkdirSync(inboxPath, { recursive: true })
          const filepath = join(inboxPath, `${slug}.md`)
          const frontmatter = `type: note\ntitle: ${JSON.stringify(title)}\ncontentTitle: ${JSON.stringify(contentTitle)}\ncreated: ${today}\nupdated: ${today}\nbucket: inbox\nsource: mcp\n`
          const bodyContent = `# ${title}\n\n## 原文\n\n${normalizedContent}`
          fs.writeFileSync(filepath, `---\n${frontmatter}---\n\n${bodyContent}`, 'utf-8')
          return { ok: true, slug, documentType: 'note', action: 'created' }
        }

        case 'process_link': {
          let url = (args.url as string) || ''
          if (!/^https?:\/\//i.test(url)) url = 'https://' + url
          if (!fs.existsSync(inboxPath)) fs.mkdirSync(inboxPath, { recursive: true })
          const now = new Date()
          const today = now.toISOString().split('T')[0]
          let hostTitle = url
          try { hostTitle = new URL(url).hostname.replace(/^www\./, '') } catch {}
          const slug = `link-${Date.now()}-${httpMcpSlugify(hostTitle)}`
          const filepath = join(inboxPath, `${slug}.md`)
          const title = hostTitle
          const frontmatter = `type: link\ntitle: ${JSON.stringify(title)}\ncontentTitle: ${JSON.stringify(title)}\ncreated: ${today}\nupdated: ${today}\nbucket: inbox\nsource: mcp\nrawInputType: url\n`
          fs.writeFileSync(filepath, `---\n${frontmatter}---\n\n# ${title}\n\n## 原文\n\n${url}`, 'utf-8')
          return { ok: true, slug, documentType: 'link', action: 'created' }
        }

        case 'process_image': {
          const content = (args.content as string) || ''
          const now = new Date()
          const today = now.toISOString().split('T')[0]
          const contentTitle = content.slice(0, 50) || `Image ${today}`
          const title = contentTitle
          const slug = `image-${Date.now()}-${httpMcpSlugify(title)}`
          if (!fs.existsSync(inboxPath)) fs.mkdirSync(inboxPath, { recursive: true })
          const filepath = join(inboxPath, `${slug}.md`)
          const frontmatter = `type: image\ntitle: ${JSON.stringify(title)}\ncontentTitle: ${JSON.stringify(contentTitle)}\ncreated: ${today}\nupdated: ${today}\nbucket: inbox\nsource: mcp\nrawInputType: image\n`
          fs.writeFileSync(filepath, `---\n${frontmatter}---\n\n# ${title}\n\n## 原文\n\n图片已收件。`, 'utf-8')
          return { ok: true, slug, documentType: 'image', action: 'created' }
        }

        case 'detect_intent': {
          const content = (args.content as string) || ''
          const classification = httpMcpDetectIntent(content)
          return { ...classification, normalizedContent: classification.rawInputType === 'url' ? content : content.slice(0, 200) }
        }

        case 'list_inbox': {
          if (!fs.existsSync(inboxPath)) return { items: [], total: 0 }
          const files = fs.readdirSync(inboxPath).filter(f => f.endsWith('.md'))
          const items = files.map(filename => {
            const filepath = join(inboxPath, filename)
            const content = fs.readFileSync(filepath, 'utf-8')
            const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
            const frontmatter: Record<string, string> = {}
            if (match) {
              for (const line of match[1].split('\n')) {
                const [key, ...rest] = line.split(':')
                if (key && rest.length) frontmatter[key.trim()] = rest.join(':').trim().replace(/^"|"$/g, '')
              }
            }
            return {
              slug: filename.replace('.md', ''),
              filename,
              type: frontmatter.type || 'note',
              title: frontmatter.title || filename,
              created: frontmatter.created || '',
              updated: frontmatter.updated || '',
              bucket: frontmatter.bucket || 'inbox',
            }
          })
          return { items, total: items.length }
        }

        case 'get_config': {
          return httpMcpGetConfig()
        }

        case 'init_config':
        case 'reload_config': {
          return httpMcpGetConfig()
        }

        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    })()
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }) }],
      isError: true,
    }
  }
}

// ─── HTTP MCP 服务器 ──────────────────────────────────────────────────────────

function setupHttpMcpServer(): { httpRunning: boolean; error?: string } {
  if (httpMcpServer) {
    return { httpRunning: true }
  }

  const port = store.get('mcpHttpPort') as number || 3100

  httpMcpServer = http.createServer((req, res) => {
    // CORS headers for external clients
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcprpc-trace-id')
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(req.method === 'GET' && req.url === '/mcp' ? 200 : 405)
      res.end(req.method === 'GET' && req.url === '/mcp'
        ? JSON.stringify({ name: 'ai-inbox-mcp', version: '1.0.0' })
        : JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', async () => {
      try {
        const request = JSON.parse(body)
        // Handle tools/list
        if (request.method === 'tools/list') {
          res.writeHead(200)
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: [
                { name: 'process_note', description: '将文本存为笔记', inputSchema: { type: 'object', properties: { content: { type: 'string' }, type: { type: 'string' } }, required: ['content'] } },
                { name: 'process_todo', description: '追加 TODO', inputSchema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] } },
                { name: 'process_link', description: '将 URL 存为链接', inputSchema: { type: 'object', properties: { url: { type: 'string' }, description: { type: 'string' } }, required: ['url'] } },
                { name: 'process_image', description: '将图片存为记录', inputSchema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] } },
                { name: 'detect_intent', description: '分析内容意图', inputSchema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] } },
                { name: 'list_inbox', description: '列出 inbox 文档', inputSchema: { type: 'object', properties: {} } },
                { name: 'get_config', description: '获取配置', inputSchema: { type: 'object', properties: {} } },
                { name: 'init_config', description: '初始化配置', inputSchema: { type: 'object', properties: {} } },
                { name: 'reload_config', description: '重载配置', inputSchema: { type: 'object', properties: {} } },
              ]
            }
          }))
          return
        }
        // Handle tools/call
        if (request.method === 'tools/call') {
          const { name, arguments: args = {} } = request.params || {}
          const result = await httpMcpHandleTool(name, args)
          res.writeHead(200)
          res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }))
          return
        }
        // Unknown method
        res.writeHead(200)
        res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } }))
      } catch {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
  })

  httpMcpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      httpMcpLastError = `端口 ${port} 已被占用`
    } else {
      httpMcpLastError = err.message
    }
    httpMcpServer = null
  })

  httpMcpServer.on('close', () => {
    httpMcpServer = null
  })

  httpMcpServer.listen(port, '127.0.0.1', () => {
    httpMcpLastError = null
  })

  return { httpRunning: true }
}

function stopHttpMcpServer() {
  if (httpMcpServer) {
    httpMcpServer.close()
    httpMcpServer = null
  }
  return { httpRunning: false }
}

function startHttpMcpServer() {
  if (httpMcpServer) {
    httpMcpLastError = null
    return { httpRunning: true }
  }
  return setupHttpMcpServer()
}

// Helper functions
function getInboxPath(): string {
  const p = store.get('inboxPath') as string
  return p.startsWith('~/') ? join(app.getPath('home'), p.slice(2)) : p
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

function normalizeWorkspacePath(input: string): string {
  return input.startsWith('~/') ? join(app.getPath('home'), input.slice(2)) : resolve(input)
}

function readUserWorkspaces(): WorkspaceConfig[] {
  const raw = store.get('workspaces') as unknown
  if (!Array.isArray(raw)) return []

  return raw
    .filter((item): item is Partial<WorkspaceConfig> => Boolean(item) && typeof item === 'object')
    .filter((item) => typeof item.id === 'string' && typeof item.path === 'string')
    .map((item) => ({
      id: item.id!,
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : basename(item.path!),
      path: normalizeWorkspacePath(item.path!),
      kind: 'user',
      enabled: item.enabled !== false,
      readonly: false,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    }))
}

function writeUserWorkspaces(workspaces: WorkspaceConfig[]) {
  store.set('workspaces', workspaces.filter((workspace) => workspace.kind === 'user'))
}

function listWorkspaces(): WorkspaceListResult {
  ensureV2Directories()
  const items = [...createBuiltinWorkspaces(), ...readUserWorkspaces()]
  const activeWorkspaceId = (store.get('activeWorkspaceId') as string) || BUILTIN_INBOX_WORKSPACE_ID
  const activeExists = items.some((workspace) => workspace.id === activeWorkspaceId)
  return {
    items,
    activeWorkspaceId: activeExists ? activeWorkspaceId : BUILTIN_INBOX_WORKSPACE_ID,
  }
}

function addWorkspace(input: WorkspaceAddInput): WorkspaceConfig {
  const workspacePath = normalizeWorkspacePath(input.path)
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

  const next = [...readUserWorkspaces(), workspace]
  writeUserWorkspaces(next)
  store.set('activeWorkspaceId', workspace.id)
  return workspace
}

function updateWorkspace(id: string, patch: WorkspaceUpdateInput): WorkspaceConfig {
  const userWorkspaces = readUserWorkspaces()
  const current = userWorkspaces.find((workspace) => workspace.id === id)
  if (!current) {
    throw new Error('内置 workspace 不支持修改')
  }

  const nextPath = patch.path ? normalizeWorkspacePath(patch.path) : current.path
  if (patch.path && (!fs.existsSync(nextPath) || !fs.statSync(nextPath).isDirectory())) {
    throw new Error('请选择有效的 Markdown 文件夹')
  }

  const nextWorkspace: WorkspaceConfig = {
    ...current,
    name: patch.name?.trim() || current.name,
    path: nextPath,
    enabled: patch.enabled ?? current.enabled,
    updatedAt: new Date().toISOString(),
  }

  writeUserWorkspaces(userWorkspaces.map((workspace) => workspace.id === id ? nextWorkspace : workspace))
  return nextWorkspace
}

function removeWorkspace(id: string) {
  const userWorkspaces = readUserWorkspaces()
  if (!userWorkspaces.some((workspace) => workspace.id === id)) {
    throw new Error('内置 workspace 不支持移除')
  }

  writeUserWorkspaces(userWorkspaces.filter((workspace) => workspace.id !== id))
  if (store.get('activeWorkspaceId') === id) {
    store.set('activeWorkspaceId', BUILTIN_INBOX_WORKSPACE_ID)
  }
}

function isSafeMarkdownFile(filepath: string) {
  return extname(filepath).toLowerCase() === '.md'
}

function isPathInside(parentPath: string, childPath: string) {
  const rel = relative(resolve(parentPath), resolve(childPath))
  return rel === '' || (!!rel && !rel.startsWith('..') && !rel.startsWith('/'))
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

function readWorkspaceTree(workspaceId?: string): WorkspaceTreeResult[] {
  const workspaces = listWorkspaces().items.filter((workspace) =>
    workspace.enabled && (!workspaceId || workspace.id === workspaceId)
  )

  return workspaces.map((workspace) => ({
    workspaceId: workspace.id,
    rootPath: workspace.path,
    nodes: readWorkspaceDirectory(workspace.path, workspace.path, 0),
  }))
}

function readWorkspaceDirectory(rootPath: string, dirPath: string, depth: number): WorkspaceFileTreeNode[] {
  if (!fs.existsSync(dirPath) || depth > 8) return []

  const nodes: WorkspaceFileTreeNode[] = []
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

    const filepath = join(dirPath, entry.name)
    const relPath = relative(rootPath, filepath)
    if (entry.isDirectory()) {
      const children = readWorkspaceDirectory(rootPath, filepath, depth + 1)
      if (children.length) {
        nodes.push({
          id: filepath,
          name: entry.name,
          path: filepath,
          relativePath: relPath,
          type: 'directory',
          children,
        })
      }
      continue
    }

    if (!entry.isFile() || !isSafeMarkdownFile(filepath)) continue
    const stats = fs.statSync(filepath)
    nodes.push({
      id: filepath,
      name: entry.name,
      path: filepath,
      relativePath: relPath,
      type: 'file',
      updatedAt: stats.mtime.toISOString(),
    })
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function readWorkspaceMarkdownFile(filepath: string) {
  const resolvedPath = resolve(filepath)
  const workspace = findWorkspaceForPath(resolvedPath)
  if (!workspace || !isSafeMarkdownFile(resolvedPath)) {
    throw new Error('文件不属于已启用 workspace')
  }
  if (!fs.existsSync(resolvedPath)) return null
  return fs.readFileSync(resolvedPath, 'utf-8')
}

function writeWorkspaceMarkdownFile(filepath: string, raw: string) {
  const resolvedPath = resolve(filepath)
  const workspace = findWorkspaceForPath(resolvedPath)
  if (!workspace || !isSafeMarkdownFile(resolvedPath)) {
    throw new Error('文件不属于已启用 workspace')
  }
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('文件不存在')
  }
  fs.writeFileSync(resolvedPath, raw, 'utf-8')
}

function ensureV2Directories() {
  for (const dirPath of [getAiInboxRoot(), getV2InboxPath(), getMetadataPath(), getEnrichPath(), getEnrichOutputsPath()]) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
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

function getArchivePath(): string {
  const p = store.get('archivePath') as string
  return p.startsWith('~/') ? join(app.getPath('home'), p.slice(2)) : p
}

function getAiSettings(): AiSettings {
  return {
    aiProvider: store.get('aiProvider') as string,
    apiKey: store.get('apiKey') as string,
    model: store.get('model') as string,
    baseUrl: store.get('baseUrl') as string,
    aiProcessingMode: store.get('aiProcessingMode') as 'off' | 'enhance',
    aiConnectionVerified: Boolean(store.get('aiConnectionVerified')),
  }
}

function getInboxFilePath(slug: string) {
  const filename = slug.endsWith('.md') ? slug : `${slug}.md`
  const v2Path = join(getV2InboxPath(), filename)
  if (fs.existsSync(v2Path)) return v2Path

  const legacyPath = join(getAiInboxRoot(), filename)
  if (fs.existsSync(legacyPath)) return legacyPath

  return v2Path
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

function updateCardMetadata(filename: string, patch: Partial<{ kind: V2CardKind; bucket: V2CardBucket }>) {
  const filepath = getInboxFilePath(filename)
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
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  writeCardMetadataFile(metadata)
}

function toV2InboxCard(params: {
  filepath: string
  filename: string
  raw: string
  createdAt: string
  updatedAt: string
}): V2InboxCard {
  const title = extractMarkdownCardTitle(params.raw)
  const metadata = ensureCardMetadataForFile({
    filename: params.filename,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
  })
  const slug = params.filename.replace(/\.md$/, '')

  return {
    id: params.filename,
    slug,
    filename: params.filename,
    path: params.filepath,
    title,
    hasTitle: Boolean(title),
    preview: extractMarkdownPreview(params.raw),
    kind: metadata.kind,
    type: metadata.kind,
    bucket: metadata.bucket,
    createdAt: metadata.createdAt || params.createdAt,
    updatedAt: metadata.updatedAt || params.updatedAt,
    created: (metadata.createdAt || params.createdAt).split('T')[0],
    raw: params.raw,
    tags: [],
  }
}

function listInboxFiles() {
  ensureV2Directories()
  const entries: Array<{ filepath: string; filename: string }> = []
  const seen = new Set<string>()

  for (const dirPath of [getV2InboxPath(), getAiInboxRoot()]) {
    if (!fs.existsSync(dirPath)) continue
    for (const filename of fs.readdirSync(dirPath).filter((file) => file.endsWith('.md'))) {
      if (seen.has(filename)) continue
      seen.add(filename)
      entries.push({ filepath: join(dirPath, filename), filename })
    }
  }

  return entries
}

function captureV2InboxMarkdown(type: string | undefined, content: string) {
  const raw = content.trim()
  if (!raw) {
    throw new Error('输入内容不能为空')
  }

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
    parseMode: 'deterministic' as const,
  }
}

function getScratchpadPath() {
  return join(app.getPath('userData'), 'scratchpad.md')
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
  updateCardMetadata(slug, { bucket })
}

function readScratchpad() {
  const filepath = getScratchpadPath()
  if (!fs.existsSync(filepath)) {
    return ''
  }
  return fs.readFileSync(filepath, 'utf-8')
}

function writeScratchpad(content: string) {
  fs.writeFileSync(getScratchpadPath(), content, 'utf-8')
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
      status: 'success'
    })
    fs.writeFileSync(filepath, nextRaw, 'utf-8')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI enrich failed'
    setDocumentEnrichStatus(slug, 'failed', message)
    throw error
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Screenshot shortcut: CmdOrCtrl+Shift+S
  globalShortcut.register('CommandOrControl+Shift+S', async () => {
    if (!win) return
    const screenshotPath = join(app.getPath('userData'), 'screenshot.png')
    const image = await win.webContents.capturePage()
    fs.writeFileSync(screenshotPath, image.toPNG())
    console.log('[ai-inbox] Screenshot saved:', screenshotPath)
  })
}

// File watcher
let watcher: chokidar.FSWatcher | null = null

function setupWatcher() {
  watcher?.close()
  ensureV2Directories()
  const workspacePaths = listWorkspaces().items
    .filter((workspace) => workspace.enabled)
    .map((workspace) => workspace.path)

  watcher = chokidar.watch(Array.from(new Set([getV2InboxPath(), getMetadataPath(), getAiInboxRoot(), ...workspacePaths])), {
    ignoreInitial: true,
    ignored: (path) => path.includes('/enrich/tasks.json'),
  })
  watcher.on('all', () => {
    win?.webContents.send('inbox:updated')
  })
}

// IPC Handlers
function setupIPC() {
  // Screenshot
  ipcMain.handle('screenshot:capture', async () => {
    if (!win) return null
    const screenshotPath = join(app.getPath('userData'), 'screenshot.png')
    const image = await win.webContents.capturePage()
    fs.writeFileSync(screenshotPath, image.toPNG())
    return screenshotPath
  })

  // Settings
  ipcMain.handle('settings:get', () => store.store)
  ipcMain.handle('settings:save', (_, settings: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key, value)
    }
  })
  ipcMain.handle('ai:test', async (_, settings: Record<string, unknown>) => {
    const candidate = {
      ...getAiSettings(),
      ...settings,
    }
    const result = await testAiConnection(candidate)
    return result
  })
  ipcMain.handle('ai:enrich', async (_, slug: string) => {
    await enrichDocumentBySlug(slug)
    return { ok: true }
  })
  ipcMain.handle('scratchpad:read', () => readScratchpad())
  ipcMain.handle('scratchpad:write', (_, content: string) => {
    writeScratchpad(content)
  })

  ipcMain.handle('workspace:list', () => listWorkspaces())
  ipcMain.handle('workspace:add', (_, input: WorkspaceAddInput) => {
    const workspace = addWorkspace(input)
    setupWatcher()
    return workspace
  })
  ipcMain.handle('workspace:remove', (_, id: string) => {
    removeWorkspace(id)
    setupWatcher()
  })
  ipcMain.handle('workspace:update', (_, id: string, patch: WorkspaceUpdateInput) => {
    const workspace = updateWorkspace(id, patch)
    setupWatcher()
    return workspace
  })
  ipcMain.handle('workspace:selectFolder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('workspace:tree', (_, workspaceId?: string) => readWorkspaceTree(workspaceId))
  ipcMain.handle('workspace:read-file', (_, filepath: string) => readWorkspaceMarkdownFile(resolve(filepath)))
  ipcMain.handle('workspace:write-file', (_, filepath: string, raw: string) => {
    writeWorkspaceMarkdownFile(resolve(filepath), raw)
  })
  ipcMain.handle('workspace:create-file', (_, input: WorkspaceCreateFileInput) => {
    const result = createWorkspaceMarkdownFile(input)
    setupWatcher()
    return result
  })
  ipcMain.handle('workspace:rename-file', (_, input: WorkspaceRenameFileInput) => {
    const result = renameWorkspaceMarkdownFile(input)
    setupWatcher()
    return result
  })
  ipcMain.handle('workspace:delete-file', (_, filepath: string) => {
    deleteWorkspaceMarkdownFile(filepath)
    setupWatcher()
  })

  ipcMain.handle('v2:enrich:list', () => listEnrichTasks())
  ipcMain.handle('v2:enrich:create', (_, input: V2EnrichCreateTaskInput) => createEnrichTask(input))
  ipcMain.handle('v2:enrich:run', (_, id: string) => runEnrichTask(id))
  ipcMain.handle('v2:enrich:retry', (_, id: string) => retryEnrichTask(id))
  ipcMain.handle('v2:enrich:delete', (_, id: string) => {
    deleteEnrichTask(id)
  })
  ipcMain.handle('v2:enrich:read-output', (_, filepath: string) => readEnrichOutput(filepath))
  ipcMain.handle('v2:enrich:save-as-article', (_, input: V2EnrichSaveAsArticleInput) => {
    const result = saveEnrichOutputAsArticle(input)
    setupWatcher()
    return result
  })

  ipcMain.handle('mcp:status', () => getMcpStatus())
  ipcMain.handle('mcp:start', () => {
    const stdioResult = startMcpProcess()
    const httpResult = startHttpMcpServer()
    return { ...getMcpStatus(), httpError: httpResult.error }
  })
  ipcMain.handle('mcp:stop', () => {
    const stdioResult = stopMcpProcess()
    const httpResult = stopHttpMcpServer()
    return { ...getMcpStatus() }
  })

  // Inbox file operations
  ipcMain.handle('inbox:list', () => {
    return listInboxFiles().map(({ filepath, filename }) => {
      const stats = fs.statSync(filepath)
      const content = fs.readFileSync(filepath, 'utf-8')
      return toV2InboxCard({
        filepath,
        filename,
        raw: content,
        createdAt: stats.birthtime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
      })
    }).sort((a: any, b: any) => (b.created > a.created ? 1 : -1))
  })

  ipcMain.handle('inbox:read', (_, slug: string) => {
    const filename = slug.endsWith('.md') ? slug : `${slug}.md`
    const filepath = getInboxFilePath(filename)
    if (!fs.existsSync(filepath)) return null
    const stats = fs.statSync(filepath)
    const content = fs.readFileSync(filepath, 'utf-8')
    return toInboxDocument({
      slug: filename.replace('.md', ''),
      filename,
      content,
      created: stats.birthtime.toISOString()
    })
  })

  ipcMain.handle('inbox:read-raw', (_, slug: string) => {
    const filepath = getInboxFilePath(slug)
    if (!fs.existsSync(filepath)) return null
    return fs.readFileSync(filepath, 'utf-8')
  })

  ipcMain.handle('inbox:write', (_, slug: string, data: { frontmatter?: Record<string, unknown>; body?: string }) => {
    const filepath = getInboxFilePath(slug)
    if (!fs.existsSync(filepath)) return
    const current = fs.readFileSync(filepath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(current)
    const nextFrontmatter = { ...frontmatter, ...(data.frontmatter || {}) }
    const nextBody = data.body ?? body
    fs.writeFileSync(filepath, buildFrontmatter(nextFrontmatter, nextBody), 'utf-8')
  })

  ipcMain.handle('inbox:write-raw', (_, slug: string, raw: string) => {
    const filepath = getInboxFilePath(slug)
    if (!fs.existsSync(filepath)) return
    fs.writeFileSync(filepath, raw, 'utf-8')
  })

  ipcMain.handle('inbox:set-bucket', (_, slug: string, bucket: 'inbox' | 'collected' | 'deleted') => {
    setDocumentBucket(slug, bucket)
  })

  ipcMain.handle('v2:inbox:capture', (_, { type, content }: { type?: string; content: string }) => {
    return captureV2InboxMarkdown(type, content)
  })

  ipcMain.handle('v2:cards:list', () => {
    return listInboxFiles().map(({ filepath, filename }) => {
      const stats = fs.statSync(filepath)
      const content = fs.readFileSync(filepath, 'utf-8')
      return toV2InboxCard({
        filepath,
        filename,
        raw: content,
        createdAt: stats.birthtime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
      })
    }).sort((a: any, b: any) => (b.created > a.created ? 1 : -1))
  })

  ipcMain.handle('v2:cards:set-bucket', (_, filename: string, bucket: 'inbox' | 'collected' | 'deleted') => {
    updateCardMetadata(filename, { bucket })
  })

  ipcMain.handle('v2:cards:set-kind', (_, filename: string, kind: V2CardKind) => {
    updateCardMetadata(filename, { kind })
  })

  ipcMain.handle('v2:file:read-inbox', (_, filename: string) => {
    const filepath = getInboxFilePath(filename)
    if (!fs.existsSync(filepath)) return null
    return fs.readFileSync(filepath, 'utf-8')
  })

  ipcMain.handle('v2:file:write-inbox', (_, filename: string, raw: string) => {
    const filepath = getInboxFilePath(filename)
    if (!fs.existsSync(filepath)) return
    fs.writeFileSync(filepath, raw, 'utf-8')
  })

  ipcMain.handle('inbox:delete', (_, slug: string) => {
    setDocumentBucket(slug, 'deleted')
  })

  ipcMain.handle('inbox:archive', (_, slug: string) => {
    const archivePath = getArchivePath()
    const src = getInboxFilePath(slug)
    if (!fs.existsSync(src)) return
    const dest = join(archivePath, basename(src))
    if (!fs.existsSync(archivePath)) {
      fs.mkdirSync(archivePath, { recursive: true })
    }
    fs.copyFileSync(src, dest)
    setDocumentBucket(slug, 'collected')
  })

  ipcMain.handle('inbox:select-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  // MCP process input - call the MCP child process
  ipcMain.handle('mcp:process-input', async (_, { type, content }: { type: string; content: string }) => {
    return captureV2InboxMarkdown(type, content)
  })

  // ─── Theme IPC ──────────────────────────────────────────────────────────────

  function getThemesDir(): string {
    const p = join(app.getPath('home'), 'ai-inbox', 'themes')
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true })
    }
    return p
  }

  ipcMain.handle('theme:list-imported', () => {
    const themesDir = getThemesDir()
    if (!fs.existsSync(themesDir)) return []
    const entries = fs.readdirSync(themesDir, { withFileTypes: true })
    const metas: any[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const metaPath = join(themesDir, entry.name, 'theme.json')
      if (!fs.existsSync(metaPath)) continue
      try {
        const raw = fs.readFileSync(metaPath, 'utf-8')
        metas.push(JSON.parse(raw))
      } catch {}
    }
    return metas.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  })

  ipcMain.handle('theme:list-fonts', () => {
    const commonFonts = [
      'PingFang SC',
      'SF Pro Display',
      'SF Pro Text',
      'Helvetica Neue',
      'Noto Sans SC',
      'Microsoft YaHei',
      'Songti SC',
      'Iowan Old Style',
      'SF Mono',
      'JetBrains Mono',
      'Menlo',
      'Monaco',
      'ui-monospace',
      'monospace',
      'serif',
      'sans-serif',
    ]

    const themeFonts: string[] = []
    const themesDir = getThemesDir()
    if (fs.existsSync(themesDir)) {
      for (const entry of fs.readdirSync(themesDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const fontsDir = join(themesDir, entry.name, 'assets', 'fonts')
        if (!fs.existsSync(fontsDir)) continue
        for (const fontFile of fs.readdirSync(fontsDir)) {
          if (!/\.(ttf|otf|woff2?|ttc)$/i.test(fontFile)) continue
          themeFonts.push(fontFile.replace(/\.(ttf|otf|woff2?|ttc)$/i, '').replace(/[-_]+/g, ' '))
        }
      }
    }

    return Array.from(new Set([...commonFonts, ...themeFonts]))
  })

ipcMain.handle('theme:preview-typora', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Typora CSS', extensions: ['css'] }],
    })
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, draft: null }
    }

    const cssPath = result.filePaths[0]
    const css = fs.readFileSync(cssPath, 'utf-8')
    const fileName = require('path').basename(cssPath)

    // 获取已有 id 列表
    const themesDir = getThemesDir()
    const existingIds = fs.existsSync(themesDir)
      ? fs.readdirSync(themesDir, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      : []

    // 动态 import 避免 tsconfig.node.json 的 composite 项目限制
    const { convertTyporaTheme } = await import('../src/shared/typora-theme-converter')
    const output = await convertTyporaTheme({ css, fileName, existingIds })

    return {
      ok: true,
      draft: {
        id: output.id,
        name: output.name,
        css: output.css,
        metadata: output.metadata,
        warnings: output.warnings,
        themeConfig: output.themeConfig,
      },
    }
  })

  ipcMain.handle('theme:save-imported', async (_, { draft, name, activate }) => {
    if (!draft) return { ok: false }

    // 使用用户确认后的 name 重新生成 slug
    const { toTyporaSlug } = await import('../src/shared/typora-theme-converter')
    const themesDir = getThemesDir()
    const existingIds = fs.existsSync(themesDir)
      ? fs.readdirSync(themesDir, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      : []

    const finalId = toTyporaSlug(name, existingIds)

    // 如果 slug 变了，需要替换 css 中的旧 id 为新 id
    let finalCss = draft.css
    if (draft.id !== finalId) {
      finalCss = finalCss.split(draft.id).join(finalId)
    }

    const themeDir = join(themesDir, finalId)
    fs.mkdirSync(themeDir, { recursive: true })

    const finalMetadata = {
      ...draft.metadata,
      id: finalId,
      name,
    }
    fs.writeFileSync(join(themeDir, 'theme.json'), JSON.stringify(finalMetadata, null, 2), 'utf-8')
    fs.writeFileSync(join(themeDir, 'theme.css'), finalCss, 'utf-8')

    // 创建 assets 目录
    fs.mkdirSync(join(themeDir, 'assets', 'fonts'), { recursive: true })
    fs.mkdirSync(join(themeDir, 'assets', 'images'), { recursive: true })

    return { ok: true, id: finalId, metadata: finalMetadata }
  })

  ipcMain.handle('theme:read', (_, id: string) => {
    // 安全校验：禁止路径穿越
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return null
    }
    const themesDir = getThemesDir()
    const themeDir = join(themesDir, id)
    if (!fs.existsSync(themeDir)) return null

    const metaPath = join(themeDir, 'theme.json')
    const cssPath = join(themeDir, 'theme.css')
    if (!fs.existsSync(metaPath) || !fs.existsSync(cssPath)) return null

    try {
      const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
      const css = fs.readFileSync(cssPath, 'utf-8')
      return { metadata, css }
    } catch {
      return null
    }
  })

  ipcMain.handle('theme:delete', (_, id: string) => {
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return false
    }
    const themesDir = getThemesDir()
    const themeDir = join(themesDir, id)
    if (!fs.existsSync(themeDir)) return false
    fs.rmSync(themeDir, { recursive: true, force: true })
    return true
  })
}

app.whenReady().then(() => {
  createWindow()
  setupIPC()
  setupWatcher()
})

app.on('window-all-closed', () => {
  watcher?.close()
  mcpProcess?.kill()
  win = null
})

app.on('activate', () => {
  if (!win) createWindow()
})
