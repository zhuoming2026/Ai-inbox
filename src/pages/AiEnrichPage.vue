<template>
  <div class="enrich-layout">
    <AppSidebar />
    <main class="enrich-page">
      <header class="enrich-header">
        <div>
          <h1>AI Enrich</h1>
          <p>Generic Link</p>
        </div>
        <n-button tertiary round :loading="enrichStore.loading" @click="refreshAll">
          刷新
        </n-button>
      </header>

      <section class="task-composer">
        <div class="composer-grid">
          <label class="field">
            <span>URL</span>
            <n-input v-model:value="url" placeholder="https://example.com/article" clearable />
          </label>
          <label class="field">
            <span>Instruction</span>
            <n-input
              v-model:value="instruction"
              type="textarea"
              placeholder="提炼关键观点、保留可引用片段"
              :autosize="{ minRows: 3, maxRows: 5 }"
            />
          </label>
        </div>
        <div class="composer-actions">
          <n-button
            type="primary"
            round
            :disabled="!url.trim() || creating"
            :loading="creating"
            @click="createAndRunTask"
          >
            创建并运行
          </n-button>
        </div>
      </section>

      <section class="task-toolbar">
        <div class="task-count">{{ enrichStore.tasks.length }} tasks</div>
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

        <article v-for="task in enrichStore.tasks" :key="task.id" class="task-row">
          <div class="task-main">
            <div class="task-title-line">
              <n-tag :type="statusType(task.status)" size="small" :bordered="false">
                {{ task.status }}
              </n-tag>
              <h2>{{ task.outputTitle || task.url }}</h2>
            </div>
            <a class="task-url" :href="task.url" target="_blank" rel="noreferrer">{{ task.url }}</a>
            <p v-if="task.instruction" class="task-instruction">{{ task.instruction }}</p>
            <p v-if="task.error" class="task-error">{{ task.error }}</p>
            <div class="task-meta">
              <span>{{ formatTime(task.createdAt) }}</span>
              <span v-if="task.outputPath" :title="task.outputPath">{{ outputName(task.outputPath) }}</span>
            </div>
          </div>

          <div class="task-actions">
            <n-button
              v-if="task.status === 'queued'"
              size="small"
              secondary
              :loading="enrichStore.isTaskRunning(task.id)"
              @click="runTask(task.id)"
            >
              Run
            </n-button>
            <n-button
              v-if="task.status === 'failed'"
              size="small"
              secondary
              type="warning"
              :loading="enrichStore.isTaskRunning(task.id)"
              @click="retryTask(task.id)"
            >
              Retry
            </n-button>
            <n-button
              v-if="task.outputPath"
              size="small"
              secondary
              @click="openResult(task.outputPath)"
            >
              Open Result
            </n-button>
            <n-button
              v-if="task.outputPath"
              size="small"
              secondary
              @click="copyMarkdown(task.outputPath)"
            >
              Copy Markdown
            </n-button>
            <n-button
              v-if="task.outputPath"
              size="small"
              secondary
              :disabled="!selectedWorkspaceId"
              @click="saveAsArticle(task)"
            >
              Save as Article
            </n-button>
            <n-button size="small" tertiary type="error" @click="deleteTask(task.id)">
              Delete
            </n-button>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NSelect, NTag, useMessage } from 'naive-ui'
import AppSidebar from '../components/AppSidebar.vue'
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

function statusType(status: V2EnrichTaskStatus) {
  if (status === 'succeeded') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'warning'
  return 'default'
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
.enrich-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: var(--bg-primary);
}

.enrich-page {
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow: auto;
  padding: 28px 32px 40px;
}

.enrich-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.enrich-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  line-height: 1.2;
}

.enrich-header p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.task-composer,
.task-row,
.empty-panel {
  border: 1px solid var(--border-strong);
  background: var(--surface-panel);
  box-shadow: var(--shadow-panel);
}

.task-composer {
  border-radius: 8px;
  padding: 18px;
  margin-bottom: 16px;
}

.composer-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.95fr) minmax(320px, 1.2fr);
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span,
.workspace-picker span {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.task-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 10px 0;
}

.task-count {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.workspace-picker {
  width: 280px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 10px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-panel {
  border-radius: 8px;
  padding: 30px;
  color: var(--text-muted);
  text-align: center;
}

.task-row {
  border-radius: 8px;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
}

.task-main {
  min-width: 0;
}

.task-title-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.task-title-line h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--text-base);
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-url {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin-top: 8px;
  overflow: hidden;
  color: var(--text-link);
  font-size: var(--text-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-instruction,
.task-error {
  margin: 10px 0 0;
  color: var(--text-body);
  font-size: var(--text-sm);
  line-height: 1.55;
}

.task-error {
  color: var(--color-danger-text);
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.task-actions {
  width: 154px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

@media (max-width: 1080px) {
  .composer-grid,
  .task-row {
    grid-template-columns: 1fr;
  }

  .task-actions {
    width: auto;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
