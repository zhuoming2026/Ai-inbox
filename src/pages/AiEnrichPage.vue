<template>
  <main class="enrich-page content-page">
      <header class="enrich-header content-navbar">
        <h1 class="content-title">AI Enrich</h1>
        <n-button size="small" secondary :loading="enrichStore.loading" @click="refreshAll">
          刷新
        </n-button>
      </header>

    <div class="enrich-content content-body">
      <section class="task-composer">
        <div class="composer-fields">
          <label class="field">
            <span>URL</span>
            <n-input v-model:value="url" placeholder="https://example.com/article" clearable class="url-input" />
          </label>
          <label class="field">
            <span>Description / Instruction</span>
            <n-input
              v-model:value="instruction"
              type="textarea"
              placeholder="Tell AI what to focus on, or leave it empty for default parsing..."
              class="instruction-input"
            />
          </label>
        </div>
        <div class="composer-actions">
          <div class="platform-tabs" aria-label="Platform">
            <button type="button" class="platform-tab active">Generic Link</button>
            <button type="button" class="platform-tab" disabled>Bilibili</button>
            <button type="button" class="platform-tab" disabled>YouTube</button>
            <button type="button" class="platform-tab" disabled>Douyin</button>
          </div>
          <n-button
            secondary
            :disabled="!url.trim() || creating"
            :loading="creating"
            @click="createAndRunTask"
          >
            Create Task
          </n-button>
        </div>
      </section>

      <section class="task-toolbar">
        <div class="task-count">Queue</div>
        <label class="workspace-picker">
          <span>Save to</span>
          <n-select
            v-model:value="selectedWorkspaceId"
            size="small"
            :options="userWorkspaceOptions"
            placeholder="选择 user workspace"
            :disabled="!userWorkspaceOptions.length"
          />
        </label>
      </section>

      <section class="task-list" aria-label="Enrich tasks">
        <div v-if="enrichStore.loading && !enrichStore.tasks.length" class="empty-panel">正在读取任务...</div>
        <div v-else-if="!enrichStore.tasks.length" class="empty-panel">暂无 Enrich 任务</div>
        <div v-else class="task-table-wrap">
          <table class="task-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Status</th>
                <th>URL</th>
                <th>Instruction</th>
                <th>From</th>
                <th>Output</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(task, index) in enrichStore.tasks" :key="task.id">
                <td>{{ index + 1 }}</td>
                <td><span class="status-pill" :data-status="task.status">{{ statusLabel(task.status) }}</span></td>
                <td><a class="task-url" :href="task.url" target="_blank" rel="noreferrer">{{ task.url }}</a></td>
                <td class="truncate" :title="task.error || task.instruction">{{ task.error || task.instruction || 'Default parsing' }}</td>
                <td class="truncate" :title="task.fromPath || ''">{{ task.fromPath ? outputName(task.fromPath) : 'Direct' }}</td>
                <td class="truncate" :title="task.outputPath || ''">{{ task.outputPath ? outputName(task.outputPath) : '—' }}</td>
                <td>{{ formatTime(task.createdAt) }}</td>
                <td>
                  <div class="task-actions">
                    <button v-if="task.status === 'queued'" type="button" class="action-btn" :disabled="enrichStore.isTaskRunning(task.id)" @click="runTask(task.id)">Run</button>
                    <button v-if="task.status === 'failed'" type="button" class="action-btn" :disabled="enrichStore.isTaskRunning(task.id)" @click="retryTask(task.id)">Retry</button>
                    <button v-if="task.outputPath" type="button" class="action-btn" @click="openResult(task.outputPath)">Open Result</button>
                    <button v-if="task.outputPath" type="button" class="action-btn" @click="copyMarkdown(task.outputPath)">Copy Markdown</button>
                    <button v-if="task.outputPath" type="button" class="action-btn" :disabled="!selectedWorkspaceId" @click="saveAsArticle(task)">Save as Article</button>
                    <button type="button" class="action-btn danger" @click="deleteTask(task.id)">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer class="enrich-footer">
        <span>{{ enrichStore.tasks.length }} tasks</span>
        <span class="running">{{ statusCounts.running }} running</span>
        <span class="success">{{ statusCounts.succeeded }} success</span>
        <span class="failed">{{ statusCounts.failed }} failed</span>
        <span class="output-path">outputs: ~/ai-inbox/enrich/outputs</span>
      </footer>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NSelect, useMessage } from 'naive-ui'
import { useEnrichStore } from '../stores/enrich'
import { useWorkspaceStore } from '../stores/workspace'
import type { V2EnrichTask, V2EnrichTaskStatus } from '../shared/v2-enrich'

const router = useRouter()
const message = useMessage()
const enrichStore = useEnrichStore()
const workspaceStore = useWorkspaceStore()

const url = ref('')
const instruction = ref('')
const creating = ref(false)
const selectedWorkspaceId = ref<string | null>(null)

const userWorkspaceOptions = computed(() =>
  workspaceStore.enabledWorkspaces
    .filter((workspace) => workspace.kind === 'user' && !workspace.readonly)
    .map((workspace) => ({
      label: workspace.name,
      value: workspace.id,
    }))
)

const statusCounts = computed(() => enrichStore.tasks.reduce((counts, task) => {
  counts[task.status] += 1
  return counts
}, {
  queued: 0,
  running: 0,
  succeeded: 0,
  failed: 0,
} as Record<V2EnrichTaskStatus, number>))

watch(userWorkspaceOptions, (options) => {
  if (!selectedWorkspaceId.value && options.length) {
    selectedWorkspaceId.value = options[0].value
  }
}, { immediate: true })

onMounted(() => {
  void refreshAll()
})

async function refreshAll() {
  await Promise.all([
    enrichStore.loadTasks(),
    workspaceStore.refresh(),
  ])
}

async function createAndRunTask() {
  creating.value = true
  try {
    const task = await enrichStore.createTask({
      url: url.value,
      instruction: instruction.value,
    })
    if (!task) return
    url.value = ''
    instruction.value = ''
    message.success('任务已创建')
    void enrichStore.runTask(task.id).then((result) => {
      if (result?.status === 'succeeded') {
        void workspaceStore.loadTrees()
      }
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '任务创建失败')
  } finally {
    creating.value = false
  }
}

async function runTask(id: string) {
  const result = await enrichStore.runTask(id)
  if (result?.status === 'succeeded') {
    void workspaceStore.loadTrees()
  }
}

async function retryTask(id: string) {
  const result = await enrichStore.retryTask(id)
  if (result?.status === 'succeeded') {
    void workspaceStore.loadTrees()
  }
}

async function deleteTask(id: string) {
  const confirmed = window.confirm('删除这条 Enrich 任务记录？输出文件会保留。')
  if (!confirmed) return
  try {
    await enrichStore.deleteTask(id)
    message.success('任务已删除')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '任务删除失败')
  }
}

function openResult(path: string) {
  router.push({ name: 'article-path', params: { encodedPath: path } })
}

async function copyMarkdown(path: string) {
  try {
    const raw = await enrichStore.readOutput(path)
    if (typeof raw !== 'string') throw new Error('输出文件不存在')
    await navigator.clipboard.writeText(raw)
    message.success('已复制 Markdown')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '复制失败')
  }
}

async function saveAsArticle(task: V2EnrichTask) {
  if (!task.outputPath || !selectedWorkspaceId.value) return
  const filename = window.prompt('保存为 Markdown 文件', defaultArticleFilename(task))?.trim()
  if (!filename) return

  try {
    const result = await enrichStore.saveAsArticle({
      outputPath: task.outputPath,
      workspaceId: selectedWorkspaceId.value,
      filename,
    })
    await workspaceStore.refresh()
    if (result?.path) {
      message.success('已保存为文章')
      await router.push({ name: 'article-path', params: { encodedPath: result.path } })
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存文章失败')
  }
}

function statusLabel(status: V2EnrichTaskStatus) {
  if (status === 'succeeded') return 'Success'
  if (status === 'failed') return 'Failed'
  return status[0].toUpperCase() + status.slice(1)
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function outputName(path: string) {
  return path.split('/').pop() || path
}

function defaultArticleFilename(task: V2EnrichTask) {
  const title = task.outputTitle || outputName(task.outputPath || '') || 'enrich-output'
  const safe = title
    .replace(/\.md$/i, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 72)
    .replace(/^-+|-+$/g, '') || 'enrich-output'
  return `${safe}.md`
}
</script>

<style scoped>
.enrich-page {
  flex: 1;
  min-width: 0;
  padding: 0;
}

.enrich-content {
  display: grid;
  grid-template-rows: 184px 42px minmax(0, 1fr) 28px;
  gap: 0;
  padding: 0 18px;
}

.enrich-header {
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 0 18px;
}

.enrich-header h1 {
  flex: 0 0 auto;
}

.task-composer,
.empty-panel {
  border: 1px solid rgba(42, 37, 24, 0.1);
  background: var(--surface-panel);
  box-shadow: 0 10px 26px rgba(40, 32, 16, 0.04);
}

.task-composer {
  border-radius: 12px;
  padding: 14px;
  display: grid;
  gap: 10px;
  min-height: 0;
}

.composer-fields {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(360px, 1.1fr);
  gap: 12px;
  min-height: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.field span,
.workspace-picker span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.url-input :deep(.n-input-wrapper) {
  min-height: 36px;
}

.instruction-input :deep(.n-input-wrapper) {
  min-height: 88px;
  align-items: stretch;
}

.instruction-input :deep(textarea) {
  min-height: 88px !important;
  resize: none;
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.platform-tabs {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  border: 1px solid rgba(66, 60, 44, 0.12);
  border-radius: 9px;
  overflow: hidden;
  background: #fffefa;
}

.platform-tab {
  height: 32px;
  border: 0;
  border-right: 1px solid rgba(66, 60, 44, 0.1);
  background: transparent;
  color: var(--text-secondary);
  padding: 0 11px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.platform-tab:last-child {
  border-right: 0;
}

.platform-tab.active {
  background: rgba(42, 37, 24, 0.06);
  color: var(--text-primary);
  font-weight: 620;
}

.platform-tab:disabled {
  opacity: 0.46;
  cursor: not-allowed;
}

.task-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 42px;
}

.task-count {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 650;
}

.workspace-picker {
  width: 280px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 10px;
}

.task-list {
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(42, 37, 24, 0.1);
  border-radius: 12px;
  background: var(--surface-panel);
}

.empty-panel {
  height: 100%;
  border: 0;
  box-shadow: none;
  padding: 30px;
  color: var(--text-muted);
  text-align: center;
}

.task-table-wrap {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.task-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 12px;
}

.task-table th,
.task-table td {
  height: 32px;
  padding: 0 8px;
  border-bottom: 1px solid rgba(42, 37, 24, 0.06);
  text-align: left;
  vertical-align: middle;
  color: var(--text-secondary);
}

.task-table th {
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 650;
}

.task-table tbody tr:hover {
  background: rgba(42, 37, 24, 0.035);
}

.task-table th:nth-child(1),
.task-table td:nth-child(1) {
  width: 40px;
}

.task-table th:nth-child(2),
.task-table td:nth-child(2) {
  width: 90px;
}

.task-table th:nth-child(5),
.task-table td:nth-child(5) {
  width: 120px;
}

.task-table th:nth-child(6),
.task-table td:nth-child(6) {
  width: 140px;
}

.task-table th:nth-child(7),
.task-table td:nth-child(7) {
  width: 116px;
}

.task-table th:nth-child(8),
.task-table td:nth-child(8) {
  width: 340px;
}

.task-url {
  display: block;
  overflow: hidden;
  color: var(--text-link);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  min-width: 64px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 650;
  background: rgba(42, 37, 24, 0.06);
  color: var(--text-secondary);
}

.status-pill[data-status='running'] {
  background: rgba(31, 111, 235, 0.08);
  color: #1f6feb;
}

.status-pill[data-status='succeeded'] {
  background: rgba(76, 175, 90, 0.1);
  color: #2e7d32;
}

.status-pill[data-status='failed'] {
  background: rgba(182, 91, 91, 0.1);
  color: #b65b5b;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}

.action-btn {
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  padding: 0 5px;
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
  white-space: nowrap;
}

.action-btn:hover {
  background: rgba(42, 37, 24, 0.055);
  color: var(--text-primary);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.danger {
  color: #b65b5b;
}

.action-btn.danger:hover {
  background: rgba(182, 91, 91, 0.08);
  color: #9f4343;
}

.enrich-footer {
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 2px;
  color: var(--text-muted);
  font-size: 11.5px;
}

.enrich-footer .running {
  color: #1f6feb;
}

.enrich-footer .success {
  color: #2e7d32;
}

.enrich-footer .failed {
  color: #b65b5b;
}

.output-path {
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1080px) {
  .enrich-page {
    overflow: auto;
    padding: 0;
  }

  .enrich-content {
    grid-template-rows: auto;
    padding: 0 10px 14px;
  }

  .enrich-header {
    padding: 0 10px;
  }

  .composer-fields {
    grid-template-columns: 1fr;
  }

  .task-composer {
    min-height: 260px;
  }

  .composer-actions {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .platform-tabs {
    max-width: 100%;
    overflow-x: auto;
  }

  .workspace-picker {
    width: min(190px, 48vw);
  }

  .task-toolbar {
    gap: 8px;
  }

  .task-list {
    min-height: 360px;
    overflow-x: auto;
  }

  .task-table {
    min-width: 980px;
  }
}
</style>
