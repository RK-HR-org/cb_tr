<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'

const authStore = useAuthStore()
const router = useRouter()
const message = useMessage()

const login = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!login.value.trim() || !password.value) {
    message.warning('Введите логин и пароль')
    return
  }

  loading.value = true
  const result = await authStore.login(login.value, password.value)

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
        <n-h2 class="text-2xl font-bold text-gray-900 dark:text-white">Вход в систему</n-h2>
        <p class="text-gray-500 dark:text-gray-400">Платформа для работы тренеров</p>
      </div>

      <n-form @submit.prevent="handleLogin" size="large">
        <n-form-item label="Логин">
          <n-input
            v-model:value="login"
            placeholder="Например: ivanov"
            autocomplete="username"
            @keyup.enter="handleLogin"
          />
        </n-form-item>

        <n-form-item label="Пароль">
          <n-input
            v-model:value="password"
            type="password"
            show-password-on="click"
            placeholder="Введите пароль"
            autocomplete="current-password"
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
    </div>
  </div>
</template>
