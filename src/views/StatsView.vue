<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import MoodBarChart from '../components/MoodBarChart.vue'
import SyncStatus from '../components/SyncStatus.vue'
import {
  ACTIVE_MOOD_SET_KEY,
  DEFAULT_MOOD_SET_ID,
  db,
  type Category,
  type Entry,
  type MoodEmojiSet,
  type Tag,
} from '../lib/db'
import { resolveIcon } from '../lib/icons'
import { moodLevel } from '../lib/mood'
import { useMoodColors } from '../lib/moodPalettes'
import { moodSetEmoji, resolveMoodSet } from '../lib/moodSets'
import {
  buildBuckets,
  BUCKET_COUNT,
  GRANULARITIES,
  type ChartBar,
  type Granularity,
} from '../lib/periods'
import { bucketTagShare, tagMoodComparison } from '../lib/stats'
import { useLiveQuery } from '../lib/useLiveQuery'

const granularity = ref<Granularity>('day')
const selectedKey = ref<string | null>(null)
const selectedTagId = ref<string | null>(null)
const showAllTags = ref(false)

const { colorFor } = useMoodColors()

const entries = useLiveQuery<Entry[]>(
  () => db.entries.filter((e) => e.deletedAt === null).toArray(),
  [],
)
const tags = useLiveQuery<Tag[]>(() => db.tags.toArray(), [])
const categories = useLiveQuery<Category[]>(() => db.categories.toArray(), [])
const activeMoodSetId = useLiveQuery<string>(
  () => db.settings.get(ACTIVE_MOOD_SET_KEY).then((row) => row?.value ?? DEFAULT_MOOD_SET_ID),
  DEFAULT_MOOD_SET_ID,
)
const customMoodSets = useLiveQuery<MoodEmojiSet[]>(() => db.moodEmojiSets.toArray(), [])
const moodSet = computed(() => resolveMoodSet(activeMoodSetId.value, customMoodSets.value))

// Смена масштаба обнуляет оба выбора: ключи периодов разных масштабов
// несовместимы, а список тегов пересобирается заново — ранее выбранного
// действия там может уже не быть. А вот при выборе конкретного столбика
// (selectedKey) фильтр по действию нарочно остаётся: это и есть сценарий
// «посмотреть маркеры и сравнение именно для этой недели».
watch(granularity, () => {
  selectedKey.value = null
  selectedTagId.value = null
})

const buckets = computed(() => buildBuckets(granularity.value))
const entryByDate = computed(() => new Map(entries.value.map((e) => [e.date, e])))

interface BucketStats {
  filled: number
  total: number
  average: number | null
}

function statsFor(dates: string[]): BucketStats {
  let sum = 0
  let filled = 0
  for (const date of dates) {
    const entry = entryByDate.value.get(date)
    if (!entry) continue
    sum += entry.mood
    filled++
  }
  return { filled, total: dates.length, average: filled ? sum / filled : null }
}

const bars = computed<ChartBar[]>(() =>
  buckets.value.map((bucket) => {
    const { average } = statsFor(bucket.dates)
    return {
      key: bucket.key,
      label: bucket.label,
      title: bucket.title,
      value: average,
      // Цвет — из активной палитры, по округлённому среднему уровню.
      color: average === null ? undefined : colorFor.value(Math.round(average)),
      markerShare: selectedTagId.value
        ? bucketTagShare(entryByDate.value, bucket.dates, selectedTagId.value)
        : null,
    }
  }),
)

const selectedBucket = computed(() => buckets.value.find((b) => b.key === selectedKey.value) ?? null)

/** Что показываем в плашках и в списке действий: выбранный период либо весь диапазон. */
const focusDates = computed(() =>
  selectedBucket.value ? selectedBucket.value.dates : buckets.value.flatMap((b) => b.dates),
)
const focusTitle = computed(() =>
  selectedBucket.value
    ? selectedBucket.value.title
    : `Последние ${BUCKET_COUNT[granularity.value]} ${
        { day: 'дней', week: 'недель', month: 'месяцев' }[granularity.value]
      }`,
)

const focusStats = computed(() => statsFor(focusDates.value))
const focusLevel = computed(() =>
  focusStats.value.average === null ? null : Math.round(focusStats.value.average),
)

const tagsById = computed(() => new Map(tags.value.map((t) => [t.id, t])))
const categoriesById = computed(() => new Map(categories.value.map((c) => [c.id, c])))

const TOP_TAGS = 8

const tagCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const date of focusDates.value) {
    const entry = entryByDate.value.get(date)
    if (!entry) continue
    for (const id of entry.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const max = Math.max(...counts.values(), 1)
  return [...counts.entries()]
    .map(([id, count]) => ({ tag: tagsById.value.get(id), count, share: (count / max) * 100 }))
    .filter((row): row is { tag: Tag; count: number; share: number } => row.tag !== undefined)
    .sort((a, b) => b.count - a.count || a.tag.name.localeCompare(b.tag.name))
})

const visibleTags = computed(() =>
  showAllTags.value ? tagCounts.value : tagCounts.value.slice(0, TOP_TAGS),
)

function selectTag(tagId: string) {
  selectedTagId.value = selectedTagId.value === tagId ? null : tagId
}

const selectedTag = computed(() => {
  if (!selectedTagId.value) return null
  const tag = tagsById.value.get(selectedTagId.value)
  if (!tag) return null
  return { ...tag, color: categoriesById.value.get(tag.categoryId)?.color ?? '#a8a29e' }
})

const comparisonRows = computed(() => {
  if (!selectedTagId.value) return null
  const { withTag, withoutTag } = tagMoodComparison(entryByDate.value, focusDates.value, selectedTagId.value)
  return [
    { key: 'with', label: `С «${selectedTag.value?.name}»`, ...withTag },
    { key: 'without', label: 'Без него', ...withoutTag },
  ]
})

const moodDelta = computed(() => {
  const [withRow, withoutRow] = comparisonRows.value ?? []
  if (withRow?.average == null || withoutRow?.average == null) return null
  return withRow.average - withoutRow.average
})
</script>

<template>
  <main class="min-h-dvh px-4 pt-6 pb-28 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <header class="flex items-start justify-between gap-3">
        <h1 class="text-xl font-semibold text-neutral-800">Статистика</h1>
        <SyncStatus />
      </header>

      <div class="flex gap-1 rounded-2xl bg-white p-1 shadow-clay-1">
        <button
          v-for="option in GRANULARITIES"
          :key="option.value"
          type="button"
          @click="granularity = option.value"
          class="flex-1 rounded-xl py-2 text-sm transition-colors"
          :class="granularity === option.value ? 'bg-accent-ink text-white' : 'text-neutral-500'"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="flex items-center gap-2 min-h-7">
        <p class="text-sm text-neutral-500 truncate">{{ focusTitle }}</p>
        <button
          v-if="selectedBucket"
          type="button"
          aria-label="Показать весь диапазон"
          @click="selectedKey = null"
          class="w-6 h-6 rounded-full bg-white flex items-center justify-center text-neutral-400 shrink-0 shadow-clay-1"
        >
          <X :size="13" />
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-card bg-white p-4 flex flex-col gap-2 shadow-clay-1">
          <p class="text-xs text-neutral-400">Среднее настроение</p>
          <p v-if="focusLevel === null" class="text-lg text-neutral-300">—</p>
          <template v-else>
            <span
              class="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden"
              :style="{ backgroundColor: colorFor(focusLevel) }"
            >
              <img
                v-if="moodSet.images"
                :src="moodSet.images[focusLevel - 1]"
                :alt="moodLevel(focusLevel)?.label"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-2xl leading-none">{{ moodSetEmoji(moodSet, focusLevel) }}</span>
            </span>
            <p class="text-xs text-neutral-500">{{ moodLevel(focusLevel)?.label }}</p>
          </template>
        </div>

        <div class="rounded-card bg-white p-4 flex flex-col gap-2 shadow-clay-1">
          <p class="text-xs text-neutral-400">Заполнено дней</p>
          <p class="text-2xl font-semibold text-neutral-700">
            {{ focusStats.filled }}<span class="text-base text-neutral-400">/{{ focusStats.total }}</span>
          </p>
        </div>
      </div>

      <section class="rounded-card bg-white p-4 flex flex-col gap-3 shadow-clay-1">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-neutral-700">
            {{ GRANULARITIES.find((g) => g.value === granularity)?.chartTitle }}
          </h2>
          <div v-if="selectedTag" class="flex items-center gap-1.5">
            <span
              class="flex items-center gap-1 rounded-full pl-1.5 pr-2 py-1 text-xs font-medium"
              :style="{ backgroundColor: `${selectedTag.color}1a`, color: selectedTag.color }"
            >
              <component :is="resolveIcon(selectedTag.icon)" :size="12" />
              {{ selectedTag.name }}
            </span>
            <button
              type="button"
              aria-label="Убрать фильтр по действию"
              @click="selectedTagId = null"
              class="w-5 h-5 rounded-full bg-white flex items-center justify-center text-neutral-400 shrink-0 shadow-clay-1"
            >
              <X :size="11" />
            </button>
          </div>
        </div>
        <MoodBarChart
          :bars="bars"
          :selected-key="selectedKey"
          :marker-color="selectedTag?.color ?? null"
          @select="selectedKey = $event"
        />
        <p class="text-[11px] text-neutral-400">
          {{
            selectedTag
              ? 'Точки под графиком — дни с этим действием.'
              : 'Нажмите на столбик, чтобы посмотреть период.'
          }}
        </p>
      </section>

      <section v-if="selectedTag && comparisonRows" class="rounded-card bg-white p-4 flex flex-col gap-3 shadow-clay-1">
        <h2 class="text-sm font-medium text-neutral-700">Настроение с «{{ selectedTag.name }}» и без</h2>
        <div class="grid grid-cols-2 gap-3">
          <div v-for="row in comparisonRows" :key="row.key" class="flex flex-col gap-2">
            <p class="text-xs text-neutral-400">{{ row.label }} · {{ row.days }}</p>
            <p v-if="row.average === null" class="text-lg text-neutral-300">—</p>
            <div v-else class="flex items-center gap-2">
              <span
                class="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                :style="{ backgroundColor: colorFor(Math.round(row.average)) }"
              >
                <img
                  v-if="moodSet.images"
                  :src="moodSet.images[Math.round(row.average) - 1]"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-lg leading-none">{{ moodSetEmoji(moodSet, Math.round(row.average)) }}</span>
              </span>
              <span class="text-sm text-neutral-600 tabular-nums">{{ row.average.toFixed(1) }}</span>
            </div>
          </div>
        </div>
        <p v-if="moodDelta !== null" class="text-xs text-neutral-500">
          Разница: <span class="font-medium text-neutral-700">{{ moodDelta > 0 ? '+' : '' }}{{ moodDelta.toFixed(1) }}</span>
        </p>
      </section>

      <section class="rounded-card bg-white p-4 flex flex-col gap-3 shadow-clay-1">
        <h2 class="text-sm font-medium text-neutral-700">Действия за период</h2>

        <p v-if="tagCounts.length === 0" class="text-sm text-neutral-400">
          За этот период ничего не отмечено.
        </p>

        <button
          v-for="row in visibleTags"
          :key="row.tag.id"
          type="button"
          :aria-pressed="selectedTagId === row.tag.id"
          @click="selectTag(row.tag.id)"
          class="flex items-center gap-3 w-full text-left rounded-xl px-1.5 py-1 -mx-1.5 transition-colors"
          :class="selectedTagId === row.tag.id ? 'bg-neutral-50' : ''"
        >
          <component
            :is="resolveIcon(row.tag.icon)"
            :size="16"
            class="shrink-0 opacity-70"
            :style="{ color: categoriesById.get(row.tag.categoryId)?.color ?? '#a8a29e' }"
          />
          <span class="text-sm text-neutral-600 w-24 shrink-0 truncate">{{ row.tag.name }}</span>
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
        </button>

        <button
          v-if="tagCounts.length > TOP_TAGS"
          type="button"
          @click="showAllTags = !showAllTags"
          class="text-xs text-accent-ink self-start"
        >
          {{ showAllTags ? 'Свернуть' : `Показать все (${tagCounts.length})` }}
        </button>
      </section>
    </div>
  </main>
</template>
