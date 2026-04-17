import { ref } from 'vue'
import type { Ref } from 'vue'

const currentTheme: Ref<string> = ref('light')

let linkEl: HTMLLinkElement | null = null

export function useTheme() {
  const setTheme = async (theme: string) => {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme = prefersDark ? 'dark' : 'light'
    }

    currentTheme.value = theme

    if (!linkEl) {
      linkEl = document.createElement('link')
      linkEl.rel = 'stylesheet'
      document.head.appendChild(linkEl)
    }

    linkEl.href = `/themes/${theme}.css`
  }

  const initTheme = async () => {
    try {
      const settings = await window.electronAPI?.getSettings()
      if (settings?.theme) {
        await setTheme(settings.theme)
      } else {
        await setTheme('light')
      }
    } catch {
      await setTheme('light')
    }
  }

  return {
    currentTheme,
    setTheme,
    initTheme,
  }
}