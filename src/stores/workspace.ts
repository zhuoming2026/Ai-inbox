import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  WorkspaceAddInput,
  WorkspaceConfig,
  WorkspaceCreateFileInput,
  WorkspaceFileMutationResult,
  WorkspaceFileTreeNode,
  WorkspaceRenameFileInput,
  WorkspaceTreeResult,
  WorkspaceUpdateInput,
} from '../shared/v2-workspace'
import { BUILTIN_INBOX_WORKSPACE_ID } from '../shared/v2-workspace'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<WorkspaceConfig[]>([])
  const trees = ref<WorkspaceTreeResult[]>([])
  const activeWorkspaceId = ref(BUILTIN_INBOX_WORKSPACE_ID)
  const loading = ref(false)

  const enabledWorkspaces = computed(() => workspaces.value.filter((workspace) => workspace.enabled))
  const treeByWorkspaceId = computed(() => {
    return new Map(trees.value.map((tree) => [tree.workspaceId, tree.nodes]))
  })

  async function loadWorkspaces() {
    const result = await window.electronAPI?.workspace?.list()
    workspaces.value = result?.items || []
    activeWorkspaceId.value = result?.activeWorkspaceId || BUILTIN_INBOX_WORKSPACE_ID
  }

  async function loadTrees(workspaceId?: string) {
    loading.value = true
    try {
      const result = await window.electronAPI?.workspace?.readTree(workspaceId)
      trees.value = result || []
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    await loadWorkspaces()
    await loadTrees()
  }

  async function addWorkspace(input: WorkspaceAddInput) {
    await window.electronAPI?.workspace?.add(input)
    await refresh()
  }

  async function removeWorkspace(id: string) {
    await window.electronAPI?.workspace?.remove(id)
    await refresh()
  }

  async function updateWorkspace(id: string, patch: WorkspaceUpdateInput) {
    await window.electronAPI?.workspace?.update(id, patch)
    await refresh()
  }

  async function createFile(input: WorkspaceCreateFileInput): Promise<WorkspaceFileMutationResult | null> {
    const result = await window.electronAPI?.workspace?.createFile(input) ?? null
    await refresh()
    return result
  }

  async function renameFile(input: WorkspaceRenameFileInput): Promise<WorkspaceFileMutationResult | null> {
    const result = await window.electronAPI?.workspace?.renameFile(input) ?? null
    await refresh()
    return result
  }

  async function deleteFile(path: string) {
    await window.electronAPI?.workspace?.deleteFile(path)
    await refresh()
  }

  async function selectFolder() {
    return await window.electronAPI?.workspace?.selectFolder() ?? null
  }

  function getTree(workspaceId: string): WorkspaceFileTreeNode[] {
    return treeByWorkspaceId.value.get(workspaceId) || []
  }

  return {
    workspaces,
    trees,
    activeWorkspaceId,
    loading,
    enabledWorkspaces,
    treeByWorkspaceId,
    loadWorkspaces,
    loadTrees,
    refresh,
    addWorkspace,
    removeWorkspace,
    updateWorkspace,
    createFile,
    renameFile,
    deleteFile,
    selectFolder,
    getTree,
  }
})
