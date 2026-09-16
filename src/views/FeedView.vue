<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import EntryCard from '../components/EntryCard.vue'
import SyncStatus from '../components/SyncStatus.vue'
import {
  ACTIVE_MOOD_SET_KEY,
  DEFAULT_MOOD_SET_ID,
  db,
  type Category,
  type Entry,
  type Tag,
} from '../lib/db'
import { resolveMoodSet } from '../lib/moodSets'
import { useLiveQuery } from '../lib/useLiveQuery'

const router = useRouter()
const PAGE_SIZE = 20
const limit = ref(PAGE_SIZE)

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
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] px-4 pt-6 pb-28 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <header class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-neutral-800">Записи</h1>
        <SyncStatus />
      </header>

      <p
        v-if="entries.length === 0"
        class="text-sm text-neutral-500 bg-white rounded-3xl p-6 text-center"
      >
        Записей пока нет. Нажмите «+», чтобы записать сегодняшний день.
      </p>

      <button
        v-for="entry in visibleEntries"
        :key="entry.id"
        type="button"
        @click="router.push(`/day/${entry.date}`)"
        class="text-left"
      >
        <EntryCard
          :entry="entry"
          :tags-by-id="tagsById"
          :categories-by-id="categoriesById"
          :mood-set="moodSet"
        />
      </button>

      <button
        v-if="hasMore"
        type="button"
        @click="limit += PAGE_SIZE"
        class="rounded-2xl bg-white py-3 text-sm text-neutral-500 shadow-[0_4px_8px_rgba(0,0,0,0.06)]"
      >
        Показать ещё
      </button>
    </div>
  </main>
</template>
