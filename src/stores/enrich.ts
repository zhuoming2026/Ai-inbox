import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  V2EnrichCreateTaskInput,
  V2EnrichSaveAsArticleInput,
  V2EnrichTask,
} from '../shared/v2-enrich'

export const useEnrichStore = defineStore('enrich', () => {
  const tasks = ref<V2EnrichTask[]>([])
  const loading = ref(false)
  const runningTaskIds = ref<string[]>([])

  const runningTaskIdSet = computed(() => new Set(runningTaskIds.value))

  async function loadTasks() {
    loading.value = true
    try {
      tasks.value = await window.electronAPI?.enrich?.listTasks() ?? []
    } finally {
      loading.value = false
    }
  }

  async function createTask(input: V2EnrichCreateTaskInput) {
    const task = await window.electronAPI?.enrich?.createTask(input)
    if (task) {
      tasks.value = [task, ...tasks.value.filter((item) => item.id !== task.id)]
    }
    return task ?? null
  }

  async function runTask(id: string) {
    if (runningTaskIdSet.value.has(id)) return null
    runningTaskIds.value = [...runningTaskIds.value, id]
    markTaskRunning(id)
    try {
      const task = await window.electronAPI?.enrich?.runTask(id)
      if (task) upsertTask(task)
      return task ?? null
    } finally {
      runningTaskIds.value = runningTaskIds.value.filter((taskId) => taskId !== id)
    }
  }

  async function retryTask(id: string) {
    if (runningTaskIdSet.value.has(id)) return null
    runningTaskIds.value = [...runningTaskIds.value, id]
    markTaskRunning(id)
    try {
      const task = await window.electronAPI?.enrich?.retryTask(id)
      if (task) upsertTask(task)
      return task ?? null
    } finally {
      runningTaskIds.value = runningTaskIds.value.filter((taskId) => taskId !== id)
    }
  }

  async function deleteTask(id: string) {
    await window.electronAPI?.enrich?.deleteTask(id)
    tasks.value = tasks.value.filter((task) => task.id !== id)
  }

  async function readOutput(path: string) {
    return await window.electronAPI?.enrich?.readOutput(path) ?? null
  }

  async function saveAsArticle(input: V2EnrichSaveAsArticleInput) {
    return await window.electronAPI?.enrich?.saveAsArticle(input) ?? null
  }

  function upsertTask(task: V2EnrichTask) {
    tasks.value = [task, ...tasks.value.filter((item) => item.id !== task.id)]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  function isTaskRunning(id: string) {
    return runningTaskIdSet.value.has(id)
  }

  function markTaskRunning(id: string) {
    tasks.value = tasks.value.map((task) => task.id === id
      ? {
          ...task,
          status: 'running',
          error: undefined,
          updatedAt: new Date().toISOString(),
        }
      : task)
  }

  return {
    tasks,
    loading,
    runningTaskIds,
    loadTasks,
    createTask,
    runTask,
    retryTask,
    deleteTask,
    readOutput,
    saveAsArticle,
    isTaskRunning,
  }
})
