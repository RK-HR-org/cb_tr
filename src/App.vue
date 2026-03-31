<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, darkTheme, useOsTheme } from 'naive-ui'
import { computed } from 'vue'

const osTheme = useOsTheme()
const isDark = computed(() => osTheme.value === 'dark')

// Optional: Naive UI primary color overriding could go here
const themeOverrides = {
  common: {
    primaryColor: '#3b82f6',
    primaryColorHover: '#60a5fa',
    primaryColorPressed: '#2563eb',
  }
}
</script>

<template>
  <n-config-provider :theme="isDark ? darkTheme : null" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view></router-view>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
