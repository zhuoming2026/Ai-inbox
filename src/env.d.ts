declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPI {
  getSettings(): Promise<any>
  saveSettings(settings: any): Promise<void>
  listInbox(): Promise<any[]>
  readFile(slug: string): Promise<string | null>
  updateFile(slug: string, data: any): Promise<void>
  deleteFile(slug: string): Promise<void>
  archiveFile(slug: string): Promise<void>
  processInput(type: string, content: string): Promise<{ slug: string }>
  captureScreenshot(): Promise<string | null>
  selectFolder(): Promise<string | null>
  onInboxUpdate(cb: () => void): () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
