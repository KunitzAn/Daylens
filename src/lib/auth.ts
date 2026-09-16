import { ref } from 'vue'
import { api, ApiError } from './api'

export interface Me {
  userId: number
  email: string
}

// Модульный синглтон-стейт — сессия одна на всё приложение,
// Pinia ради одного объекта не нужна.
export const me = ref<Me | null>(null)
export const authChecked = ref(false)

export async function checkSession(): Promise<Me | null> {
  try {
    me.value = await api.get<Me>('/api/me')
  } catch (err) {
    me.value = err instanceof ApiError && err.status === 401 ? null : null
  } finally {
    authChecked.value = true
  }
  return me.value
}

export async function requestLoginLink(email: string): Promise<void> {
  await api.post('/api/auth/request-link', { email })
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout')
  me.value = null
}
