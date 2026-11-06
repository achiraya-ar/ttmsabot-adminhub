import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getSessionProfile,
  loginWithUsername,
  signOut,
} from '@/services/auth'
import type { AdminProfile } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<AdminProfile | null>(null)
  const initialized = ref(false)
  const isLoading = ref(false)

  const isLoggedIn = computed(() => !!profile.value)
  const isAdmin = computed(() => profile.value?.can_access_adminhub === true)
  const displayName = computed(() => profile.value?.full_name ?? '')

  async function login(username: string, password: string) {
    isLoading.value = true
    try {
      profile.value = await loginWithUsername(username, password)
      initialized.value = true
    } finally {
      isLoading.value = false
    }
  }

  async function restore() {
    if (initialized.value) return
    isLoading.value = true
    try {
      const sessionProfile = await getSessionProfile()
      if (sessionProfile?.can_access_adminhub) {
        profile.value = sessionProfile
      } else {
        if (sessionProfile) await signOut().catch(() => undefined)
        profile.value = null
      }
    } catch (err) {
      console.error('Cannot restore admin session:', err)
      await signOut().catch(() => undefined)
      profile.value = null
    } finally {
      initialized.value = true
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await signOut()
    } catch (err) {
      console.error('Cannot sign out:', err)
    } finally {
      profile.value = null
    }
  }

  return {
    profile,
    initialized,
    isLoading,
    isLoggedIn,
    isAdmin,
    displayName,
    login,
    restore,
    logout,
  }
})
