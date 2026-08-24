import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getProfileFromSession,
  getSession,
  onAuthStateChange,
  signIn as apiSignIn,
  signOut as apiSignOut,
} from '../entities/auth'
import type { AppProfile } from '../shared/types'

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<AppProfile | null>(null)
  const initialized = ref(false)
  let initializationPromise: Promise<void> | null = null
  let unsubscribe: (() => void) | null = null

  function setProfile(next: AppProfile | null) {
    profile.value = next
  }

  async function login(login: string, password: string) {
    const result = await apiSignIn(login, password)
    if (result.success) {
      setProfile(result.profile)
    }
    return result
  }

  async function initializeAuth() {
    if (initialized.value) return
    if (initializationPromise) return initializationPromise

    initializationPromise = (async () => {
      if (!unsubscribe) {
        const subscription = onAuthStateChange((nextProfile) => {
          setProfile(nextProfile)
        })
        unsubscribe = () => subscription.unsubscribe()
      }

      const session = await getSession()
      setProfile(getProfileFromSession(session))
      initialized.value = true
    })()

    await initializationPromise
    initializationPromise = null
  }

  async function signOut() {
    await apiSignOut()
    setProfile(null)
  }

  return { profile, initialized, login, initializeAuth, signOut }
})
