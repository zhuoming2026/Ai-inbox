import { app, BrowserWindow, ipcMain, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { spawn, ChildProcess } from 'child_process'
import Store from 'electron-store'
import chokidar from 'chokidar'

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
    theme: 'system'
  }
})

// MCP Child Process
let mcpProcess: ChildProcess | null = null
let mcpRequestId = 0
const mcpPendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>()

function getMcpServerPath(): string {
  // Try built-in path first, fall back to external installation
  const appPath = app.isPackaged
    ? join(process.resourcesPath, 'mcp-child.js')
    : join(app.getPath('home'), 'ai-inbox-mcp', 'dist', 'index.js')
  return appPath
}

function startMcpProcess() {
  const mcpPath = getMcpServerPath()
  if (!fs.existsSync(mcpPath)) {
    console.error('[ai-inbox] MCP server not found at:', mcpPath)
    return
  }

  mcpProcess = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  })

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
    console.error('[ai-inbox] MCP stderr:', data.toString())
  })

  mcpProcess.on('exit', (code) => {
    console.error('[ai-inbox] MCP process exited with code:', code)
    mcpProcess = null
  })
}

function callMcpTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!mcpProcess?.stdin) {
      reject(new Error('MCP process not running'))
      return
    }
    const id = ++mcpRequestId
    mcpPendingRequests.set(id, { resolve, reject })
    const request = { jsonrpc: '2.0', id, method: toolName, params: { arguments: args } }
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

function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }
  const fm: Record<string, unknown> = {}
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':')
    if (key && rest.length) {
      let val = rest.join(':').trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      fm[key.trim()] = val
    }
  })
  return { frontmatter: fm, body: match[2] }
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
      const type = slug.startsWith('todo-') ? 'todo'
        : slug.startsWith('image-') ? 'image'
        : slug.startsWith('link-') ? 'link'
        : slug.startsWith('research-') ? 'research'
        : 'note'
      const { frontmatter, body } = parseFrontmatter(content)
      return {
        slug,
        type,
        filename,
        created: stats.birthtime.toISOString(),
        frontmatter,
        body: body.replace(/## Raw\n[\s\S]*$/, '').trim()
      }
    }).sort((a: any, b: any) => (b.created > a.created ? 1 : -1))
  })

  ipcMain.handle('inbox:read', (_, slug: string) => {
    const inboxPath = getInboxPath()
    const filename = slug.endsWith('.md') ? slug : `${slug}.md`
    const filepath = join(inboxPath, filename)
    if (!fs.existsSync(filepath)) return null
    return fs.readFileSync(filepath, 'utf-8')
  })

  ipcMain.handle('inbox:write', (_, slug: string, data: { frontmatter?: Record<string, unknown>; body?: string }) => {
    const inboxPath = getInboxPath()
    const filepath = join(inboxPath, `${slug}.md`)
    if (!fs.existsSync(filepath)) return
    let content = fs.readFileSync(filepath, 'utf-8')
    const { frontmatter: fm, body } = parseFrontmatter(content)
    if (data.frontmatter) {
      Object.assign(fm, data.frontmatter)
      const fmLines = Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      content = `---\n${fmLines.join('\n')}\n---\n\n## Content\n\n${data.body ?? body.replace(/^## Content\n\n/, '')}`
    }
    fs.writeFileSync(filepath, content, 'utf-8')
  })

  ipcMain.handle('inbox:delete', (_, slug: string) => {
    const inboxPath = getInboxPath()
    const filepath = join(inboxPath, `${slug}.md`)
    if (!fs.existsSync(filepath)) return
    let content = fs.readFileSync(filepath, 'utf-8')
    content = content.replace(/^status:.*$/m, 'status: deleted')
    fs.writeFileSync(filepath, content, 'utf-8')
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
    let content = fs.readFileSync(src, 'utf-8')
    content = content.replace(/^status:.*$/m, 'status: archived')
    fs.writeFileSync(src, content, 'utf-8')
  })

  ipcMain.handle('inbox:select-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  // MCP process input - call the MCP child process
  ipcMain.handle('mcp:process-input', async (_, { type, content }: { type: string; content: string }) => {
    if (!mcpProcess) {
      // Fallback: create file directly without MCP
      const inboxPath = getInboxPath()
      const slug = `${type}-${Date.now()}`
      const fm = [
        '---',
        `type: ${type}`,
        `title: "${content.slice(0, 50).replace(/"/g, '\\"')}"`,
        `created: ${new Date().toISOString().split('T')[0]}`,
        `updated: ${new Date().toISOString().split('T')[0]}`,
        'tags: [app]',
        'source: app',
        'status: ready',
        '---',
        '',
        '## Content',
        '',
        content
      ].join('\n')
      fs.writeFileSync(join(inboxPath, `${slug}.md`), fm, 'utf-8')
      return { slug }
    }

    let toolName: string
    let toolArgs: Record<string, unknown> = { content }

    if (type === 'todo') {
      toolName = 'process_todo'
      toolArgs = { content: content.replace(/^todo\s+/i, '') }
    } else if (type === 'link') {
      toolName = 'process_link'
      toolArgs = { url: content }
    } else if (type === 'research') {
      toolName = 'process_note'
      toolArgs = { content, intent: '研究' }
    } else {
      toolName = 'process_note'
      toolArgs = { content }
    }

    const result = await callMcpTool(toolName, toolArgs)
    return result
  })

  // Start MCP process
  startMcpProcess()
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
