<script setup lang="ts">
import { 
  NConfigProvider, 
  NMessageProvider, 
  NDialogProvider, 
  NNotificationProvider, 
  darkTheme, 
  useOsTheme, 
  ruRU, 
  dateRuRU 
} from 'naive-ui'
import { computed, onMounted } from 'vue'
import { useThemeStore } from './stores/theme'

const themeStore = useThemeStore()
const osTheme = useOsTheme()

// Determine if Naive UI should be dark
const isDark = computed(() => {
  if (themeStore.theme === 'auto') return osTheme.value === 'dark'
  return themeStore.theme === 'dark'
})

onMounted(() => {
  themeStore.applyTheme()
})

const themeOverrides = {
  common: {
    primaryColor: '#3b82f6',
    primaryColorHover: '#60a5fa',
    primaryColorPressed: '#2563eb',
  }
}
</script>

<template>
  <n-config-provider 
    :theme="isDark ? darkTheme : null" 
    :theme-overrides="themeOverrides"
    :locale="ruRU"
    :date-locale="dateRuRU"
  >
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view></router-view>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
