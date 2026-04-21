import { ref } from 'vue'
import type { Ref } from 'vue'

const currentTheme: Ref<string> = ref('light')

function resolveTheme(settings: Record<string, any> | undefined | null) {
  const lightTheme = settings?.lightTheme || 'light'
  const darkTheme = settings?.darkTheme || 'dark'
  const themeMode = settings?.themeMode || 'light'

  if (themeMode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? darkTheme : lightTheme
  }

  if (themeMode === 'dark') {
    return darkTheme
  }

  return lightTheme
}

export function useTheme() {
  const setTheme = async (theme: string) => {
    console.log('[Theme] setTheme called with:', theme)

    currentTheme.value = theme

    // 设置 data-theme 属性
    document.documentElement.setAttribute('data-theme', theme)
    console.log('[Theme] Applied theme:', theme)
  }

  const applyThemeFromSettings = async (settings: Record<string, any> | undefined | null) => {
    await setTheme(resolveTheme(settings))
  }

  const initTheme = async () => {
    try {
      const settings = await window.electronAPI?.getSettings()
      console.log('[Theme] Settings loaded:', settings)
      await applyThemeFromSettings(settings)
    } catch (e) {
      console.error('[Theme] Error loading theme:', e)
      await setTheme('light')
    }
  }

  return {
    currentTheme,
    setTheme,
    applyThemeFromSettings,
    initTheme,
  }
}
