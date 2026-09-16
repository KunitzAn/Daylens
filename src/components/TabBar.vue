<script setup lang="ts">
import { BarChart3, CalendarDays, MoreHorizontal, NotebookPen, Plus } from '@lucide/vue'
import { RouterLink, useRouter } from 'vue-router'
import { todayLocalDate } from '../lib/date'

const router = useRouter()

const tabs = [
  { to: '/', label: 'Записи', icon: NotebookPen },
  { to: '/stats', label: 'Статистика', icon: BarChart3 },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays },
  { to: '/more', label: 'Больше', icon: MoreHorizontal },
]
</script>

<template>
  <div class="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
    <div class="mx-auto max-w-md px-4 pb-4 flex items-end gap-3">
      <nav
        class="pointer-events-auto flex-1 flex items-center justify-around rounded-3xl bg-white px-2 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      >
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex flex-col items-center gap-0.5 px-2 py-1 rounded-2xl"
          active-class="text-violet-500"
          exact-active-class="text-violet-500"
          :class="$route.path === tab.to ? 'text-violet-500' : 'text-neutral-400'"
        >
          <component :is="tab.icon" :size="20" />
          <span class="text-[10px] leading-none">{{ tab.label }}</span>
        </RouterLink>
      </nav>

      <button
        type="button"
        aria-label="Добавить запись за сегодня"
        @click="router.push(`/day/${todayLocalDate()}`)"
        class="pointer-events-auto w-14 h-14 shrink-0 rounded-full bg-violet-400 text-white flex items-center justify-center shadow-[0_8px_20px_rgba(167,139,250,0.5)]"
      >
        <Plus :size="26" />
      </button>
    </div>
  </div>
</template>
