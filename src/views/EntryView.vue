<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import DayEntryForm from '../components/DayEntryForm.vue'
import { isFutureDate, todayLocalDate } from '../lib/date'

const props = defineProps<{ date?: string }>()
const router = useRouter()

// Будущие дни недоступны (см. README) — на всякий случай подстраховываемся
// и здесь, не только в UI календаря, откуда сюда попадают.
const date = computed(() => {
  const requested = props.date ?? todayLocalDate()
  return isFutureDate(requested) ? todayLocalDate() : requested
})

function goBack() {
  // Не `history.length`: начальный about:blank вкладки тоже считается записью,
  // и «назад» уводит из приложения. vue-router держит в state.back путь
  // предыдущего экрана *внутри* приложения — null, если зашли сюда напрямую
  // (закладка, холодный старт PWA на этом маршруте).
  const previous = router.options.history.state.back
  if (typeof previous === 'string') router.back()
  else router.push('/')
}
</script>

<template>
  <main class="min-h-dvh px-4 pt-6 pb-10 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <button
        type="button"
        aria-label="Назад"
        @click="goBack"
        class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-clay-1 shrink-0 self-start"
      >
        <ArrowLeft :size="20" class="text-neutral-600" />
      </button>

      <DayEntryForm :date="date" @saved="goBack" />
    </div>
  </main>
</template>
