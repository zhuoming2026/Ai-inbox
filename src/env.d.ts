declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import type { InboxDocument } from './shared/inbox-document'

interface ElectronAPI {
  getSettings(): Promise<any>
  saveSettings(settings: any): Promise<void>
  testAiConnection(settings: any): Promise<{ ok: boolean; message: string }>
  readScratchpad(): Promise<string>
  writeScratchpad(content: string): Promise<void>
  listInbox(): Promise<InboxDocument[]>
  readFile(slug: string): Promise<InboxDocument | null>
  readRawFile(slug: string): Promise<string | null>
  updateFile(slug: string, data: any): Promise<void>
  writeRawFile(slug: string, raw: string): Promise<void>
  deleteFile(slug: string): Promise<void>
  archiveFile(slug: string): Promise<void>
  setBucket(slug: string, bucket: 'inbox' | 'collected' | 'deleted'): Promise<void>
  processInput(type: string, content: string): Promise<{ slug: string; enrichStatus: string; documentType: string }>
  enrichFile(slug: string): Promise<{ ok: boolean }>
  getMcpStatus(): Promise<{ running: boolean; error: string | null }>
  startMcp(): Promise<{ running: boolean; error: string | null }>
  stopMcp(): Promise<{ running: boolean; error: string | null }>
  captureScreenshot(): Promise<string | null>
  selectFolder(): Promise<string | null>
  onInboxUpdate(cb: () => void): () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }

  interface WindowEventMap {
    'settings-changed': CustomEvent<Record<string, unknown>>
  }
}

export {}
