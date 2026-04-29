<template>
  <aside class="app-sidebar">
    <div class="traffic-light-space" aria-hidden="true"></div>

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
      <button type="button" class="primary-nav-item" disabled>
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
            :nodes="workspaceStore.getTree(workspace.id)"
            :active-path="activeWorkspacePath"
            :editable="canManageWorkspaceFiles(workspace)"
            @open-file="openWorkspaceFile"
            @rename-file="renameWorkspaceFile"
            @delete-file="deleteWorkspaceFile"
          />
        </div>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage, NIcon } from 'naive-ui'
import {
  AddOutline,
  CloseOutline,
  DocumentTextOutline,
  FileTrayFullOutline,
  FolderOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import AppSidebarTree from './AppSidebarTree.vue'
import { useWorkspaceStore } from '../stores/workspace'
import type { WorkspaceConfig, WorkspaceFileTreeNode } from '../shared/v2-workspace'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const workspaceStore = useWorkspaceStore()

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

function handleInboxUpdated() {
  void workspaceStore.refresh()
}

onMounted(() => {
  void workspaceStore.refresh()
  window.addEventListener('inbox-updated', handleInboxUpdated)
})

onUnmounted(() => {
  window.removeEventListener('inbox-updated', handleInboxUpdated)
})
</script>

<style scoped>
.app-sidebar {
  width: 252px;
  flex: 0 0 252px;
  height: 100vh;
  min-height: 0;
  border-right: 1px solid var(--border-strong);
  background: var(--surface-panel);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.traffic-light-space {
  height: 52px;
  flex: 0 0 52px;
  -webkit-app-region: drag;
}

.primary-nav {
  padding: 0 12px 14px;
  border-bottom: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  height: 36px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.primary-nav-item:hover,
.primary-nav-item.active {
  background: var(--surface-control-hover);
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
  padding: 14px 10px;
}

.workspace-header {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 0 8px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.icon-button,
.workspace-action,
.remove-workspace {
  width: 26px;
  height: 26px;
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
  background: var(--surface-control-hover);
  color: var(--text-primary);
}

.workspace-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 2px 24px;
}

.workspace-block {
  margin-bottom: 12px;
}

.workspace-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.workspace-title {
  flex: 1;
  min-width: 0;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 650;
}

.workspace-title span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
