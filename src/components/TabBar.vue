<script setup lang="ts">
import { BarChart3, CalendarDays, MoreHorizontal, NotebookPen, Plus } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import PickDaySheet from './PickDaySheet.vue'

const router = useRouter()
const pickingDay = ref(false)

const tabs = [
  { to: '/', label: 'Записи', icon: NotebookPen },
  { to: '/stats', label: 'Статистика', icon: BarChart3 },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays },
  { to: '/more', label: 'Больше', icon: MoreHorizontal },
]

function openDay(date: string) {
  pickingDay.value = false
  router.push(`/day/${date}`)
}
</script>

<template>
  <div class="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
    <div class="mx-auto max-w-md px-4 pb-4 flex items-end gap-3">
      <nav
        class="glass pointer-events-auto flex-1 flex items-center justify-around rounded-card px-2 py-2 shadow-clay-3"
      >
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-2xl transition-colors"
          active-class="text-accent-ink"
          exact-active-class="text-accent-ink"
          :class="$route.path === tab.to ? 'text-accent-ink font-bold' : 'text-neutral-400'"
        >
          <component :is="tab.icon" :size="20" />
          <span class="text-[10px] leading-none">{{ tab.label }}</span>
        </RouterLink>
      </nav>

      <!-- Раньше «+» сразу вело на сегодня, а выбор другого дня жил в
           отдельной маленькой кнопке на экране ленты — два способа сделать
           одно и то же. Теперь «+» само спрашивает «за какой день», а
           «Сегодня» — первый и самый быстрый вариант в этом листе, так что
           обычный ежедневный путь не стал длиннее чем на один тап. -->
      <button
        type="button"
        aria-label="Добавить запись"
        @click="pickingDay = true"
        class="pointer-events-auto w-14 h-14 shrink-0 rounded-full text-white flex items-center justify-center transition-transform active:scale-95"
        :style="{
          background: 'linear-gradient(160deg, var(--accent), var(--accent-ink))',
          boxShadow:
            'var(--shadow-clay-3), 0 14px 28px -6px color-mix(in oklab, var(--accent) 80%, transparent)',
        }"
      >
        <Plus :size="26" />
      </button>
    </div>
  </div>

  <PickDaySheet v-if="pickingDay" @close="pickingDay = false" @pick="openDay" />
</template>
