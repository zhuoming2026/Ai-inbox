import { ref } from 'vue'

const SIDEBAR_STORAGE_KEY = 'ai-inbox:app-sidebar-visible'

export const isAppSidebarVisible = ref(true)

export function initAppSidebarVisibility() {
  if (typeof window === 'undefined') return

  const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
  if (stored === 'false') {
    isAppSidebarVisible.value = false
  } else if (stored === 'true') {
    isAppSidebarVisible.value = true
  }
}

export function toggleAppSidebar() {
  isAppSidebarVisible.value = !isAppSidebarVisible.value
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isAppSidebarVisible.value))
  }
}
