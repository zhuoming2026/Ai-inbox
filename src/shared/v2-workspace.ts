export type WorkspaceKind = 'builtin' | 'user'
export type WorkspaceTreeNodeType = 'directory' | 'file'

export interface WorkspaceConfig {
  id: string
  name: string
  path: string
  kind: WorkspaceKind
  enabled: boolean
  readonly?: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkspaceListResult {
  items: WorkspaceConfig[]
  activeWorkspaceId: string
}

export interface WorkspaceFileTreeNode {
  id: string
  name: string
  path: string
  relativePath: string
  type: WorkspaceTreeNodeType
  updatedAt?: string
  children?: WorkspaceFileTreeNode[]
}

export interface WorkspaceTreeResult {
  workspaceId: string
  rootPath: string
  nodes: WorkspaceFileTreeNode[]
}

export interface WorkspaceAddInput {
  name?: string
  path: string
}

export interface WorkspaceUpdateInput {
  name?: string
  path?: string
  enabled?: boolean
}

export const BUILTIN_INBOX_WORKSPACE_ID = 'builtin:inbox'
export const BUILTIN_ENRICH_OUTPUTS_WORKSPACE_ID = 'builtin:enrich-outputs'
