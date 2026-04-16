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

  // MCP 输入（处理用户输入）
  processInput: (type: string, content: string) => ipcRenderer.invoke('mcp:process-input', { type, content }),

  // 事件监听
  onInboxUpdate: (callback: () => void) => {
    ipcRenderer.on('inbox:updated', callback)
    return () => ipcRenderer.removeListener('inbox:updated', callback)
  },

  // 文件夹选择
  selectFolder: () => ipcRenderer.invoke('inbox:select-folder')
})
