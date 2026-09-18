<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmojiPicker from '../components/EmojiPicker.vue'
import { db, DEFAULT_MOOD_SET_ID, setActiveMoodSetId, type MoodEmojiSet } from '../lib/db'
import { MOOD_LEVELS } from '../lib/mood'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const route = useRoute()

const isNew = computed(() => !props.id)
const setId = props.id ?? crypto.randomUUID()

const name = ref('')
// Новый набор стартует от эмодзи по умолчанию — двигать готовые мордочки
// удобнее, чем набирать семь штук на пустом месте.
const emojis = ref<string[]>(MOOD_LEVELS.map((l) => l.emoji))

async function load(id: string | undefined) {
  if (id) {
    const set = await db.moodEmojiSets.get(id)
    if (!set) return
    name.value = set.name
    emojis.value = [...set.emojis]
    return
  }

  // ?from=<id> — копия существующего набора, системного в том числе (у
  // системного эмодзи-набора нет своих emoji — берём дефолтные уровни).
  const from = route.query.from
  if (typeof from !== 'string') return
  if (from === DEFAULT_MOOD_SET_ID) {
    name.value = 'Эмодзи — копия'
    emojis.value = MOOD_LEVELS.map((l) => l.emoji)
    return
  }
  const source = await db.moodEmojiSets.get(from)
  if (!source) return
  name.value = `${source.name} — копия`
  emojis.value = [...source.emojis]
}

watch(() => props.id, load, { immediate: true })

const canSave = computed(() => name.value.trim().length > 0)

async function save() {
  if (!canSave.value) return
  const set: MoodEmojiSet = {
    id: setId,
    name: name.value.trim(),
    emojis: [...emojis.value],
    updatedAt: new Date().toISOString(),
  }
  await db.moodEmojiSets.put(set)
  // Только что собранный набор логично сразу и включить.
  await setActiveMoodSetId(setId)
  router.push('/mood-sets')
}

async function remove() {
  if (!confirm(`Удалить набор «${name.value}»?`)) return
  await db.moodEmojiSets.delete(setId)
  await setActiveMoodSetId(DEFAULT_MOOD_SET_ID)
  router.push('/mood-sets')
}
</script>

<template>
  <main class="min-h-dvh p-6 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/mood-sets')"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-clay-1 shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>
        <h1 class="text-lg font-bold text-neutral-800">
          {{ isNew ? (route.query.from ? 'Копия набора' : 'Свой набор') : 'Набор настроений' }}
        </h1>
      </header>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-neutral-500">Название</label>
        <input
          v-model="name"
          type="text"
          placeholder="Например, Мои мордочки"
          class="rounded-2xl bg-white p-3 text-sm text-neutral-700 shadow-clay-in outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-neutral-500">Эмодзи каждого уровня</label>
        <div
          v-for="(level, i) in MOOD_LEVELS"
          :key="level.value"
          class="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-clay-1"
        >
          <EmojiPicker v-model="emojis[i]" />
          <span class="flex-1 text-sm text-neutral-600 truncate">{{ level.label }}</span>
        </div>
      </div>

      <div class="rounded-2xl bg-white p-4 flex items-center justify-between gap-1 shadow-clay-1">
        <span
          v-for="(emoji, i) in emojis"
          :key="i"
          class="text-xl"
        >
          {{ emoji }}
        </span>
      </div>

      <button
        type="button"
        :disabled="!canSave"
        @click="save"
        class="btn-primary w-full rounded-2xl py-3 text-white font-bold disabled:opacity-40"
      >
        Сохранить
      </button>

      <button
        v-if="!isNew"
        type="button"
        @click="remove"
        class="w-full rounded-2xl py-3 text-red-500 font-medium bg-white shadow-clay-1"
      >
        Удалить набор
      </button>
    </div>
  </main>
</template>
