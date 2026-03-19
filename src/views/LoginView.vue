<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'

const authStore = useAuthStore()
const router = useRouter()
const message = useMessage()

const token = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!token.value) {
    message.warning('Пожалуйста, введите ваш ID или токен доступа')
    return
  }
  
  loading.value = true
  const result = await authStore.login(token.value)
  
  if (!result.success) {
    message.error(result.message || 'Ошибка входа')
    loading.value = false
    return
  }
  
  message.success('Успешный вход')
  
  if (authStore.profile?.role === 'admin') {
    router.push('/admin/dashboard')
  } else {
    router.push('/trainer/dashboard')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-16 sm:mt-24">
      <div class="text-center mb-8">
        <n-h2 class="text-2xl font-bold text-gray-500 dark:text-gray-400">Вход в систему</n-h2>
        <p class="text-gray-500 dark:text-gray-400">Платформа для работы тренеров</p>
      </div>

      <n-form @submit.prevent="handleLogin" size="large">
        <n-form-item label="ID Тренера или пароль Администратора">
          <n-input 
            v-model:value="token" 
            placeholder="Пример: 3" 
            @keyup.enter="handleLogin"
          />
        </n-form-item>
        
        <div class="mt-6">
          <n-button
            type="primary"
            class="w-full"
            :loading="loading"
            @click="handleLogin"
            size="large"
          >
            Войти
          </n-button>
        </div>
      </n-form>
      
      <div class="mt-4 text-center text-sm text-gray-500">
        <p>Для входа используйте свой числовой номер тренера (ID).</p>
        <p>Администратор: <code>admin</code></p>
      </div>
    </div>
  </div>
</template>
