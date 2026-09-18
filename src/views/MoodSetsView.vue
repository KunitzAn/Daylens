<script setup lang="ts">
import { ArrowLeft, Copy, Pencil, Plus, Trash2 } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { db, DEFAULT_MOOD_SET_ID, getActiveMoodSetId, setActiveMoodSetId, type MoodEmojiSet } from '../lib/db'
import { MOOD_LEVELS } from '../lib/mood'
import { MOOD_SETS } from '../lib/moodSets'
import { useLiveQuery } from '../lib/useLiveQuery'

const router = useRouter()

const activeId = useLiveQuery<string>(() => getActiveMoodSetId(), DEFAULT_MOOD_SET_ID)
const customSets = useLiveQuery<MoodEmojiSet[]>(() => db.moodEmojiSets.toArray(), [])

async function select(id: string) {
  await setActiveMoodSetId(id)
  router.push('/more')
}

function duplicate(id: string) {
  router.push({ path: '/mood-sets/new', query: { from: id } })
}

async function remove(set: MoodEmojiSet) {
  if (!confirm(`Удалить набор «${set.name}»?`)) return
  await db.moodEmojiSets.delete(set.id)
  if (activeId.value === set.id) await setActiveMoodSetId(DEFAULT_MOOD_SET_ID)
}
</script>

<template>
  <main class="min-h-dvh p-6 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/more')"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-clay-1 shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>
        <h1 class="text-lg font-bold text-neutral-800">Наборы настроений</h1>
      </header>

      <section class="flex flex-col gap-3">
        <p class="text-sm font-medium text-neutral-500">Системные</p>

        <div
          v-for="set in MOOD_SETS"
          :key="set.id"
          class="rounded-card bg-white p-4 flex flex-col gap-3 transition-shadow"
          :class="activeId === set.id ? 'shadow-[0_0_0_2px_var(--accent-ink)]' : 'shadow-clay-1'"
        >
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="select(set.id)"
              class="flex-1 text-left text-sm font-medium text-neutral-700 truncate"
            >
              {{ set.name }}
            </button>
            <!-- Системный набор не редактируют — эмодзи-версия константа в
                 коде, а картиночная (Телепузики) требует своих файлов.
                 Копия — способ взять эмодзи-набор за основу своего. -->
            <button
              v-if="!set.images"
              type="button"
              :aria-label="`Скопировать набор ${set.name}`"
              @click="duplicate(set.id)"
              class="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600"
            >
              <Copy :size="14" />
            </button>
          </div>

          <button type="button" @click="select(set.id)" class="flex gap-2">
            <template v-if="set.images">
              <img
                v-for="(src, i) in set.images"
                :key="i"
                :src="src"
                :alt="`Уровень ${i + 1}`"
                class="w-10 h-10 rounded-xl object-cover"
              />
            </template>
            <template v-else>
              <span
                v-for="level in MOOD_LEVELS"
                :key="level.value"
                class="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-xl"
              >
                {{ level.emoji }}
              </span>
            </template>
          </button>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <p class="text-sm font-medium text-neutral-500">Мои</p>

        <div
          v-for="set in customSets"
          :key="set.id"
          class="rounded-card bg-white p-4 flex flex-col gap-3 transition-shadow"
          :class="activeId === set.id ? 'shadow-[0_0_0_2px_var(--accent-ink)]' : 'shadow-clay-1'"
        >
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="select(set.id)"
              class="flex-1 text-left text-sm font-medium text-neutral-700 truncate"
            >
              {{ set.name }}
            </button>
            <button
              type="button"
              :aria-label="`Скопировать набор ${set.name}`"
              @click="duplicate(set.id)"
              class="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600"
            >
              <Copy :size="14" />
            </button>
            <button
              type="button"
              :aria-label="`Редактировать набор ${set.name}`"
              @click="router.push(`/mood-sets/${set.id}/edit`)"
              class="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600"
            >
              <Pencil :size="14" />
            </button>
            <button
              type="button"
              :aria-label="`Удалить набор ${set.name}`"
              @click="remove(set)"
              class="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500"
            >
              <Trash2 :size="14" />
            </button>
          </div>

          <button type="button" @click="select(set.id)" class="flex gap-2">
            <span
              v-for="(emoji, i) in set.emojis"
              :key="i"
              class="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-xl"
            >
              {{ emoji }}
            </span>
          </button>
        </div>

        <button
          type="button"
          @click="router.push('/mood-sets/new')"
          class="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 py-3 text-sm"
        >
          <Plus :size="16" /> Свой набор
        </button>
      </section>
    </div>
  </main>
</template>
