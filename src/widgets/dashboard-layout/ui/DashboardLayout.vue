<script setup lang="ts">
import { h, computed } from 'vue'
import { NIcon } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import { useThemeStore } from '../../../stores/theme'
import { 
  LogOutOutline as LogoutIcon, 
  BarChartOutline as StatsIcon, 
  BookOutline as BookIcon, 
  GridOutline as GridIcon,
  CalendarOutline as CalendarIcon,
  SunnyOutline as SunIcon,
  MoonOutline as MoonIcon,
  SettingsOutline as AutoIcon
} from '@vicons/ionicons5'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const router = useRouter()

const isAdmin = computed(() => authStore.profile?.role === 'admin')

const GanttIcon = () => h(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
  },
  [
    h('path', {
      fill: 'currentColor',
      d: 'M2 14.6V3a1 1 0 0 1 2 0v11.6c0 1.136 0 1.929.05 2.545c.05.606.143.954.277 1.217l.115.206c.289.47.702.853 1.196 1.105l.103.049c.251.108.584.184 1.113.227C7.471 20 8.264 20 9.4 20H21l.102.005a1 1 0 0 1 0 1.99L21 22H9.4c-1.103 0-1.991.001-2.709-.058c-.637-.052-1.208-.154-1.737-.381l-.224-.106a5 5 0 0 1-2.092-2.01l-.093-.175c-.302-.593-.428-1.233-.487-1.961C1.999 16.59 2 15.703 2 14.599m13-.6l.102.005a1 1 0 0 1 0 1.99L15 16H8a1 1 0 1 1 0-2zm4-4l.102.005a1 1 0 0 1 0 1.99L19 12h-7a1 1 0 1 1 0-2zm-3-4l.102.005a1 1 0 0 1 0 1.99L16 8H9a1 1 0 0 1 0-2z',
    }),
  ],
)

async function handleLogout() {
  await authStore.signOut()
  router.push('/login')
}
</script>

<template>
  <n-layout has-sider class="h-screen w-full">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      show-trigger
      class="bg-white dark:bg-gray-900"
    >
      <div class="p-4 flex items-center justify-center font-bold text-lg border-b dark:border-gray-800">
        <span class="truncate">Панель управления</span>
      </div>
      
      <!-- Sider Menu -->
      <n-menu
        :options="[
          {
            label: 'Дашборд',
            key: 'dashboard',
            show: isAdmin,
            icon: () => h(NIcon, null, { default: () => h(StatsIcon) }),
            onClick: () => router.push('/admin/dashboard')
          },
          {
            label: 'Таблица',
            key: 'table',
            show: isAdmin,
            icon: () => h(NIcon, null, { default: () => h(GridIcon) }),
            onClick: () => router.push('/admin/table')
          },
          {
            label: 'Гант',
            key: 'gantt',
            show: isAdmin,
            icon: () => h(NIcon, null, { default: () => h(GanttIcon) }),
            onClick: () => router.push('/admin/gantt')
          },
          {
            label: 'Календарь',
            key: 'calendar',
            icon: () => h(NIcon, null, { default: () => h(CalendarIcon) }),
            onClick: () => router.push('/calendar')
          },
          {
            label: 'Мои задачи',
            key: 'trainer-dashboard',
            show: !isAdmin,
            icon: () => h(NIcon, null, { default: () => h(StatsIcon) }),
            onClick: () => router.push('/trainer/dashboard')
          },
          {
            label: 'Словари',
            key: 'dictionaries',
            show: isAdmin,
            icon: () => h(NIcon, null, { default: () => h(BookIcon) }),
            onClick: () => router.push('/admin/dictionaries')
          }
        ]"
      />
      <slot name="menu"></slot>

    </n-layout-sider>
    
    <n-layout>
      <n-layout-header bordered class="h-16 px-6 flex items-center justify-between bg-white dark:bg-gray-900">
        <div class="flex items-center gap-4">
          <slot name="header-left"></slot>
        </div>
        
        <div class="flex items-center gap-4">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button quaternary circle @click="themeStore.toggleTheme">
                <template #icon>
                  <n-icon v-if="themeStore.theme === 'light'"><SunIcon /></n-icon>
                  <n-icon v-else-if="themeStore.theme === 'dark'"><MoonIcon /></n-icon>
                  <n-icon v-else><AutoIcon /></n-icon>
                </template>
              </n-button>
            </template>
            {{ themeStore.theme === 'light' ? 'Светлая тема' : themeStore.theme === 'dark' ? 'Темная тема' : 'Системная тема' }}
          </n-tooltip>

          <div class="flex flex-col items-end mr-2">
            <span class="text-sm font-medium">{{ authStore.profile?.full_name || 'Пользователь' }}</span>
            <span class="text-xs text-gray-500 uppercase">{{ authStore.profile?.role === 'admin' ? 'Администратор' : 'Тренер' }}</span>
          </div>
          <n-button quaternary circle @click="handleLogout">
            <template #icon>
              <n-icon><LogoutIcon /></n-icon>
            </template>
          </n-button>
        </div>
      </n-layout-header>
      
      <n-layout-content 
        native-scrollbar 
        content-style="padding: 24px; min-height: 100%; display: flex; flex-direction: column;" 
        class="bg-gray-50 dark:bg-gray-950"
      >
        <slot></slot>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>
