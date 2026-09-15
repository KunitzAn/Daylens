<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { db, type Entry } from '../lib/db'
import { formatDateHuman } from '../lib/date'
import { MOOD_LEVELS } from '../lib/mood'
import { useLiveQuery } from '../lib/useLiveQuery'

const props = defineProps<{ date: string }>()

const spheres = useLiveQuery(
  () => db.spheres.orderBy('sortOrder').filter((s) => s.archivedAt === null).toArray(),
  [],
)

const entryId = ref<string | null>(null)
const mood = ref<number | null>(null)
const selectedSphereIds = ref<string[]>([])
const note = ref('')
const justSaved = ref(false)
let justSavedTimeout: ReturnType<typeof setTimeout> | undefined

async function loadEntry(date: string) {
  const existing = await db.entries.where('date').equals(date).first()
  entryId.value = existing?.id ?? null
  mood.value = existing?.mood ?? null
  selectedSphereIds.value = existing?.sphereIds ?? []
  note.value = existing?.note ?? ''
  justSaved.value = false
}

watch(() => props.date, loadEntry, { immediate: true })

function toggleSphere(id: string) {
  const i = selectedSphereIds.value.indexOf(id)
  if (i === -1) selectedSphereIds.value.push(id)
  else selectedSphereIds.value.splice(i, 1)
}

const canSave = computed(() => mood.value !== null)

async function save() {
  if (mood.value === null) return
  const now = new Date().toISOString()

  if (entryId.value) {
    const patch: Partial<Entry> = {
      mood: mood.value,
      sphereIds: [...selectedSphereIds.value],
      note: note.value,
      updatedAt: now,
      dirty: true,
    }
    await db.entries.update(entryId.value, patch)
  } else {
    const id = crypto.randomUUID()
    await db.entries.add({
      id,
      date: props.date,
      mood: mood.value,
      note: note.value,
      sphereIds: [...selectedSphereIds.value],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dirty: true,
    })
    entryId.value = id
  }

  justSaved.value = true
  clearTimeout(justSavedTimeout)
  justSavedTimeout = setTimeout(() => {
    justSaved.value = false
  }, 2000)
}
</script>

<template>
  <div class="w-full max-w-md flex flex-col items-center gap-8">
    <header class="text-center">
      <p class="text-sm text-neutral-500 capitalize">{{ formatDateHuman(props.date) }}</p>
      <h1 class="text-xl font-semibold text-neutral-800">Как прошёл день?</h1>
    </header>

    <div class="flex flex-wrap justify-center gap-2">
      <button
        v-for="level in MOOD_LEVELS"
        :key="level.value"
        type="button"
        :aria-label="level.label"
        :title="level.label"
        @click="mood = level.value"
        class="w-12 h-12 rounded-2xl text-2xl bg-white transition-transform shadow-[0_6px_12px_rgba(0,0,0,0.08),inset_2px_2px_4px_rgba(255,255,255,0.7),inset_-2px_-2px_4px_rgba(0,0,0,0.06)]"
        :class="mood === level.value ? 'scale-110 ring-2 ring-violet-400' : 'opacity-70 hover:opacity-100'"
      >
        {{ level.emoji }}
      </button>
    </div>

    <div class="flex flex-wrap justify-center gap-2">
      <button
        v-for="sphere in spheres"
        :key="sphere.id"
        type="button"
        @click="toggleSphere(sphere.id)"
        class="px-4 py-2 rounded-full text-sm transition-colors"
        :class="
          selectedSphereIds.includes(sphere.id)
            ? 'bg-violet-400 text-white shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15)]'
            : 'bg-white text-neutral-600 shadow-[0_4px_8px_rgba(0,0,0,0.06)]'
        "
      >
        {{ sphere.emoji }} {{ sphere.name }}
      </button>
    </div>

    <textarea
      v-model="note"
      placeholder="Заметка (необязательно)"
      rows="3"
      class="w-full rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] outline-none focus:ring-2 focus:ring-violet-300 resize-none"
    />

    <button
      type="button"
      :disabled="!canSave"
      @click="save"
      class="w-full rounded-2xl py-3 text-white font-medium transition-opacity bg-violet-400 shadow-[0_6px_12px_rgba(0,0,0,0.1)] disabled:opacity-40"
    >
      {{ entryId ? 'Сохранить изменения' : 'Записать' }}
    </button>

    <p v-if="justSaved" class="text-sm text-green-600">Сохранено</p>
  </div>
</template>
