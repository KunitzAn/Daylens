<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { requestLoginLink } from '../lib/auth'

const router = useRouter()
const route = useRoute()

const email = ref('')
const sent = ref(false)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const ERROR_MESSAGES: Record<string, string> = {
  expired_link: 'Ссылка устарела или уже использована — запросите новую.',
  missing_token: 'Ссылка повреждена — запросите новую.',
  user_not_found: 'Что-то пошло не так — запросите новую ссылку.',
}

const queryError = computed(() => {
  const err = route.query.error
  return typeof err === 'string' ? (ERROR_MESSAGES[err] ?? 'Не получилось войти, попробуйте ещё раз.') : null
})

async function submit() {
  if (!email.value.trim()) return
  loading.value = true
  errorMessage.value = null
  try {
    await requestLoginLink(email.value.trim())
    sent.value = true
  } catch {
    errorMessage.value = 'Не получилось отправить письмо. Попробуйте ещё раз чуть позже.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] p-6 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/')"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_4px_8px_rgba(0,0,0,0.06)] shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>
        <h1 class="text-lg font-semibold text-neutral-800">Вход</h1>
      </header>

      <p v-if="queryError" class="text-sm text-red-500 bg-red-50 rounded-2xl p-3">{{ queryError }}</p>

      <template v-if="!sent">
        <p class="text-sm text-neutral-500">
          Без пароля — пришлём ссылку на почту, по ней и войдёте. Пригодится, если открываете
          Daylens на новом устройстве.
        </p>
        <input
          v-model="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          @keyup.enter="submit"
          class="rounded-2xl bg-white p-3 text-sm text-neutral-700 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] outline-none focus:ring-2 focus:ring-violet-300"
        />
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
        <button
          type="button"
          :disabled="!email.trim() || loading"
          @click="submit"
          class="w-full rounded-2xl py-3 text-white font-medium bg-violet-400 shadow-[0_6px_12px_rgba(0,0,0,0.1)] disabled:opacity-40"
        >
          {{ loading ? 'Отправляю…' : 'Прислать ссылку' }}
        </button>
      </template>

      <template v-else>
        <p class="text-sm text-neutral-600 bg-white rounded-2xl p-4 shadow-[0_4px_8px_rgba(0,0,0,0.06)]">
          Проверьте почту <strong>{{ email }}</strong> — ссылка действует 15 минут. Можно закрыть эту
          вкладку, приложение продолжает работать локально.
        </p>
      </template>
    </div>
  </main>
</template>
