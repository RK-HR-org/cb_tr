<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const authStore = useAuthStore()
const router = useRouter()

onMounted(async () => {
  await authStore.initializeAuth()
  if (authStore.profile) {
    if (authStore.profile.role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/trainer/dashboard')
    }
  } else {
    router.push('/login')
  }
})
</script>

<template>
  <div class="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <n-spin size="large" />
  </div>
</template>
