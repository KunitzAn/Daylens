<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, DEFAULT_PALETTE_ID } from '../lib/db'
import { MOOD_LEVELS } from '../lib/mood'
import { DEFAULT_MOOD_COLORS, setActivePaletteId, SYSTEM_PALETTES } from '../lib/moodPalettes'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const route = useRoute()

const isNew = computed(() => !props.id)
const paletteId = props.id ?? crypto.randomUUID()

const name = ref('')
// Новая палитра стартует от классической — подбирать семь цветов с нуля
// из чёрного куда неудобнее, чем подвинуть готовые.
const colors = ref<string[]>([...DEFAULT_MOOD_COLORS])

async function load(id: string | undefined) {
  if (id) {
    const palette = await db.moodPalettes.get(id)
    if (!palette) return
    name.value = palette.name
    colors.value = [...palette.colors]
    return
  }

  // ?from=<id> — копия существующей палитры. Для системных это единственный
  // способ их «изменить»: сами они константы в коде и правке не подлежат.
  // Пока не нажали «Сохранить», ничего не создаётся — отменённая копия
  // не оставляет мусора в списке.
  const from = route.query.from
  if (typeof from !== 'string') return
  const source = SYSTEM_PALETTES.find((p) => p.id === from) ?? (await db.moodPalettes.get(from))
  if (!source) return
  name.value = `${source.name} — копия`
  colors.value = [...source.colors]
}

watch(() => props.id, load, { immediate: true })

const canSave = computed(() => name.value.trim().length > 0)

async function save() {
  if (!canSave.value) return
  await db.moodPalettes.put({
    id: paletteId,
    name: name.value.trim(),
    colors: [...colors.value],
    updatedAt: new Date().toISOString(),
  })
  // Только что настроенную палитру логично сразу и включить.
  await setActivePaletteId(paletteId)
  router.push('/mood-palettes')
}

async function remove() {
  if (!confirm(`Удалить палитру «${name.value}»?`)) return
  await db.moodPalettes.delete(paletteId)
  await setActivePaletteId(DEFAULT_PALETTE_ID)
  router.push('/mood-palettes')
}
</script>

<template>
  <main class="min-h-dvh p-6 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/mood-palettes')"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-clay-1 shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>
        <h1 class="text-lg font-semibold text-neutral-800">
          {{ isNew ? (route.query.from ? 'Копия палитры' : 'Новая палитра') : 'Палитра' }}
        </h1>
      </header>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-neutral-500">Название</label>
        <input
          v-model="name"
          type="text"
          placeholder="Например, Мягкая"
          class="rounded-2xl bg-white p-3 text-sm text-neutral-700 shadow-clay-in outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-neutral-500">Цвет каждого уровня</label>
        <div
          v-for="(level, i) in MOOD_LEVELS"
          :key="level.value"
          class="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-clay-1"
        >
          <span class="text-xl w-7 text-center shrink-0">{{ level.emoji }}</span>
          <span class="flex-1 text-sm text-neutral-600 truncate">{{ level.label }}</span>
          <span class="text-xs text-neutral-400 tabular-nums">{{ colors[i] }}</span>
          <input
            v-model="colors[i]"
            type="color"
            :aria-label="`Цвет уровня «${level.label}»`"
            class="w-10 h-10 rounded-xl border-0 cursor-pointer bg-transparent shrink-0"
          />
        </div>
      </div>

      <div class="rounded-2xl bg-white p-4 flex items-center gap-2 shadow-clay-1">
        <span class="text-xs text-neutral-400">Хуже</span>
        <span
          v-for="(color, i) in colors"
          :key="i"
          class="flex-1 h-6 rounded-md"
          :style="{ backgroundColor: color }"
        />
        <span class="text-xs text-neutral-400">Лучше</span>
      </div>

      <button
        type="button"
        :disabled="!canSave"
        @click="save"
        class="w-full rounded-2xl py-3 text-white font-medium bg-accent-ink shadow-clay-2 disabled:opacity-40"
      >
        Сохранить
      </button>

      <button
        v-if="!isNew"
        type="button"
        @click="remove"
        class="w-full rounded-2xl py-3 text-red-500 font-medium bg-white shadow-clay-1"
      >
        Удалить палитру
      </button>
    </div>
  </main>
</template>
