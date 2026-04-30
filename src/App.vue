<template>
  <n-message-provider>
    <div
      class="app-shell"
      :class="{
        'app-shell--sidebar-hidden': !isAppSidebarVisible,
        'app-shell--electron': isElectronRuntime,
      }"
    >
      <div class="app-sidebar-top">
        <div class="window-nav-controls">
          <button
            type="button"
            class="window-nav-button"
            :title="isAppSidebarVisible ? '隐藏侧边栏' : '展开侧边栏'"
            :aria-label="isAppSidebarVisible ? '隐藏侧边栏' : '展开侧边栏'"
            @click="toggleAppSidebar"
          >
            <n-icon><MenuOutline /></n-icon>
          </button>
          <button
            type="button"
            class="window-nav-button"
            title="返回"
            aria-label="返回"
            :disabled="!canGoBack"
            @click="goBack"
          >
            <n-icon><ChevronBackOutline /></n-icon>
          </button>
          <button
            type="button"
            class="window-nav-button"
            title="前进"
            aria-label="前进"
            :disabled="!canGoForward"
            @click="goForward"
          >
            <n-icon><ChevronForwardOutline /></n-icon>
          </button>
        </div>
      </div>
      <AppSidebar />
      <main class="app-content">
        <router-view />
      </main>
    </div>
  </n-message-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NMessageProvider } from 'naive-ui'
import { ChevronBackOutline, ChevronForwardOutline, MenuOutline } from '@vicons/ionicons5'
import AppSidebar from './components/AppSidebar.vue'
import { useTheme } from './composables/useTheme'
import { initAppSidebarVisibility, isAppSidebarVisible, toggleAppSidebar } from './composables/useAppChrome'

let unsub: (() => void) | null | undefined = null
let settings: any = null

const { initTheme, applyThemeFromSettings } = useTheme()
const router = useRouter()
const historyIndex = ref(0)
const historyTop = ref(0)
const pendingHistoryDirection = ref<'back' | 'forward' | null>(null)
const isElectronRuntime = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')
const canGoBack = computed(() => historyIndex.value > 0)
const canGoForward = computed(() => historyIndex.value < historyTop.value)

const removeHistoryHook = router.afterEach((to, from) => {
  if (!from.name && from.fullPath === '/') {
    historyIndex.value = 0
    historyTop.value = 0
    return
  }

  const direction = pendingHistoryDirection.value
  pendingHistoryDirection.value = null
  if (direction === 'back') {
    historyIndex.value = Math.max(0, historyIndex.value - 1)
  } else if (direction === 'forward') {
    historyIndex.value = Math.min(historyTop.value, historyIndex.value + 1)
  } else if (to.fullPath !== from.fullPath) {
    historyIndex.value += 1
    historyTop.value = historyIndex.value
  }
})

function goBack() {
  if (!canGoBack.value) return
  pendingHistoryDirection.value = 'back'
  router.back()
}

function goForward() {
  if (!canGoForward.value) return
  pendingHistoryDirection.value = 'forward'
  router.forward()
}

onMounted(async () => {
  initAppSidebarVisibility()
  settings = await window.electronAPI?.getSettings()
  console.log('[App] Initial settings:', settings)
  await initTheme()

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (settings?.themeMode === 'system') {
      applyThemeFromSettings(settings)
    }
  })

  // Listen for inbox changes
  unsub = window.electronAPI?.onInboxUpdate(() => {
    window.dispatchEvent(new CustomEvent('inbox-updated'))
  })

  // Listen for settings changes (custom event from settings page)
  window.addEventListener('settings-changed', ((e: CustomEvent) => {
    console.log('[App] settings-changed event received:', e.detail)
    settings = e.detail
    applyThemeFromSettings(settings)
  }) as EventListener)
  
  console.log('[App] Event listeners registered')
})

onUnmounted(() => {
  unsub?.()
  removeHistoryHook()
})
</script>

<style scoped>
:global(:root) {
  --app-topbar-height: 46px;
  --app-sidebar-width: 228px;
  --app-navbar-control-offset: 128px;
  --app-navbar-electron-control-offset: 198px;
}

.app-shell {
  width: 100%;
  height: 100vh;
  display: grid;
  grid-template-columns: var(--app-sidebar-width) minmax(0, 1fr);
  grid-template-rows: var(--app-topbar-height) minmax(0, 1fr);
  position: relative;
  overflow: hidden;
  background: var(--bg-primary);
}

.app-shell--sidebar-hidden {
  grid-template-columns: minmax(0, 1fr);
}

.app-sidebar-top {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  border-right: 1px solid var(--app-sidebar-border, var(--border-default));
  border-bottom: 1px solid var(--app-sidebar-border-subtle, var(--border-subtle));
  background: var(--app-sidebar-bg, var(--bg-sidebar));
  display: flex;
  align-items: center;
  padding-left: 12px;
  -webkit-app-region: drag;
}

.app-shell--electron .app-sidebar-top {
  padding-left: 82px;
}

.app-shell--sidebar-hidden .app-sidebar-top {
  position: absolute;
  z-index: calc(var(--z-fixed) + 1);
  top: 0;
  left: 0;
  width: auto;
  height: var(--app-topbar-height);
  border: 0;
  background: transparent;
  padding-left: 12px;
}

.app-shell--sidebar-hidden.app-shell--electron .app-sidebar-top {
  padding-left: 82px;
}

.app-content {
  grid-column: 2;
  grid-row: 1 / span 2;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.app-shell--sidebar-hidden .app-content {
  grid-column: 1;
}

.app-content :deep(> .n-config-provider) {
  height: 100%;
  min-height: 0;
}

.app-content :deep(.content-page) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: var(--bg-primary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-content :deep(.content-navbar) {
  height: var(--app-topbar-height);
  min-height: var(--app-topbar-height);
  flex: 0 0 var(--app-topbar-height);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: transparent;
  border-bottom: 1px solid rgba(42, 37, 24, 0.08);
}

.app-content :deep(.content-title) {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
}

.app-content :deep(.content-body) {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.app-shell--sidebar-hidden .app-content :deep(.content-navbar) {
  padding-left: var(--app-navbar-control-offset);
}

.app-shell--sidebar-hidden.app-shell--electron .app-content :deep(.content-navbar) {
  padding-left: var(--app-navbar-electron-control-offset);
}

.window-nav-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.window-nav-button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: var(--action-icon-bg, rgba(255, 255, 255, 0.56));
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--app-sidebar-border-subtle, rgba(42, 37, 24, 0.06));
  transition: background var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
}

.window-nav-button:hover:not(:disabled) {
  background: var(--action-icon-bg-hover, rgba(255, 255, 255, 0.88));
  color: var(--text-primary);
}

.window-nav-button:disabled {
  cursor: default;
  opacity: 0.38;
}
</style>
