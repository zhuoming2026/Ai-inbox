import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  listInbox: () => ipcRenderer.invoke('inbox:list'),
  readFile: (slug: string) => ipcRenderer.invoke('inbox:read', slug),
  writeFile: (slug: string, data: any) => ipcRenderer.invoke('inbox:write', slug, data),
  updateFile: (slug: string, data: any) => ipcRenderer.invoke('inbox:write', slug, data),
  archiveFile: (slug: string) => ipcRenderer.invoke('inbox:archive', slug),
  deleteFile: (slug: string) => ipcRenderer.invoke('inbox:delete', slug),

  // 设置
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  testAiConnection: (settings: any) => ipcRenderer.invoke('ai:test', settings),

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
    ipcRenderer.on('inbox:updated', callback)
    return () => ipcRenderer.removeListener('inbox:updated', callback)
  },

  // 文件夹选择
  selectFolder: () => ipcRenderer.invoke('inbox:select-folder')
})
