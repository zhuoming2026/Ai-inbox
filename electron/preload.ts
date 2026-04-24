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
