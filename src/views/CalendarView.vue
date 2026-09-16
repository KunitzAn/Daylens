<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SyncStatus from '../components/SyncStatus.vue'
import { db, type Entry } from '../lib/db'
import {
  addMonths,
  currentMonth,
  daysInMonth,
  formatMonthTitle,
  isFutureDate,
  leadingBlanks,
  toDateString,
  todayLocalDate,
  WEEKDAY_LABELS,
} from '../lib/date'
import { moodLevel } from '../lib/mood'
import { useLiveQuery } from '../lib/useLiveQuery'

const router = useRouter()
const month = ref(currentMonth())
const today = todayLocalDate()

const entries = useLiveQuery<Entry[]>(
  () => db.entries.filter((e) => e.deletedAt === null).toArray(),
  [],
)
const moodByDate = computed(() => new Map(entries.value.map((e) => [e.date, e.mood])))

interface Cell {
  key: string
  date: string | null
  day: number | null
}

const cells = computed<Cell[]>(() => {
  const blanks: Cell[] = Array.from({ length: leadingBlanks(month.value) }, (_, i) => ({
    key: `blank-${i}`,
    date: null,
    day: null,
  }))
  const days: Cell[] = Array.from({ length: daysInMonth(month.value) }, (_, i) => {
    const day = i + 1
    const date = toDateString(month.value, day)
    return { key: date, date, day }
  })
  return [...blanks, ...days]
})

function colorFor(date: string): string | undefined {
  const mood = moodByDate.value.get(date)
  return mood ? moodLevel(mood)?.color : undefined
}

function open(date: string) {
  if (isFutureDate(date)) return // будущие дни не заполняем, см. README
  router.push(`/day/${date}`)
}
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] px-4 pt-6 pb-28 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <header class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-neutral-800">Календарь</h1>
        <SyncStatus />
      </header>

      <div class="rounded-3xl bg-white p-4 flex flex-col gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div class="flex items-center justify-between">
          <button
            type="button"
            aria-label="Предыдущий месяц"
            @click="month = addMonths(month, -1)"
            class="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
          >
            <ChevronLeft :size="18" />
          </button>
          <p class="text-sm font-medium text-neutral-700">{{ formatMonthTitle(month) }}</p>
          <button
            type="button"
            aria-label="Следующий месяц"
            @click="month = addMonths(month, 1)"
            class="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
          >
            <ChevronRight :size="18" />
          </button>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center">
          <span v-for="label in WEEKDAY_LABELS" :key="label" class="text-[11px] text-neutral-400 pb-1">
            {{ label }}
          </span>

          <template v-for="cell in cells" :key="cell.key">
            <span v-if="!cell.date" />
            <button
              v-else
              type="button"
              :disabled="isFutureDate(cell.date)"
              :aria-label="cell.date"
              @click="open(cell.date)"
              class="aspect-square rounded-xl flex items-center justify-center text-sm transition-transform disabled:opacity-30"
              :class="[
                colorFor(cell.date) ? 'text-white font-medium' : 'text-neutral-500 bg-neutral-100',
                cell.date === today ? 'ring-2 ring-violet-400' : '',
              ]"
              :style="colorFor(cell.date) ? { backgroundColor: colorFor(cell.date) } : undefined"
            >
              {{ cell.day }}
            </button>
          </template>
        </div>
      </div>

      <div class="rounded-3xl bg-white p-4 flex flex-wrap items-center gap-x-3 gap-y-2 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <span class="text-xs text-neutral-400">Хуже</span>
        <span
          v-for="level in [1, 2, 3, 4, 5, 6, 7]"
          :key="level"
          class="w-5 h-5 rounded-md"
          :style="{ backgroundColor: moodLevel(level)?.color }"
          :title="moodLevel(level)?.label"
        />
        <span class="text-xs text-neutral-400">Лучше</span>
      </div>
    </div>
  </main>
</template>
