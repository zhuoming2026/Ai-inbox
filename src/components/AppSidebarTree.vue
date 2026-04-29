<template>
  <ul class="workspace-tree">
    <li v-for="node in nodes" :key="node.id" class="workspace-tree-item" :data-type="node.type">
      <template v-if="node.type === 'file'">
        <button
          type="button"
          class="tree-node tree-file"
          :class="{ active: activePath === node.path }"
          :title="node.relativePath"
          @click="$emit('open-file', node.path)"
        >
          <n-icon class="tree-node-icon"><DocumentTextOutline /></n-icon>
          <span class="tree-node-label">{{ node.name.replace(/\.md$/i, '') }}</span>
        </button>
        <div v-if="editable" class="tree-actions">
          <button type="button" class="tree-action" title="重命名" @click.stop="$emit('rename-file', node)">
            <n-icon><CreateOutline /></n-icon>
          </button>
          <button type="button" class="tree-action danger" title="删除" @click.stop="$emit('delete-file', node)">
            <n-icon><TrashOutline /></n-icon>
          </button>
        </div>
      </template>

      <div v-else class="tree-folder" :data-collapsed="isCollapsed(node.path)">
        <button type="button" class="tree-node tree-folder-button" @click="$emit('toggle-folder', node.path)">
          <n-icon class="tree-node-disclosure">
            <ChevronForwardOutline v-if="isCollapsed(node.path)" />
            <ChevronDownOutline v-else />
          </n-icon>
          <n-icon class="tree-node-icon"><FolderOpenOutline /></n-icon>
          <span class="tree-node-label">{{ node.name }}</span>
        </button>
        <AppSidebarTree
          v-if="node.children?.length && !isCollapsed(node.path)"
          :nodes="node.children"
          :active-path="activePath"
          :editable="editable"
          :collapsed-paths="collapsedPaths"
          @open-file="$emit('open-file', $event)"
          @toggle-folder="$emit('toggle-folder', $event)"
          @rename-file="$emit('rename-file', $event)"
          @delete-file="$emit('delete-file', $event)"
        />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import {
  ChevronDownOutline,
  ChevronForwardOutline,
  CreateOutline,
  DocumentTextOutline,
  FolderOpenOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import type { WorkspaceFileTreeNode } from '../shared/v2-workspace'

const props = defineProps<{
  nodes: WorkspaceFileTreeNode[]
  activePath?: string
  editable?: boolean
  collapsedPaths?: string[]
}>()

defineEmits<{
  (event: 'open-file', path: string): void
  (event: 'toggle-folder', path: string): void
  (event: 'rename-file', node: WorkspaceFileTreeNode): void
  (event: 'delete-file', node: WorkspaceFileTreeNode): void
}>()

function isCollapsed(path: string) {
  return props.collapsedPaths?.includes(path) ?? false
}
</script>

<style scoped>
.workspace-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.workspace-tree .workspace-tree {
  padding-left: 12px;
}

.workspace-tree-item {
  margin: 1px 0;
  position: relative;
}

.tree-node {
  width: 100%;
  min-height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  font: inherit;
  font-size: 12px;
  text-align: left;
}

.tree-file {
  cursor: pointer;
}

.tree-folder-button {
  cursor: pointer;
}

.tree-file:hover,
.tree-folder-button:hover {
  background: rgba(42, 37, 24, 0.045);
  color: var(--text-primary);
}

.tree-file.active {
  background: #efede4;
  box-shadow: inset 0 0 0 1px rgba(42, 37, 24, 0.04);
  color: var(--text-primary);
}

.tree-actions {
  position: absolute;
  top: 1px;
  right: 4px;
  display: none;
  align-items: center;
  gap: 2px;
  padding-left: 16px;
  background: linear-gradient(90deg, transparent, #f8f7f1 28%);
}

.workspace-tree-item:hover > .tree-actions,
.tree-file.active + .tree-actions {
  display: inline-flex;
}

.tree-action {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tree-action:hover {
  background: rgba(42, 37, 24, 0.055);
  color: var(--text-primary);
}

.tree-action.danger:hover {
  color: var(--color-danger-text);
}

.tree-node-icon {
  flex: 0 0 auto;
  font-size: 14px;
  opacity: 0.72;
}

.tree-node-disclosure {
  flex: 0 0 auto;
  width: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.tree-node-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
