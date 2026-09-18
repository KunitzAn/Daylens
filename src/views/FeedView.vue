<script setup lang="ts">
import { CalendarPlus } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import EntryCard from '../components/EntryCard.vue'
import PickDaySheet from '../components/PickDaySheet.vue'
import SyncStatus from '../components/SyncStatus.vue'
import {
  ACTIVE_MOOD_SET_KEY,
  DEFAULT_MOOD_SET_ID,
  db,
  softDeleteEntry,
  type Category,
  type Entry,
  type Tag,
} from '../lib/db'
import { formatDateWithWeekday } from '../lib/date'
import { resolveMoodSet } from '../lib/moodSets'
import { runSync } from '../lib/sync'
import { useLiveQuery } from '../lib/useLiveQuery'

const router = useRouter()
const PAGE_SIZE = 20
const limit = ref(PAGE_SIZE)
const pickingDay = ref(false)

const entries = useLiveQuery<Entry[]>(
  () =>
    db.entries
      .orderBy('date')
      .reverse()
      .filter((e) => e.deletedAt === null)
      .toArray(),
  [],
)
const tags = useLiveQuery<Tag[]>(() => db.tags.toArray(), [])
const categories = useLiveQuery<Category[]>(() => db.categories.toArray(), [])
const activeMoodSetId = useLiveQuery<string>(
  () => db.settings.get(ACTIVE_MOOD_SET_KEY).then((row) => row?.value ?? DEFAULT_MOOD_SET_ID),
  DEFAULT_MOOD_SET_ID,
)

// Читаем из IndexedDB всё (записей даже за годы — тысячи мелких объектов,
// это миллисекунды), а ограничиваем то, что рендерим: тормозит именно
// отрисовка сотен карточек, а не чтение.
const visibleEntries = computed(() => entries.value.slice(0, limit.value))
const hasMore = computed(() => entries.value.length > limit.value)

const tagsById = computed(() => new Map(tags.value.map((t) => [t.id, t])))
const categoriesById = computed(() => new Map(categories.value.map((c) => [c.id, c])))
const moodSet = computed(() => resolveMoodSet(activeMoodSetId.value))

async function removeEntry(entry: Entry) {
  if (!confirm(`Удалить запись за ${formatDateWithWeekday(entry.date)}? Отменить будет нельзя.`)) {
    return
  }
  await softDeleteEntry(entry.id)
  void runSync()
}
</script>

<template>
  <main class="min-h-dvh px-4 pt-6 pb-28 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <header class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-neutral-800">Записи</h1>
        <div class="flex items-center gap-2">
          <SyncStatus />
          <button
            type="button"
            aria-label="Запись за другой день"
            @click="pickingDay = true"
            class="w-9 h-9 rounded-full bg-white flex items-center justify-center text-neutral-500 shadow-clay-1 shrink-0"
          >
            <CalendarPlus :size="18" />
          </button>
        </div>
      </header>

      <p
        v-if="entries.length === 0"
        class="text-sm text-neutral-500 bg-white rounded-card p-6 text-center"
      >
        Записей пока нет. Нажмите «+», чтобы записать сегодняшний день, или значок календаря —
        чтобы заполнить любой другой.
      </p>

      <PickDaySheet v-if="pickingDay" @close="pickingDay = false" @pick="router.push(`/day/${$event}`)" />

      <EntryCard
        v-for="entry in visibleEntries"
        :key="entry.id"
        :entry="entry"
        :tags-by-id="tagsById"
        :categories-by-id="categoriesById"
        :mood-set="moodSet"
        @open="router.push(`/day/${entry.date}`)"
        @remove="removeEntry(entry)"
      />

      <button
        v-if="hasMore"
        type="button"
        @click="limit += PAGE_SIZE"
        class="rounded-2xl bg-white py-3 text-sm text-neutral-500 shadow-clay-1"
      >
        Показать ещё
      </button>
    </div>
  </main>
</template>
