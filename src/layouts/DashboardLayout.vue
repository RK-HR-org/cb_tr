<script setup lang="ts">
import { h, computed } from 'vue'
import { NIcon } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { LogOutOutline as LogoutIcon, BarChartOutline as StatsIcon, BookOutline as BookIcon, GridOutline as GridIcon } from '@vicons/ionicons5'

const authStore = useAuthStore()
const router = useRouter()

const isAdmin = computed(() => authStore.profile?.role === 'admin')

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
