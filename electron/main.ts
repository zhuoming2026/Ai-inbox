import { app, BrowserWindow, ipcMain, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { spawn, ChildProcess } from 'child_process'
import Store from 'electron-store'
import chokidar from 'chokidar'
import { buildFrontmatter, parseFrontmatter, syncFrontmatterBucket, toInboxDocument } from '../src/shared/inbox-document'
import { processInputPipeline } from '../src/shared/input-pipeline'
import { applyEnrichmentToRaw, enrichDocumentContent, testAiConnection, type AiSettings } from '../src/shared/ai-enrichment'
import { defaultThemeConfigs } from '../src/styles/theme-presets'

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
  }
})

// MCP Child Process
let mcpProcess: ChildProcess | null = null
let mcpRequestId = 0
const mcpPendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>()
let mcpLastError: string | null = null

function getMcpServerPath(): string {
  // Try built-in path first, fall back to external installation
  const appPath = app.isPackaged
    ? join(process.resourcesPath, 'mcp-child.js')
    : join(app.getPath('home'), 'ai-inbox-mcp', 'dist', 'index.js')
  return appPath
}

function getMcpStatus() {
  return {
    running: Boolean(mcpProcess),
    error: mcpLastError
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

// MCP HTTP Server (Phase 2.1: basic placeholder - full implementation in later phase)
function setupHttpMcpServer() {
  // TODO: Implement HTTP MCP server on port from settings
  // This requires implementing the MCP HTTP endpoint handler
}

// Helper functions
function getInboxPath(): string {
  const p = store.get('inboxPath') as string
  return p.startsWith('~/') ? join(app.getPath('home'), p.slice(2)) : p
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
  return join(getInboxPath(), `${slug}.md`)
}

function getScratchpadPath() {
  return join(app.getPath('userData'), 'scratchpad.md')
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
      syncFrontmatterBucket({
        ...frontmatter,
        updated: new Date().toISOString().split('T')[0],
      }, bucket),
      body
    ),
    'utf-8'
  )
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

function scheduleAutoEnrich(slug: string) {
  queueMicrotask(async () => {
    try {
      await enrichDocumentBySlug(slug)
    } catch (error) {
      console.error('[ai-inbox] auto enrich failed:', error)
    }
  })
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
  const inboxPath = getInboxPath()
  if (!fs.existsSync(inboxPath)) {
    fs.mkdirSync(inboxPath, { recursive: true })
  }

  watcher = chokidar.watch(inboxPath, { ignoreInitial: true })
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

  ipcMain.handle('mcp:status', () => getMcpStatus())
  ipcMain.handle('mcp:start', () => startMcpProcess())
  ipcMain.handle('mcp:stop', () => stopMcpProcess())

  // Inbox file operations
  ipcMain.handle('inbox:list', () => {
    const inboxPath = getInboxPath()
    if (!fs.existsSync(inboxPath)) return []
    const files = fs.readdirSync(inboxPath).filter(f => f.endsWith('.md'))
    return files.map((filename: string) => {
      const filepath = join(inboxPath, filename)
      const stats = fs.statSync(filepath)
      const content = fs.readFileSync(filepath, 'utf-8')
      const slug = filename.replace('.md', '')
      return toInboxDocument({
        slug,
        filename,
        content,
        created: stats.birthtime.toISOString()
      })
    }).sort((a: any, b: any) => (b.created > a.created ? 1 : -1))
  })

  ipcMain.handle('inbox:read', (_, slug: string) => {
    const inboxPath = getInboxPath()
    const filename = slug.endsWith('.md') ? slug : `${slug}.md`
    const filepath = join(inboxPath, filename)
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
    const inboxPath = getInboxPath()
    const filepath = join(inboxPath, `${slug}.md`)
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

  ipcMain.handle('inbox:delete', (_, slug: string) => {
    setDocumentBucket(slug, 'deleted')
  })

  ipcMain.handle('inbox:archive', (_, slug: string) => {
    const inboxPath = getInboxPath()
    const archivePath = getArchivePath()
    const src = join(inboxPath, `${slug}.md`)
    if (!fs.existsSync(src)) return
    const dest = join(archivePath, `${slug}.md`)
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
    const result = await processInputPipeline(
      { type, content, source: 'app' },
      {
        settings: getAiSettings(),
        readDocument: (slug: string) => {
          const filepath = getInboxFilePath(slug)
          return fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : null
        },
        writeDocument: (slug: string, raw: string) => {
          const inboxPath = getInboxPath()
          if (!fs.existsSync(inboxPath)) {
            fs.mkdirSync(inboxPath, { recursive: true })
          }
          fs.writeFileSync(getInboxFilePath(slug), raw, 'utf-8')
        }
      }
    )
    if (result.enrichStatus === 'fetching') {
      scheduleAutoEnrich(result.slug)
    }
    return result
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
