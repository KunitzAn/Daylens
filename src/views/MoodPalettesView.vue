<script setup lang="ts">
import { ArrowLeft, Pencil, Plus, Trash2 } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { ACTIVE_PALETTE_KEY, db, DEFAULT_PALETTE_ID, type MoodPalette } from '../lib/db'
import { MOOD_LEVELS } from '../lib/mood'
import { setActivePaletteId, SYSTEM_PALETTES } from '../lib/moodPalettes'
import { useLiveQuery } from '../lib/useLiveQuery'

const router = useRouter()

const activeId = useLiveQuery<string>(
  () => db.settings.get(ACTIVE_PALETTE_KEY).then((row) => row?.value ?? DEFAULT_PALETTE_ID),
  DEFAULT_PALETTE_ID,
)
const customPalettes = useLiveQuery<MoodPalette[]>(() => db.moodPalettes.toArray(), [])

async function select(id: string) {
  await setActivePaletteId(id)
}

async function remove(palette: MoodPalette) {
  if (!confirm(`Удалить палитру «${palette.name}»?`)) return
  await db.moodPalettes.delete(palette.id)
  // Если удалили активную — молча откатываемся на системную, иначе
  // приложение осталось бы с ссылкой на несуществующую палитру.
  if (activeId.value === palette.id) await setActivePaletteId(DEFAULT_PALETTE_ID)
}
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] p-6 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/more')"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_4px_8px_rgba(0,0,0,0.06)] shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>
        <h1 class="text-lg font-semibold text-neutral-800">Цвета настроений</h1>
      </header>

      <section class="flex flex-col gap-3">
        <p class="text-sm font-medium text-neutral-500">Системные</p>
        <button
          v-for="palette in SYSTEM_PALETTES"
          :key="palette.id"
          type="button"
          @click="select(palette.id)"
          class="w-full rounded-2xl bg-white p-4 flex flex-col gap-3 text-left transition-shadow"
          :class="
            activeId === palette.id
              ? 'shadow-[0_0_0_2px_#a78bfa]'
              : 'shadow-[0_4px_8px_rgba(0,0,0,0.06)]'
          "
        >
          <span class="text-sm font-medium text-neutral-700">{{ palette.name }}</span>
          <span class="flex gap-2">
            <span
              v-for="(color, i) in palette.colors"
              :key="i"
              class="w-8 h-8 rounded-xl"
              :style="{ backgroundColor: color }"
              :title="MOOD_LEVELS[i]?.label"
            />
          </span>
        </button>
      </section>

      <section class="flex flex-col gap-3">
        <p class="text-sm font-medium text-neutral-500">Мои</p>

        <div
          v-for="palette in customPalettes"
          :key="palette.id"
          class="rounded-2xl bg-white p-4 flex flex-col gap-3 transition-shadow"
          :class="
            activeId === palette.id
              ? 'shadow-[0_0_0_2px_#a78bfa]'
              : 'shadow-[0_4px_8px_rgba(0,0,0,0.06)]'
          "
        >
          <div class="flex items-center gap-2">
            <button type="button" @click="select(palette.id)" class="flex-1 text-left text-sm font-medium text-neutral-700 truncate">
              {{ palette.name }}
            </button>
            <button
              type="button"
              :aria-label="`Редактировать палитру ${palette.name}`"
              @click="router.push(`/mood-palettes/${palette.id}/edit`)"
              class="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600"
            >
              <Pencil :size="14" />
            </button>
            <button
              type="button"
              :aria-label="`Удалить палитру ${palette.name}`"
              @click="remove(palette)"
              class="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500"
            >
              <Trash2 :size="14" />
            </button>
          </div>

          <button type="button" @click="select(palette.id)" class="flex gap-2">
            <span
              v-for="(color, i) in palette.colors"
              :key="i"
              class="w-8 h-8 rounded-xl"
              :style="{ backgroundColor: color }"
              :title="MOOD_LEVELS[i]?.label"
            />
          </button>
        </div>

        <button
          type="button"
          @click="router.push('/mood-palettes/new')"
          class="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 py-3 text-sm"
        >
          <Plus :size="16" /> Своя палитра
        </button>
      </section>
    </div>
  </main>
</template>
