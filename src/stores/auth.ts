import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTrainer } from '../entities/trainer'
import type { AppProfile } from '../shared/types'

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<AppProfile | null>(null)
  const initialized = ref(false)
  let initializationPromise: Promise<void> | null = null
  
  async function login(token: string) {
    if (token === 'adminpass') {
      profile.value = {
        id: 'admin_id',
        role: 'admin',
        full_name: 'Главный Администратор'
      }
      localStorage.setItem('auth_token', 'adminpass')
      return { success: true }
    }

    // Validate that token is a valid integer ID
    const trainerId = parseInt(token)
    if (isNaN(trainerId) || trainerId <= 0) {
      return { success: false, message: 'Неверный формат ID тренера (ожидается число)' }
    }

    // Try finding a trainer by ID
    try {
      const data = await getTrainer(trainerId)
        
      if (data) {
        profile.value = {
          id: data.id,
          role: 'trainer',
          full_name: data.full_name
        }
        localStorage.setItem('auth_token', data.id.toString())
        return { success: true }
      }
      return { success: false, message: 'Тренер с таким ID не найден' }
    } catch {
      return { success: false, message: 'Неверный формат ID или ошибка сети' }
    }
  }

  async function initializeAuth() {
    if (initialized.value) return
    if (initializationPromise) return initializationPromise

    initializationPromise = (async () => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        const result = await login(token)
        if (!result.success) localStorage.removeItem('auth_token')
      }
      initialized.value = true
    })()

    await initializationPromise
    initializationPromise = null
  }

  function signOut() {
    localStorage.removeItem('auth_token')
    profile.value = null
  }

  return { profile, initialized, login, initializeAuth, signOut }
})
