import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  listInbox: () => ipcRenderer.invoke('inbox:list'),
  readFile: (slug: string) => ipcRenderer.invoke('inbox:read', slug),
  readRawFile: (slug: string) => ipcRenderer.invoke('inbox:read-raw', slug),
  writeFile: (slug: string, data: any) => ipcRenderer.invoke('inbox:write', slug, data),
  updateFile: (slug: string, data: any) => ipcRenderer.invoke('inbox:write', slug, data),
  writeRawFile: (slug: string, raw: string) => ipcRenderer.invoke('inbox:write-raw', slug, raw),
  archiveFile: (slug: string) => ipcRenderer.invoke('inbox:archive', slug),
  deleteFile: (slug: string) => ipcRenderer.invoke('inbox:delete', slug),
  setBucket: (slug: string, bucket: 'inbox' | 'collected' | 'deleted') => ipcRenderer.invoke('inbox:set-bucket', slug, bucket),
  v2: {
    captureInbox: (content: string, type?: string) => ipcRenderer.invoke('v2:inbox:capture', { type, content }),
    listCards: () => ipcRenderer.invoke('v2:cards:list'),
    setCardBucket: (filename: string, bucket: 'inbox' | 'collected' | 'deleted') =>
      ipcRenderer.invoke('v2:cards:set-bucket', filename, bucket),
    setCardKind: (filename: string, kind: 'note' | 'todo') =>
      ipcRenderer.invoke('v2:cards:set-kind', filename, kind),
    readInboxFile: (filename: string) => ipcRenderer.invoke('v2:file:read-inbox', filename),
    writeInboxFile: (filename: string, raw: string) => ipcRenderer.invoke('v2:file:write-inbox', filename, raw),
  },
  workspace: {
    list: () => ipcRenderer.invoke('workspace:list'),
    add: (input: { name?: string; path: string }) => ipcRenderer.invoke('workspace:add', input),
    remove: (id: string) => ipcRenderer.invoke('workspace:remove', id),
    update: (id: string, patch: { name?: string; path?: string; enabled?: boolean }) =>
      ipcRenderer.invoke('workspace:update', id, patch),
    selectFolder: () => ipcRenderer.invoke('workspace:selectFolder'),
    readTree: (workspaceId?: string) => ipcRenderer.invoke('workspace:tree', workspaceId),
    readFile: (path: string) => ipcRenderer.invoke('workspace:read-file', path),
    writeFile: (path: string, raw: string) => ipcRenderer.invoke('workspace:write-file', path, raw),
    createFile: (input: { workspaceId: string; filename: string }) =>
      ipcRenderer.invoke('workspace:create-file', input),
    renameFile: (input: { path: string; filename: string }) =>
      ipcRenderer.invoke('workspace:rename-file', input),
    deleteFile: (path: string) => ipcRenderer.invoke('workspace:delete-file', path),
  },
  enrich: {
    listTasks: () => ipcRenderer.invoke('v2:enrich:list'),
    createTask: (input: { url: string; instruction: string; fromPath?: string }) =>
      ipcRenderer.invoke('v2:enrich:create', input),
    runTask: (id: string) => ipcRenderer.invoke('v2:enrich:run', id),
    retryTask: (id: string) => ipcRenderer.invoke('v2:enrich:retry', id),
    deleteTask: (id: string) => ipcRenderer.invoke('v2:enrich:delete', id),
    readOutput: (path: string) => ipcRenderer.invoke('v2:enrich:read-output', path),
    saveAsArticle: (input: { outputPath: string; workspaceId: string; filename: string }) =>
      ipcRenderer.invoke('v2:enrich:save-as-article', input),
  },

  // 设置
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  testAiConnection: (settings: any) => ipcRenderer.invoke('ai:test', settings),
  readScratchpad: () => ipcRenderer.invoke('scratchpad:read'),
  writeScratchpad: (content: string) => ipcRenderer.invoke('scratchpad:write', content),

  // MCP 输入（处理用户输入）
  processInput: (type: string, content: string) => ipcRenderer.invoke('mcp:process-input', { type, content }),
  enrichFile: (slug: string) => ipcRenderer.invoke('ai:enrich', slug),
  getMcpStatus: () => ipcRenderer.invoke('mcp:status'),
  startMcp: () => ipcRenderer.invoke('mcp:start'),
  stopMcp: () => ipcRenderer.invoke('mcp:stop'),

  // 截图
  captureScreenshot: () => ipcRenderer.invoke('screenshot:capture'),

  // 事件监听
  onInboxUpdate: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('inbox:updated', listener)
    return () => ipcRenderer.removeListener('inbox:updated', listener)
  },

  // 文件夹选择
  selectFolder: () => ipcRenderer.invoke('inbox:select-folder'),

  // 导入主题
  theme: {
    previewTypora: () => ipcRenderer.invoke('theme:preview-typora'),
    saveImported: (data: { draft: any; name: string; activate: boolean }) =>
      ipcRenderer.invoke('theme:save-imported', data),
    listImported: () => ipcRenderer.invoke('theme:list-imported'),
    listFonts: () => ipcRenderer.invoke('theme:list-fonts'),
    read: (id: string) => ipcRenderer.invoke('theme:read', id),
    delete: (id: string) => ipcRenderer.invoke('theme:delete', id),
  },
})
