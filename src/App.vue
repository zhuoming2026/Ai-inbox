<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTheme } from './composables/useTheme'

let unsub: (() => void) | null | undefined = null
let settings: any = null

const { setTheme, initTheme } = useTheme()

onMounted(async () => {
  settings = await window.electronAPI?.getSettings()
  await initTheme()

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (settings?.theme === 'system') {
      setTheme('system')
    }
  })

  // Listen for inbox changes
  unsub = window.electronAPI?.onInboxUpdate(() => {
    window.dispatchEvent(new CustomEvent('inbox-updated'))
  })

  // Listen for settings changes (custom event from settings page)
  window.addEventListener('settings-changed', ((e: CustomEvent) => {
    settings = e.detail
    setTheme(settings?.theme || 'light')
  }) as EventListener)
})

onUnmounted(() => {
  unsub?.()
})
</script>