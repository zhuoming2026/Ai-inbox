<template>
  <ul class="workspace-tree">
    <li v-for="node in nodes" :key="node.id" class="workspace-tree-item" :data-type="node.type">
      <button
        v-if="node.type === 'file'"
        type="button"
        class="tree-node tree-file"
        :class="{ active: activePath === node.path }"
        :title="node.relativePath"
        @click="$emit('open-file', node.path)"
      >
        <n-icon class="tree-node-icon"><DocumentTextOutline /></n-icon>
        <span class="tree-node-label">{{ node.name.replace(/\.md$/i, '') }}</span>
      </button>

      <div v-else class="tree-folder">
        <div class="tree-node">
          <n-icon class="tree-node-icon"><FolderOpenOutline /></n-icon>
          <span class="tree-node-label">{{ node.name }}</span>
        </div>
        <AppSidebarTree
          v-if="node.children?.length"
          :nodes="node.children"
          :active-path="activePath"
          @open-file="$emit('open-file', $event)"
        />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { DocumentTextOutline, FolderOpenOutline } from '@vicons/ionicons5'
import type { WorkspaceFileTreeNode } from '../shared/v2-workspace'

defineProps<{
  nodes: WorkspaceFileTreeNode[]
  activePath?: string
}>()

defineEmits<{
  (event: 'open-file', path: string): void
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
