<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

let unsub: (() => void) | null = null
let settings: any = null

function applyTheme(theme: string) {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else if (theme) {
    document.documentElement.setAttribute('data-theme', theme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

onMounted(async () => {
  settings = await window.electronAPI?.getSettings()
  applyTheme(settings?.theme || 'light')

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (settings?.theme === 'system') {
      applyTheme('system')
    }
  })

  // Listen for inbox changes
  unsub = window.electronAPI?.onInboxUpdate(() => {
    window.dispatchEvent(new CustomEvent('inbox-updated'))
  })

  // Listen for settings changes (custom event from settings page)
  window.addEventListener('settings-changed', ((e: CustomEvent) => {
    settings = e.detail
    applyTheme(settings?.theme || 'light')
  }) as EventListener)
})

onUnmounted(() => {
  unsub?.()
})
</script>
