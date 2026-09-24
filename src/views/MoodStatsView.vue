<script setup lang="ts">
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MoodPickSheet from '../components/MoodPickSheet.vue'
import {
  ACTIVE_MOOD_SET_KEY,
  DEFAULT_MOOD_SET_ID,
  db,
  type Category,
  type Entry,
  type MoodEmojiSet,
  type Tag,
} from '../lib/db'
import { capitalizeFirst, formatDateHuman, formatDayShort, todayLocalDate } from '../lib/date'
import { resolveIcon } from '../lib/icons'
import { moodLevel } from '../lib/mood'
import { useMoodColors } from '../lib/moodPalettes'
import { moodSetEmoji, resolveMoodSet } from '../lib/moodSets'
import {
  buildAllTimeWindow,
  buildMonthWindow,
  buildYearWindow,
  currentMonthAnchor,
  shiftMonthAnchor,
  type MonthAnchor,
  type StatsScale,
  type StatsWindow,
} from '../lib/periods'
import { countMoodDays, longestMoodRuns, moodDays, tagMoodAffinity, type MoodRun } from '../lib/stats'
import { useLiveQuery } from '../lib/useLiveQuery'

const props = defineProps<{ level: string }>()
const router = useRouter()
const today = todayLocalDate()

const activeLevel = computed(() => {
  const n = Number(props.level)
  return n >= 1 && n <= 7 ? n : 4
})

function goBack() {
  // См. тот же приём в EntryView.vue — «назад» должен вести на /stats, а не
  // из приложения, если сюда попали напрямую (закладка, холодный старт).
  const previous = router.options.history.state.back
  if (typeof previous === 'string') router.back()
  else router.push('/stats')
}

function pickMood(level: number) {
  pickerOpen.value = false
  // replace, не push: смена настроения на этом экране — не новый экран,
  // а другой взгляд на тот же. «Назад» должно вернуть на /stats, а не
  // листать историю смен настроения.
  router.replace(`/stats/mood/${level}`)
}

const pickerOpen = ref(false)
const { colorFor } = useMoodColors()

const entries = useLiveQuery<Entry[]>(() => db.entries.filter((e) => e.deletedAt === null).toArray(), [])
const tags = useLiveQuery<Tag[]>(() => db.tags.toArray(), [])
const categories = useLiveQuery<Category[]>(() => db.categories.toArray(), [])
const activeMoodSetId = useLiveQuery<string>(
  () => db.settings.get(ACTIVE_MOOD_SET_KEY).then((row) => row?.value ?? DEFAULT_MOOD_SET_ID),
  DEFAULT_MOOD_SET_ID,
)
const customMoodSets = useLiveQuery<MoodEmojiSet[]>(() => db.moodEmojiSets.toArray(), [])
const moodSet = computed(() => resolveMoodSet(activeMoodSetId.value, customMoodSets.value))

const entryByDate = computed(() => new Map(entries.value.map((e) => [e.date, e])))
const tagsById = computed(() => new Map(tags.value.map((t) => [t.id, t])))
const categoriesById = computed(() => new Map(categories.value.map((c) => [c.id, c])))

const SCALES: { value: StatsScale; label: string }[] = [
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
]
const scale = ref<StatsScale>('month')
const monthAnchor = ref<MonthAnchor>(currentMonthAnchor(today))
const yearAnchor = ref(Number(today.slice(0, 4)))

const statsWindow = computed<StatsWindow>(() => {
  if (scale.value === 'month') return buildMonthWindow(monthAnchor.value, today)
  if (scale.value === 'year') return buildYearWindow(yearAnchor.value, today)
  return buildAllTimeWindow(entries.value.map((e) => e.date), today)
})

// Для тренда частоты; на «Всё время» предыдущего окна нет — сравнивать не с чем.
const previousWindow = computed<StatsWindow | null>(() => {
  if (scale.value === 'month') return buildMonthWindow(shiftMonthAnchor(monthAnchor.value, -1), today)
  if (scale.value === 'year') return buildYearWindow(yearAnchor.value - 1, today)
  return null
})

function goPrev() {
  if (scale.value === 'month') monthAnchor.value = shiftMonthAnchor(monthAnchor.value, -1)
  else if (scale.value === 'year') yearAnchor.value -= 1
}
function goNext() {
  if (!statsWindow.value.canGoNext) return
  if (scale.value === 'month') monthAnchor.value = shiftMonthAnchor(monthAnchor.value, 1)
  else if (scale.value === 'year') yearAnchor.value += 1
}

function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'дней'
  if (mod10 === 1) return 'день'
  if (mod10 >= 2 && mod10 <= 4) return 'дня'
  return 'дней'
}

// --- Частота ---
const thisCount = computed(() => countMoodDays(entryByDate.value, statsWindow.value.dates, activeLevel.value))
const prevCount = computed(() =>
  previousWindow.value ? countMoodDays(entryByDate.value, previousWindow.value.dates, activeLevel.value) : null,
)
type Trend = { kind: 'percent'; percent: number } | { kind: 'new' } | { kind: 'flat' }
const trend = computed<Trend | null>(() => {
  if (prevCount.value === null) return null
  if (prevCount.value === 0) return thisCount.value > 0 ? { kind: 'new' } : { kind: 'flat' }
  return { kind: 'percent', percent: Math.round(((thisCount.value - prevCount.value) / prevCount.value) * 100) }
})
const frequencyUnitLabel = computed(() =>
  scale.value === 'month' ? 'в этом месяце' : scale.value === 'year' ? 'в этом году' : 'за всё время',
)

function tickHeight(share: number | null): string {
  if (share === null) return '25%'
  return share > 0 ? '100%' : '35%'
}
function tickColor(share: number | null): string {
  return share !== null && share > 0 ? colorFor.value(activeLevel.value) : '#e7e5e4'
}
function tickOpacity(share: number | null): number {
  return share !== null && share > 0 ? 0.35 + share * 0.65 : 1
}
const unitShares = computed(() =>
  statsWindow.value.units.map((unit) => {
    let filled = 0
    let matched = 0
    for (const date of unit.dates) {
      const entry = entryByDate.value.get(date)
      if (!entry) continue
      filled++
      if (entry.mood === activeLevel.value) matched++
    }
    return { key: unit.key, share: filled ? matched / filled : null }
  }),
)

// --- Самый длинный период ---
const runs = computed(() => longestMoodRuns(entryByDate.value, statsWindow.value.dates, activeLevel.value))
function formatRange(run: MoodRun): string {
  if (!run.startDate || !run.endDate) return '—'
  if (run.startDate === run.endDate) return capitalizeFirst(formatDateHuman(run.startDate))
  const sameYear = run.startDate.slice(0, 4) === run.endDate.slice(0, 4)
  if (sameYear) return `${capitalizeFirst(formatDateHuman(run.startDate))} – ${formatDateHuman(run.endDate)}`
  return `${formatDateHuman(run.startDate)} ${run.startDate.slice(0, 4)} – ${formatDateHuman(run.endDate)} ${run.endDate.slice(0, 4)}`
}

// --- Соответствующие действия ---
const TOP_AFFINITY_TAGS = 8
const showAllAffinityTags = ref(false)
const affinityRows = computed(() => {
  const raw = tagMoodAffinity(entryByDate.value, statsWindow.value.dates, activeLevel.value)
  return raw
    .map((row) => {
      const tag = tagsById.value.get(row.tagId)
      if (!tag) return null
      const share = row.matchingTotal ? row.matchingDays / row.matchingTotal : 0
      const baselineShare = row.baselineTotal ? row.baselineDays / row.baselineTotal : 0
      return { tag, matchingDays: row.matchingDays, ratio: baselineShare > 0 ? share / baselineShare : null }
    })
    .filter((row): row is { tag: Tag; matchingDays: number; ratio: number | null } => row !== null)
    .sort((a, b) => b.matchingDays - a.matchingDays || a.tag.name.localeCompare(b.tag.name))
})
const visibleAffinityRows = computed(() =>
  showAllAffinityTags.value ? affinityRows.value : affinityRows.value.slice(0, TOP_AFFINITY_TAGS),
)

// --- Дни ---
const TOP_DAYS = 14
const showAllDays = ref(false)
const daysWithMood = computed(() => moodDays(entryByDate.value, statsWindow.value.dates, activeLevel.value))
const visibleDays = computed(() => (showAllDays.value ? daysWithMood.value : daysWithMood.value.slice(0, TOP_DAYS)))
</script>

<template>
  <main class="min-h-dvh px-4 pt-6 pb-10 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <button
          type="button"
          aria-label="Назад"
          @click="goBack"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-clay-1 shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>

        <button
          type="button"
          @click="pickerOpen = true"
          class="flex items-center gap-2 rounded-full bg-white pl-2 pr-3 py-1.5 shadow-clay-1"
        >
          <span
            class="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
            :style="{ backgroundColor: colorFor(activeLevel) }"
          >
            <img
              v-if="moodSet.images"
              :src="moodSet.images[activeLevel - 1]"
              :alt="moodLevel(activeLevel)?.label"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-base leading-none">{{ moodSetEmoji(moodSet, activeLevel) }}</span>
          </span>
          <span class="text-sm font-medium text-neutral-700">{{ moodLevel(activeLevel)?.label }}</span>
          <ChevronDown :size="14" class="text-neutral-400" />
        </button>
      </div>

      <div class="flex gap-1 rounded-2xl bg-white p-1 shadow-clay-1">
        <button
          v-for="option in SCALES"
          :key="option.value"
          type="button"
          @click="scale = option.value"
          class="flex-1 rounded-xl py-2 text-sm transition-colors"
          :class="scale === option.value ? 'bg-accent-ink text-white' : 'text-neutral-500'"
        >
          {{ option.label }}
        </button>
      </div>

      <div v-if="scale !== 'all'" class="flex items-center justify-between -mb-1">
        <button
          type="button"
          aria-label="Предыдущий период"
          @click="goPrev"
          class="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
        >
          <ChevronLeft :size="18" />
        </button>
        <p class="text-sm font-medium text-neutral-700">{{ statsWindow.title }}</p>
        <button
          type="button"
          aria-label="Следующий период"
          :disabled="!statsWindow.canGoNext"
          @click="goNext"
          class="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
        >
          <ChevronRight :size="18" />
        </button>
      </div>

      <section class="rounded-card bg-white p-4 flex flex-col gap-3 shadow-clay-1">
        <h2 class="text-sm font-medium text-neutral-700">Частота</h2>
        <p v-if="statsWindow.dates.length === 0" class="text-sm text-neutral-400">Данных за этот период нет.</p>
        <template v-else>
          <div class="flex items-end gap-[2px] h-10">
            <span
              v-for="u in unitShares"
              :key="u.key"
              class="flex-1 min-w-0 rounded-full"
              :style="{ height: tickHeight(u.share), backgroundColor: tickColor(u.share), opacity: tickOpacity(u.share) }"
            />
          </div>
          <div class="flex items-center gap-5">
            <div class="flex flex-col">
              <span class="text-lg font-semibold text-neutral-700 tabular-nums">×{{ thisCount }}</span>
              <span class="text-[11px] text-neutral-400">{{ frequencyUnitLabel }}</span>
            </div>
            <div v-if="trend" class="flex flex-col">
              <span class="text-sm font-medium text-neutral-700 tabular-nums">
                <template v-if="trend.kind === 'percent'">{{ trend.percent > 0 ? '+' : '' }}{{ trend.percent }}%</template>
                <template v-else-if="trend.kind === 'new'">новое</template>
                <template v-else>0%</template>
              </span>
              <span class="text-[11px] text-neutral-400">vs {{ previousWindow?.title }}</span>
            </div>
          </div>
        </template>
      </section>

      <section class="rounded-card bg-white p-4 flex flex-col gap-3 shadow-clay-1">
        <h2 class="text-sm font-medium text-neutral-700">Самый длинный период</h2>
        <p v-if="runs.withLevel.days === 0 && runs.withoutLevel.days === 0" class="text-sm text-neutral-400">
          Данных за этот период нет.
        </p>
        <div v-else class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <p class="text-xs text-neutral-400">С этим настроением</p>
            <p class="text-lg font-semibold text-neutral-700 tabular-nums">
              {{ runs.withLevel.days }} {{ pluralDays(runs.withLevel.days) }}
            </p>
            <p class="text-xs text-neutral-500">{{ formatRange(runs.withLevel) }}</p>
          </div>
          <div class="flex flex-col gap-1">
            <p class="text-xs text-neutral-400">Без него</p>
            <p class="text-lg font-semibold text-neutral-700 tabular-nums">
              {{ runs.withoutLevel.days }} {{ pluralDays(runs.withoutLevel.days) }}
            </p>
            <p class="text-xs text-neutral-500">{{ formatRange(runs.withoutLevel) }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-card bg-white p-4 flex flex-col gap-3 shadow-clay-1">
        <h2 class="text-sm font-medium text-neutral-700">Соответствующие действия</h2>
        <p v-if="affinityRows.length === 0" class="text-sm text-neutral-400">
          За этот период с этим настроением ничего не отмечено.
        </p>

        <div v-for="row in visibleAffinityRows" :key="row.tag.id" class="flex items-center gap-3">
          <component
            :is="resolveIcon(row.tag.icon)"
            :size="16"
            class="shrink-0 opacity-70"
            :style="{ color: categoriesById.get(row.tag.categoryId)?.color ?? '#a8a29e' }"
          />
          <span class="text-sm text-neutral-600 flex-1 truncate">{{ row.tag.name }}</span>
          <!-- Меньше 3 дней — данных мало, показывать «во сколько раз чаще» было бы враньём точности. -->
          <span v-if="row.matchingDays >= 3 && row.ratio !== null" class="text-xs font-medium text-neutral-500 tabular-nums">
            ×{{ row.ratio.toFixed(1) }}
          </span>
          <span class="text-sm text-neutral-500 tabular-nums w-6 text-right shrink-0">{{ row.matchingDays }}</span>
        </div>

        <button
          v-if="affinityRows.length > TOP_AFFINITY_TAGS"
          type="button"
          @click="showAllAffinityTags = !showAllAffinityTags"
          class="text-xs text-accent-ink self-start"
        >
          {{ showAllAffinityTags ? 'Свернуть' : `Показать все (${affinityRows.length})` }}
        </button>
      </section>

      <section class="rounded-card bg-white p-4 flex flex-col gap-3 shadow-clay-1">
        <h2 class="text-sm font-medium text-neutral-700">Дни</h2>
        <p v-if="daysWithMood.length === 0" class="text-sm text-neutral-400">За этот период такого настроения не было.</p>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="date in visibleDays"
            :key="date"
            type="button"
            @click="router.push(`/day/${date}`)"
            class="rounded-full bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            {{ formatDayShort(date) }}
          </button>
        </div>
        <button
          v-if="daysWithMood.length > TOP_DAYS"
          type="button"
          @click="showAllDays = !showAllDays"
          class="text-xs text-accent-ink self-start"
        >
          {{ showAllDays ? 'Свернуть' : `Показать все (${daysWithMood.length})` }}
        </button>
      </section>
    </div>

    <MoodPickSheet
      v-if="pickerOpen"
      :mood-set="moodSet"
      :active-level="activeLevel"
      @close="pickerOpen = false"
      @pick="pickMood"
    />
  </main>
</template>
