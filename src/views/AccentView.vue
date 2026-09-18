<script setup lang="ts">
import { ArrowLeft, Check, Plus } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { ACCENTS, setActiveAccentId } from '../lib/accents'
import { ACTIVE_ACCENT_KEY, db, DEFAULT_ACCENT_ID } from '../lib/db'
import { useLiveQuery } from '../lib/useLiveQuery'

const router = useRouter()

const activeId = useLiveQuery<string>(
  () => db.settings.get(ACTIVE_ACCENT_KEY).then((row) => row?.value ?? DEFAULT_ACCENT_ID),
  DEFAULT_ACCENT_ID,
)
</script>

<template>
  <main class="min-h-dvh p-6 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <button
          type="button"
          aria-label="Назад"
          @click="router.push('/more')"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-clay-2 shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>
        <h1 class="text-lg font-bold text-neutral-800">Цвет приложения</h1>
      </header>

      <div class="grid grid-cols-4 gap-4">
        <button
          v-for="accent in ACCENTS"
          :key="accent.id"
          type="button"
          :aria-label="accent.name"
          :aria-pressed="activeId === accent.id"
          @click="setActiveAccentId(accent.id)"
          class="flex flex-col items-center gap-2 min-w-0"
        >
          <span
            class="tone w-full aspect-square rounded-tile flex items-center justify-center text-white halo"
            :style="{
              '--c': accent.hex,
              background: `linear-gradient(158deg, ${accent.hex}, color-mix(in oklab, ${accent.hex} 68%, #1b1725))`,
            }"
          >
            <Check v-if="activeId === accent.id" :size="20" />
          </span>
          <span class="text-[11px] text-center leading-tight text-neutral-500 break-words">
            {{ accent.name }}
          </span>
        </button>
      </div>

      <div class="rounded-card bg-white p-4 flex flex-col gap-3 shadow-clay-1">
        <p class="text-sm font-semibold text-neutral-700">Как это выглядит</p>

        <div class="flex items-center gap-3">
          <span class="flex-1 rounded-2xl bg-neutral-100 h-10 flex items-center px-3 text-xs text-neutral-400">
            Лента, статистика, календарь
          </span>
          <button
            type="button"
            aria-hidden="true"
            tabindex="-1"
            class="w-12 h-12 shrink-0 rounded-full text-white flex items-center justify-center shadow-clay-3"
            :style="{
              background: 'linear-gradient(160deg, var(--accent), var(--accent-ink))',
              boxShadow:
                'var(--shadow-clay-3), 0 14px 28px -6px color-mix(in oklab, var(--accent) 80%, transparent)',
            }"
          >
            <Plus :size="24" />
          </button>
        </div>

        <p class="text-xs text-neutral-400">
          Цветом красятся кнопка «+», активная вкладка, сегодняшний день в календаре и выделения.
          Цвета настроений живут отдельно — в «Цветах настроений».
        </p>
      </div>
    </div>
  </main>
</template>
