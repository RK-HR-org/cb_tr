import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<'light' | 'dark' | 'auto'>(
    (localStorage.getItem('theme') as 'light' | 'dark' | 'auto') || 'auto'
  )

  function toggleTheme() {
    if (theme.value === 'light') {
      theme.value = 'dark'
    } else if (theme.value === 'dark') {
      theme.value = 'auto'
    } else {
      theme.value = 'light'
    }
  }

  function setTheme(t: 'light' | 'dark' | 'auto') {
    theme.value = t
  }

  function applyTheme() {
    const root = window.document.documentElement
    const isDark =
      theme.value === 'dark' ||
      (theme.value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    localStorage.setItem('theme', theme.value)
  }

  watch(theme, () => {
    applyTheme()
  })

  // Listen to OS theme changes if set to auto
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'auto') {
        applyTheme()
      }
    })
  }

  return {
    theme,
    toggleTheme,
    setTheme,
    applyTheme
  }
})
