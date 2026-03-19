import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<any>(null)
  
  async function login(token: string) {
    if (token.toLowerCase() === 'admin') {
      profile.value = {
        id: 'admin_id',
        role: 'admin',
        full_name: 'Главный Администратор'
      }
      localStorage.setItem('auth_token', 'admin')
      return { success: true }
    }

    // Validate that token is a valid integer ID
    const trainerId = parseInt(token)
    if (isNaN(trainerId) || trainerId <= 0) {
      return { success: false, message: 'Неверный формат ID тренера (ожидается число)' }
    }

    // Try finding a trainer by ID
    try {
      const { data, error: _error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', trainerId)
        .single()
        
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
    } catch (e: any) {
      return { success: false, message: 'Неверный формат ID или ошибка сети' }
    }
  }

  async function initializeAuth() {
    const token = localStorage.getItem('auth_token')
    if (token) {
      await login(token)
    }
  }

  function signOut() {
    localStorage.removeItem('auth_token')
    profile.value = null
  }

  return { profile, login, initializeAuth, signOut }
})
