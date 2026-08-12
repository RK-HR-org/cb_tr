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

const ProjectsIcon = () => h(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
  },
  [
    h('path', {
      fill: 'currentColor',
      d: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9zm6.82 6L12 12.72L5.18 9L12 5.28zM17 15.99l-5 2.73l-5-2.73v-3.72L12 15l5-2.73z',
    }),
  ],
)

const TrainersIcon = () => h(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 48 48',
  },
  [
    h('path', {
      fill: 'currentColor',
      d: 'M24 7.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7M18 11a6 6 0 1 1 12 0a6 6 0 0 1-12 0m19-1.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5M32 12a5 5 0 1 1 10 0a5 5 0 0 1-10 0M8.5 12a2.5 2.5 0 1 1 5 0a2.5 2.5 0 0 1-5 0M11 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10m4 16.25A4.25 4.25 0 0 1 19.25 19h9.5A4.25 4.25 0 0 1 33 23.25V34a9 9 0 1 1-18 0zm9 17.25a6.5 6.5 0 0 0 6.5-6.5V23.25a1.75 1.75 0 0 0-1.75-1.75h-9.5a1.75 1.75 0 0 0-1.75 1.75V34a6.5 6.5 0 0 0 6.5 6.5m-13-3a4.5 4.5 0 0 0 2.367-.672c.219.826.532 1.613.926 2.35A7 7 0 0 1 4 33v-9.749A4.25 4.25 0 0 1 8.25 19h5.5q.433.001.841.083a6.24 6.24 0 0 0-1.343 2.417H8.25a1.75 1.75 0 0 0-1.75 1.75V33a4.5 4.5 0 0 0 4.5 4.5M37 40a7 7 0 0 1-3.293-.821c.394-.738.707-1.525.926-2.351A4.5 4.5 0 0 0 41.5 33v-9.75a1.75 1.75 0 0 0-1.75-1.75h-4.998a6.24 6.24 0 0 0-1.344-2.417q.41-.082.842-.083h5.5A4.25 4.25 0 0 1 44 23.25V33a7 7 0 0 1-7 7',
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
            label: 'Проекты',
            key: 'projects',
            show: isAdmin,
            icon: () => h(NIcon, null, { default: () => h(ProjectsIcon) }),
            onClick: () => router.push('/admin/projects')
          },
          {
            label: 'Тренеры',
            key: 'trainers',
            show: isAdmin,
            icon: () => h(NIcon, null, { default: () => h(TrainersIcon) }),
            onClick: () => router.push('/admin/trainers')
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
