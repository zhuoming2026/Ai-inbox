import { ref } from 'vue'
import type { Ref } from 'vue'

const currentTheme: Ref<string> = ref('light')

export function useTheme() {
  const setTheme = async (theme: string) => {
    console.log('[Theme] setTheme called with:', theme)
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme = prefersDark ? 'dark' : 'light'
    }

    currentTheme.value = theme
    
    // 设置 data-theme 属性
    document.documentElement.setAttribute('data-theme', theme)
    console.log('[Theme] Applied theme:', theme)
  }

  const initTheme = async () => {
    try {
      const settings = await window.electronAPI?.getSettings()
      console.log('[Theme] Settings loaded:', settings)
      if (settings?.theme) {
        await setTheme(settings.theme)
      } else {
        await setTheme('light')
      }
    } catch (e) {
      console.error('[Theme] Error loading theme:', e)
      await setTheme('light')
    }
  }

  return {
    currentTheme,
    setTheme,
    initTheme,
  }
}