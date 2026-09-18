<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '../lib/api'
import { requestLoginCode, verifyLoginCode } from '../lib/auth'
import { runSync } from '../lib/sync'

const router = useRouter()

const email = ref('')
const code = ref('')
const step = ref<'email' | 'code'>('email')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function submitEmail() {
  if (!email.value.trim()) return
  loading.value = true
  errorMessage.value = null
  try {
    await requestLoginCode(email.value.trim())
    step.value = 'code'
  } catch {
    errorMessage.value = 'Не получилось отправить письмо. Попробуйте ещё раз чуть позже.'
  } finally {
    loading.value = false
  }
}

async function submitCode() {
  if (!code.value.trim()) return
  loading.value = true
  errorMessage.value = null
  try {
    await verifyLoginCode(email.value.trim(), code.value.trim())
    void runSync()
    router.push('/')
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError && err.status === 400
        ? 'Неверный или устаревший код. Проверьте письмо или запросите новый.'
        : 'Не получилось войти. Попробуйте ещё раз.'
  } finally {
    loading.value = false
  }
}

async function resend() {
  step.value = 'email'
  code.value = ''
  errorMessage.value = null
}
</script>

<template>
  <main class="min-h-dvh p-6 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/')"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-clay-1 shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>
        <h1 class="text-lg font-semibold text-neutral-800">Вход</h1>
      </header>

      <template v-if="step === 'email'">
        <p class="text-sm text-neutral-500">
          Без пароля — пришлём код на почту, введёте его здесь. Пригодится, если открываете
          Daylens на новом устройстве.
        </p>
        <input
          v-model="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          @keyup.enter="submitEmail"
          class="rounded-2xl bg-white p-3 text-sm text-neutral-700 shadow-clay-in outline-none focus:ring-2 focus:ring-accent"
        />
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
        <button
          type="button"
          :disabled="!email.trim() || loading"
          @click="submitEmail"
          class="w-full rounded-2xl py-3 text-white font-medium bg-accent-ink shadow-clay-2 disabled:opacity-40"
        >
          {{ loading ? 'Отправляю…' : 'Прислать код' }}
        </button>
      </template>

      <template v-else>
        <p class="text-sm text-neutral-600 bg-white rounded-2xl p-4 shadow-clay-1">
          Отправили код на <strong>{{ email }}</strong> — введите его ниже, действует 15 минут.
        </p>
        <input
          v-model="code"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="6"
          placeholder="000000"
          autocomplete="one-time-code"
          @keyup.enter="submitCode"
          class="rounded-2xl bg-white p-3 text-2xl text-center tracking-[0.3em] text-neutral-700 shadow-clay-in outline-none focus:ring-2 focus:ring-accent"
        />
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
        <button
          type="button"
          :disabled="!code.trim() || loading"
          @click="submitCode"
          class="w-full rounded-2xl py-3 text-white font-medium bg-accent-ink shadow-clay-2 disabled:opacity-40"
        >
          {{ loading ? 'Проверяю…' : 'Войти' }}
        </button>
        <button type="button" @click="resend" class="text-sm text-neutral-400 hover:text-neutral-600">
          Отправить код ещё раз
        </button>
      </template>
    </div>
  </main>
</template>
