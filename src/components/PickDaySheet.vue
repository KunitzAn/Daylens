<script setup lang="ts">
import { computed, ref } from 'vue'
import { capitalizeFirst, formatDateWithWeekday, isFutureDate, shiftDate, todayLocalDate } from '../lib/date'

const emit = defineEmits<{ close: []; pick: [date: string] }>()

const today = todayLocalDate()
const yesterday = computed(() => shiftDate(today, -1))
const chosen = ref('')

const quickDays = computed(() => [
  { date: today, label: 'Сегодня' },
  { date: yesterday.value, label: 'Вчера' },
])

function pickChosen() {
  // Будущие дни не заполняем (см. README). У input[type=date] есть max,
  // но он не обязателен к исполнению — на некоторых платформах дату
  // можно ввести и с клавиатуры, так что проверяем сами.
  if (!chosen.value || isFutureDate(chosen.value)) return
  emit('pick', chosen.value)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <div class="absolute inset-0 bg-black/30" @click="emit('close')" />

    <div
      class="relative w-full max-w-md rounded-t-3xl bg-[#faf9f7] px-4 pt-5 pb-8 flex flex-col gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.15)]"
    >
      <h2 class="text-base font-semibold text-neutral-800">За какой день?</h2>

      <button
        v-for="day in quickDays"
        :key="day.date"
        type="button"
        @click="emit('pick', day.date)"
        class="rounded-2xl bg-white px-4 py-3 flex items-center justify-between gap-3 text-left shadow-[0_4px_8px_rgba(0,0,0,0.06)]"
      >
        <span class="text-sm font-medium text-neutral-700">{{ day.label }}</span>
        <span class="text-xs text-neutral-400">
          {{ capitalizeFirst(formatDateWithWeekday(day.date)) }}
        </span>
      </button>

      <label class="rounded-2xl bg-white px-4 py-3 flex items-center justify-between gap-3 shadow-[0_4px_8px_rgba(0,0,0,0.06)]">
        <span class="text-sm font-medium text-neutral-700">Другой день</span>
        <input
          v-model="chosen"
          type="date"
          :max="today"
          @change="pickChosen"
          class="text-sm text-neutral-600 bg-transparent outline-none"
        />
      </label>

      <button
        type="button"
        @click="emit('close')"
        class="rounded-2xl py-3 text-sm text-neutral-500"
      >
        Отмена
      </button>
    </div>
  </div>
</template>
