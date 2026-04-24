/**
 * useImportedThemes
 * 管理导入主题的加载、注入、导入、删除。
 */

import { ref, watch } from 'vue'
import type { ImportedThemeMetadata, TyporaThemeImportDraft } from '../shared/imported-theme'

const IMPORTED_STYLE_ID = 'ai-inbox-imported-theme-style'
const BUILT_IN_THEME_IDS = new Set(['default', 'serif', 'typora-github'])

let currentInjectedId: string | null = null

function injectThemeCss(id: string, css: string) {
  // 移除旧 style
  const existing = document.getElementById(IMPORTED_STYLE_ID)
  if (existing) existing.remove()

  // 注入新 style
  const style = document.createElement('style')
  style.id = IMPORTED_STYLE_ID
  style.setAttribute('data-imported-theme', id)
  style.textContent = css
  document.head.appendChild(style)
  currentInjectedId = id

  // 设置 data attribute 到根元素
  document.documentElement.setAttribute('data-ai-theme', id)
}

function removeInjectedCss() {
  const existing = document.getElementById(IMPORTED_STYLE_ID)
  if (existing) existing.remove()
  document.documentElement.removeAttribute('data-ai-theme')
  currentInjectedId = null
}

export function useImportedThemes() {
  const importedThemes = ref<ImportedThemeMetadata[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadThemes() {
    loading.value = true
    error.value = null
    try {
      const themes = await window.electronAPI?.theme.listImported()
      importedThemes.value = Array.isArray(themes) ? themes : []
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function previewTypora(): Promise<{ ok: boolean; draft: TyporaThemeImportDraft | null }> {
    try {
      return await window.electronAPI?.theme.previewTypora() ?? { ok: false, draft: null }
    } catch (e) {
      return { ok: false, draft: null }
    }
  }

  async function saveImported(data: { draft: TyporaThemeImportDraft; name: string; activate: boolean }) {
    try {
      const plainData = JSON.parse(JSON.stringify(data))
      return await window.electronAPI?.theme.saveImported(plainData) ?? { ok: false, error: 'Electron API 不可用' }
    } catch (e) {
      const message = e instanceof Error ? e.message : '保存主题失败'
      console.error('[ai-inbox] save imported theme failed:', e)
      return { ok: false, error: message }
    }
  }

  async function deleteTheme(id: string) {
    try {
      const ok = await window.electronAPI?.theme.delete(id)
      if (ok) {
        if (currentInjectedId === id) {
          removeInjectedCss()
        }
        await loadThemes()
      }
      return Boolean(ok)
    } catch {
      return false
    }
  }

  async function activateTheme(id: string) {
    if (BUILT_IN_THEME_IDS.has(id)) {
      const existing = document.getElementById(IMPORTED_STYLE_ID)
      if (existing) existing.remove()
      document.documentElement.setAttribute('data-ai-theme', id)
      currentInjectedId = null
      return true
    }

    // 直接调用 theme.read(id)，不依赖 importedThemes 是否已加载
    const data = await window.electronAPI?.theme.read(id)
    if (!data?.css || !data.metadata) return false

    injectThemeCss(id, data.css)

    // 如果列表中还没有这个 metadata，合并进去
    if (!importedThemes.value.some((theme) => theme.id === id)) {
      importedThemes.value = [...importedThemes.value, data.metadata]
    }

    return true
  }

  function deactivateTheme() {
    removeInjectedCss()
  }

  // 监听设置变化，自动注入当前选中的导入主题
  watch(
    () => window.electronAPI,
    async () => {
      await loadThemes()
    },
    { immediate: true },
  )

  return {
    importedThemes,
    loading,
    error,
    loadThemes,
    previewTypora,
    saveImported,
    deleteTheme,
    activateTheme,
    deactivateTheme,
  }
}
