<script setup lang="ts">
import { computed, ref } from 'vue'
import MoodBarChart from '../components/MoodBarChart.vue'
import SyncStatus from '../components/SyncStatus.vue'
import { db, type Category, type Entry, type Tag } from '../lib/db'
import { lastNDays } from '../lib/date'
import { resolveIcon } from '../lib/icons'
import { moodLevel } from '../lib/mood'
import { useMoodColors } from '../lib/moodPalettes'
import { useLiveQuery } from '../lib/useLiveQuery'

const period = ref<7 | 30>(7)
const { colorFor } = useMoodColors()

const entries = useLiveQuery<Entry[]>(
  () => db.entries.filter((e) => e.deletedAt === null).toArray(),
  [],
)
const tags = useLiveQuery<Tag[]>(() => db.tags.toArray(), [])
const categories = useLiveQuery<Category[]>(() => db.categories.toArray(), [])

const dates = computed(() => lastNDays(period.value))
const periodEntries = computed(() => {
  const inPeriod = new Set(dates.value)
  return entries.value.filter((e) => inPeriod.has(e.date))
})

const moodByDate = computed(() => new Map(periodEntries.value.map((e) => [e.date, e.mood])))

const averageMood = computed(() => {
  if (periodEntries.value.length === 0) return null
  const sum = periodEntries.value.reduce((acc, e) => acc + e.mood, 0)
  return sum / periodEntries.value.length
})
// Средний уровень округляем только для подписи и цвета — само число
// показываем как есть, иначе «4.6» и «5.4» выглядели бы одинаково.
const averageLevel = computed(() =>
  averageMood.value === null ? null : Math.round(averageMood.value),
)

const tagsById = computed(() => new Map(tags.value.map((t) => [t.id, t])))
const categoriesById = computed(() => new Map(categories.value.map((c) => [c.id, c])))

const topTags = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of periodEntries.value) {
    for (const id of entry.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const max = Math.max(...counts.values(), 1)
  return [...counts.entries()]
    .map(([id, count]) => ({ tag: tagsById.value.get(id), count, share: (count / max) * 100 }))
    .filter((row): row is { tag: Tag; count: number; share: number } => row.tag !== undefined)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
})
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] px-4 pt-6 pb-28 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <header class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-neutral-800">Статистика</h1>
        <SyncStatus />
      </header>

      <div class="flex gap-1 rounded-2xl bg-white p-1 shadow-[0_4px_8px_rgba(0,0,0,0.06)]">
        <button
          v-for="option in [
            { value: 7, label: 'Неделя' },
            { value: 30, label: 'Месяц' },
          ]"
          :key="option.value"
          type="button"
          @click="period = option.value as 7 | 30"
          class="flex-1 rounded-xl py-2 text-sm transition-colors"
          :class="period === option.value ? 'bg-violet-400 text-white' : 'text-neutral-500'"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-3xl bg-white p-4 flex flex-col gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <p class="text-xs text-neutral-400">Среднее настроение</p>
          <p v-if="averageMood === null" class="text-lg text-neutral-400">—</p>
          <template v-else>
            <p class="text-2xl font-semibold" :style="{ color: colorFor(averageLevel!) }">
              {{ averageMood.toFixed(1) }}
            </p>
            <p class="text-xs text-neutral-500">{{ moodLevel(averageLevel!)?.label }}</p>
          </template>
        </div>

        <div class="rounded-3xl bg-white p-4 flex flex-col gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <p class="text-xs text-neutral-400">Заполнено дней</p>
          <p class="text-2xl font-semibold text-neutral-700">
            {{ periodEntries.length }}<span class="text-base text-neutral-400">/{{ period }}</span>
          </p>
        </div>
      </div>

      <section class="rounded-3xl bg-white p-4 flex flex-col gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <h2 class="text-sm font-medium text-neutral-700">Настроение по дням</h2>
        <MoodBarChart :dates="dates" :mood-by-date="moodByDate" :color-for="colorFor" />
      </section>

      <section class="rounded-3xl bg-white p-4 flex flex-col gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <h2 class="text-sm font-medium text-neutral-700">Чаще всего отмечали</h2>

        <p v-if="topTags.length === 0" class="text-sm text-neutral-400">
          За этот период ничего не отмечено.
        </p>

        <div v-for="row in topTags" :key="row.tag.id" class="flex items-center gap-3">
          <component
            :is="resolveIcon(row.tag.icon)"
            :size="16"
            class="shrink-0 opacity-70"
            :style="{ color: categoriesById.get(row.tag.categoryId)?.color ?? '#a8a29e' }"
          />
          <span class="text-sm text-neutral-600 w-28 shrink-0 truncate">{{ row.tag.name }}</span>
          <span class="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
            <span
              class="block h-full rounded-full"
              :style="{
                width: `${row.share}%`,
                backgroundColor: categoriesById.get(row.tag.categoryId)?.color ?? '#a8a29e',
              }"
            />
          </span>
          <span class="text-sm text-neutral-500 tabular-nums w-6 text-right shrink-0">
            {{ row.count }}
          </span>
        </div>
      </section>
    </div>
  </main>
</template>
