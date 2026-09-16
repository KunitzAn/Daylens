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
  if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] px-4 pt-6 pb-10 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <button
        type="button"
        aria-label="Назад"
        @click="goBack"
        class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_4px_8px_rgba(0,0,0,0.06)] shrink-0 self-start"
      >
        <ArrowLeft :size="20" class="text-neutral-600" />
      </button>

      <DayEntryForm :date="date" @saved="goBack" />
    </div>
  </main>
</template>
