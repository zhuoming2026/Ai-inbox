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

      <div v-else class="tree-folder">
        <div class="tree-node">
          <n-icon class="tree-node-icon"><FolderOpenOutline /></n-icon>
          <span class="tree-node-label">{{ node.name }}</span>
        </div>
        <AppSidebarTree
          v-if="node.children?.length"
          :nodes="node.children"
          :active-path="activePath"
          :editable="editable"
          @open-file="$emit('open-file', $event)"
          @rename-file="$emit('rename-file', $event)"
          @delete-file="$emit('delete-file', $event)"
        />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { CreateOutline, DocumentTextOutline, FolderOpenOutline, TrashOutline } from '@vicons/ionicons5'
import type { WorkspaceFileTreeNode } from '../shared/v2-workspace'

defineProps<{
  nodes: WorkspaceFileTreeNode[]
  activePath?: string
  editable?: boolean
}>()

defineEmits<{
  (event: 'open-file', path: string): void
  (event: 'rename-file', node: WorkspaceFileTreeNode): void
  (event: 'delete-file', node: WorkspaceFileTreeNode): void
}>()
</script>

<style scoped>
.workspace-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.workspace-tree .workspace-tree {
  padding-left: 14px;
}

.workspace-tree-item {
  margin: 2px 0;
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
  gap: 8px;
  padding: 5px 8px;
  font: inherit;
  font-size: 12px;
  text-align: left;
}

.tree-file {
  cursor: pointer;
}

.tree-file:hover,
.tree-file.active {
  background: var(--surface-control-hover);
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
  background: linear-gradient(90deg, transparent, var(--surface-panel) 28%);
}

.workspace-tree-item:hover > .tree-actions,
.tree-file.active + .tree-actions {
  display: inline-flex;
}

.tree-action {
  width: 24px;
  height: 24px;
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
  background: var(--surface-control-hover);
  color: var(--text-primary);
}

.tree-action.danger:hover {
  color: var(--color-danger-text);
}

.tree-node-icon {
  flex: 0 0 auto;
  font-size: 15px;
  opacity: 0.72;
}

.tree-node-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
