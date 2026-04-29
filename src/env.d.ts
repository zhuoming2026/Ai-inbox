declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import type { InboxDocument } from './shared/inbox-document'
import type { V2CaptureResult, V2InboxCard } from './shared/v2-types'
import type {
  WorkspaceAddInput,
  WorkspaceConfig,
  WorkspaceCreateFileInput,
  WorkspaceFileMutationResult,
  WorkspaceListResult,
  WorkspaceRenameFileInput,
  WorkspaceTreeResult,
  WorkspaceUpdateInput,
} from './shared/v2-workspace'

interface ElectronAPI {
  getSettings(): Promise<any>
  saveSettings(settings: any): Promise<void>
  testAiConnection(settings: any): Promise<{ ok: boolean; message: string }>
  readScratchpad(): Promise<string>
  writeScratchpad(content: string): Promise<void>
  listInbox(): Promise<Array<InboxDocument | V2InboxCard>>
  readFile(slug: string): Promise<InboxDocument | null>
  readRawFile(slug: string): Promise<string | null>
  updateFile(slug: string, data: any): Promise<void>
  writeRawFile(slug: string, raw: string): Promise<void>
  deleteFile(slug: string): Promise<void>
  archiveFile(slug: string): Promise<void>
  setBucket(slug: string, bucket: 'inbox' | 'collected' | 'deleted'): Promise<void>
  v2: {
    captureInbox(content: string, type?: string): Promise<V2CaptureResult>
    listCards(): Promise<V2InboxCard[]>
    setCardBucket(filename: string, bucket: 'inbox' | 'collected' | 'deleted'): Promise<void>
    setCardKind(filename: string, kind: 'note' | 'todo'): Promise<void>
    readInboxFile(filename: string): Promise<string | null>
    writeInboxFile(filename: string, raw: string): Promise<void>
  }
  workspace: {
    list(): Promise<WorkspaceListResult>
    add(input: WorkspaceAddInput): Promise<WorkspaceConfig>
    remove(id: string): Promise<void>
    update(id: string, patch: WorkspaceUpdateInput): Promise<WorkspaceConfig>
    selectFolder(): Promise<string | null>
    readTree(workspaceId?: string): Promise<WorkspaceTreeResult[]>
    readFile(path: string): Promise<string | null>
    writeFile(path: string, raw: string): Promise<void>
    createFile(input: WorkspaceCreateFileInput): Promise<WorkspaceFileMutationResult>
    renameFile(input: WorkspaceRenameFileInput): Promise<WorkspaceFileMutationResult>
    deleteFile(path: string): Promise<void>
  }
  processInput(type: string, content: string): Promise<V2CaptureResult | { slug: string; enrichStatus: string; documentType: string }>
  enrichFile(slug: string): Promise<{ ok: boolean }>
  getMcpStatus(): Promise<{ running: boolean; error: string | null }>
  startMcp(): Promise<{ running: boolean; error: string | null }>
  stopMcp(): Promise<{ running: boolean; error: string | null }>
  captureScreenshot(): Promise<string | null>
  selectFolder(): Promise<string | null>
  onInboxUpdate(cb: () => void): () => void
  theme: {
    previewTypora(): Promise<{ ok: boolean; draft: any | null }>
    saveImported(data: { draft: any; name: string; activate: boolean }): Promise<{ ok: boolean; id?: string; metadata?: any; error?: string }>
    listImported(): Promise<any[]>
    listFonts(): Promise<string[]>
    read(id: string): Promise<{ metadata: any; css: string } | null>
    delete(id: string): Promise<boolean>
  }
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
