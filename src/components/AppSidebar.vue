<template>
  <aside class="app-sidebar">
    <div class="traffic-light-space" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <nav class="primary-nav" aria-label="Primary">
      <button
        type="button"
        class="primary-nav-item"
        :class="{ active: route.name === 'home' }"
        @click="router.push('/')"
      >
        <n-icon><FileTrayFullOutline /></n-icon>
        <span>Inbox</span>
      </button>
      <button
        type="button"
        class="primary-nav-item"
        :class="{ active: route.name === 'ai-enrich' }"
        @click="router.push('/ai-enrich')"
      >
        <n-icon><SparklesOutline /></n-icon>
        <span>AI Enrich</span>
      </button>
    </nav>

    <section class="workspace-section">
      <div class="workspace-header">
        <span>Workspace</span>
        <button type="button" class="icon-button" title="添加 workspace" @click="addWorkspaceFromFolder">
          <n-icon><AddOutline /></n-icon>
        </button>
      </div>

      <div class="workspace-list">
        <div v-if="workspaceStore.loading && !workspaceStore.enabledWorkspaces.length" class="workspace-status">
          正在读取 workspace...
        </div>
        <div v-else-if="!workspaceStore.enabledWorkspaces.length" class="workspace-status">暂无 workspace</div>
        <div v-for="workspace in workspaceStore.enabledWorkspaces" :key="workspace.id" class="workspace-block">
          <div class="workspace-title-row">
            <button type="button" class="workspace-title" :title="workspace.path">
              <n-icon><FolderOutline /></n-icon>
              <span>{{ workspace.name }}</span>
            </button>
            <button
              v-if="canManageWorkspaceFiles(workspace)"
              type="button"
              class="workspace-action"
              title="新建 Markdown"
              @click="createWorkspaceFile(workspace.id)"
            >
              <n-icon><DocumentTextOutline /></n-icon>
            </button>
            <button
              v-if="workspace.kind === 'user'"
              type="button"
              class="remove-workspace"
              title="移除 workspace"
              @click="removeWorkspace(workspace.id)"
            >
              <n-icon><CloseOutline /></n-icon>
            </button>
          </div>

          <AppSidebarTree
            v-if="workspaceStore.getTree(workspace.id).length"
            :nodes="workspaceStore.getTree(workspace.id)"
            :active-path="activeWorkspacePath"
            :editable="canManageWorkspaceFiles(workspace)"
            :collapsed-paths="collapsedFolderPaths"
            @open-file="openWorkspaceFile"
            @toggle-folder="toggleFolder"
            @rename-file="renameWorkspaceFile"
            @delete-file="deleteWorkspaceFile"
          />
          <p v-else class="workspace-empty">暂无 Markdown 文件</p>
        </div>
      </div>
    </section>

    <footer class="sidebar-footer">
      <button type="button" class="settings-link" title="Settings" @click="router.push('/settings')">
        <n-icon><SettingsOutline /></n-icon>
      </button>
      <div class="ai-ready" aria-label="AI Ready">
        <span class="status-dot"></span>
        <span>AI Ready</span>
      </div>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage, NIcon } from 'naive-ui'
import {
  AddOutline,
  CloseOutline,
  DocumentTextOutline,
  FileTrayFullOutline,
  FolderOutline,
  SettingsOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import AppSidebarTree from './AppSidebarTree.vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { WorkspaceConfig, WorkspaceFileTreeNode } from '../shared/v2-workspace'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const workspaceStore = useWorkspaceStore()
const COLLAPSED_STORAGE_KEY = 'ai-inbox:v2:collapsed-workspace-folders'
const collapsedFolderPaths = ref<string[]>([])

const activeWorkspacePath = computed(() => {
  const param = route.params.encodedPath
  return typeof param === 'string' ? safeDecode(param) : undefined
})

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function readCollapsedFolderPaths() {
  try {
    const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function saveCollapsedFolderPaths(paths: string[]) {
  window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(paths))
}

async function addWorkspaceFromFolder() {
  const folder = await workspaceStore.selectFolder()
  if (!folder) return

  try {
    await workspaceStore.addWorkspace({ path: folder })
    message.success('已添加 workspace')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '添加 workspace 失败')
  }
}

async function removeWorkspace(id: string) {
  try {
    await workspaceStore.removeWorkspace(id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '移除 workspace 失败')
  }
}

function canManageWorkspaceFiles(workspace: WorkspaceConfig) {
  return workspace.kind === 'user' && !workspace.readonly && workspace.enabled
}

async function createWorkspaceFile(workspaceId: string) {
  const filename = window.prompt('新建 Markdown 文件', 'Untitled.md')?.trim()
  if (!filename) return

  try {
    const result = await workspaceStore.createFile({ workspaceId, filename })
    if (result?.path) {
      await router.push({ name: 'article-path', params: { encodedPath: result.path } })
    }
    message.success('已新建 Markdown')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '新建 Markdown 失败')
  }
}

async function renameWorkspaceFile(node: WorkspaceFileTreeNode) {
  const filename = window.prompt('重命名 Markdown 文件', node.name)?.trim()
  if (!filename || filename === node.name) return

  try {
    const result = await workspaceStore.renameFile({ path: node.path, filename })
    if (activeWorkspacePath.value === node.path && result?.path) {
      await router.replace({ name: 'article-path', params: { encodedPath: result.path } })
    }
    message.success('已重命名 Markdown')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重命名 Markdown 失败')
  }
}

async function deleteWorkspaceFile(node: WorkspaceFileTreeNode) {
  const confirmed = window.confirm(`删除 ${node.name}？此操作会删除 workspace 内的 Markdown 文件。`)
  if (!confirmed) return

  try {
    await workspaceStore.deleteFile(node.path)
    if (activeWorkspacePath.value === node.path) {
      await router.replace('/')
    }
    message.success('已删除 Markdown')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除 Markdown 失败')
  }
}

function openWorkspaceFile(path: string) {
  router.push({ name: 'article-path', params: { encodedPath: path } })
}

function toggleFolder(path: string) {
  const next = new Set(collapsedFolderPaths.value)
  if (next.has(path)) {
    next.delete(path)
  } else {
    next.add(path)
  }
  collapsedFolderPaths.value = Array.from(next)
  saveCollapsedFolderPaths(collapsedFolderPaths.value)
}

function expandActiveFileAncestors(path?: string) {
  if (!path) return
  const next = collapsedFolderPaths.value.filter((folderPath) => !path.startsWith(`${folderPath}/`))
  if (next.length !== collapsedFolderPaths.value.length) {
    collapsedFolderPaths.value = next
    saveCollapsedFolderPaths(next)
  }
}

function handleInboxUpdated() {
  void workspaceStore.refresh()
}

onMounted(() => {
  collapsedFolderPaths.value = readCollapsedFolderPaths()
  expandActiveFileAncestors(activeWorkspacePath.value)
  void workspaceStore.refresh()
  window.addEventListener('inbox-updated', handleInboxUpdated)
})

onUnmounted(() => {
  window.removeEventListener('inbox-updated', handleInboxUpdated)
})

watch(activeWorkspacePath, (path) => {
  expandActiveFileAncestors(path)
})
</script>

<style scoped>
.app-sidebar {
  width: 228px;
  flex: 0 0 228px;
  height: 100vh;
  min-height: 0;
  border-right: 1px solid rgba(42, 37, 24, 0.1);
  background: #f8f7f1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-primary);
}

.traffic-light-space {
  height: 48px;
  flex: 0 0 48px;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
}

.traffic-light-space span {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.traffic-light-space span:nth-child(1) {
  background: #ff5f57;
}

.traffic-light-space span:nth-child(2) {
  background: #ffbd2e;
}

.traffic-light-space span:nth-child(3) {
  background: #28c840;
}

.primary-nav {
  padding: 0 12px 12px;
  border-bottom: 1px solid rgba(42, 37, 24, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.primary-nav-item,
.workspace-title,
.icon-button,
.workspace-action,
.remove-workspace {
  border: 0;
  font: inherit;
}

.primary-nav-item {
  height: 34px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 560;
  cursor: pointer;
}

.primary-nav-item:hover {
  background: rgba(42, 37, 24, 0.045);
  color: var(--text-primary);
}

.primary-nav-item.active {
  background: #efede4;
  box-shadow: inset 0 0 0 1px rgba(42, 37, 24, 0.04);
  color: var(--text-primary);
}

.primary-nav-item:disabled {
  cursor: default;
  opacity: 0.46;
}

.workspace-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 10px 8px;
}

.workspace-header {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 0 8px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.icon-button,
.workspace-action,
.remove-workspace {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-button:hover,
.workspace-action:hover,
.remove-workspace:hover {
  background: rgba(42, 37, 24, 0.055);
  color: var(--text-primary);
}

.workspace-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2px 2px 10px;
}

.workspace-status,
.workspace-empty {
  margin: 6px 8px 12px;
  color: var(--text-muted);
  font-size: 12px;
}

.workspace-status {
  padding-top: 4px;
}

.workspace-block {
  margin-bottom: 8px;
}

.workspace-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.workspace-title {
  flex: 1;
  min-width: 0;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 620;
}

.workspace-title span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-footer {
  flex: 0 0 42px;
  position: relative;
  border-top: 1px solid rgba(42, 37, 24, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: rgba(248, 247, 241, 0.92);
}

.settings-link {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.settings-link:hover {
  background: rgba(42, 37, 24, 0.055);
  color: var(--text-primary);
}

.ai-ready {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #4caf5a;
  box-shadow: 0 0 0 3px rgba(76, 175, 90, 0.1);
}

@media (max-width: 720px) {
  .app-sidebar {
    width: 64px;
    flex-basis: 64px;
  }

  .traffic-light-space {
    height: 42px;
    flex-basis: 42px;
    gap: 5px;
    padding: 0 10px;
  }

  .traffic-light-space span {
    width: 9px;
    height: 9px;
  }

  .primary-nav {
    padding: 0 8px 10px;
  }

  .primary-nav-item {
    justify-content: center;
    padding: 0;
  }

  .primary-nav-item span,
  .workspace-section,
  .ai-ready span {
    display: none;
  }

  .sidebar-footer {
    justify-content: center;
    padding: 0;
  }

  .ai-ready {
    position: absolute;
    bottom: 12px;
    right: 8px;
  }
}
</style>
