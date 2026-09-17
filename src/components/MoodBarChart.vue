<script setup lang="ts">
import { computed, ref } from 'vue'
import { capitalizeFirst, formatDateWithWeekday, formatDayShort } from '../lib/date'
import { moodLevel } from '../lib/mood'

const props = defineProps<{
  /** Даты периода по возрастанию — включая дни без записи. */
  dates: string[]
  moodByDate: Map<string, number>
  colorFor: (level: number) => string
}>()

const MAX_LEVEL = 7
const selected = ref<string | null>(null)

const bars = computed(() =>
  props.dates.map((date) => {
    const mood = props.moodByDate.get(date)
    return {
      date,
      mood,
      // Пустой день — это пустой день, а не ноль: столбика просто нет,
      // соединять соседние дни линией через пропуск было бы враньём.
      heightPercent: mood ? (mood / MAX_LEVEL) * 100 : 0,
      color: mood ? props.colorFor(mood) : undefined,
    }
  }),
)

const selectedBar = computed(() => bars.value.find((b) => b.date === selected.value))

// Подписи не под каждым столбиком: на 30 днях они слипнутся в кашу.
const labelEvery = computed(() => (props.dates.length > 10 ? Math.ceil(props.dates.length / 6) : 1))
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="h-5 text-xs text-neutral-500">
      <template v-if="selectedBar">
        <span>{{ capitalizeFirst(formatDateWithWeekday(selectedBar.date)) }}</span>
        —
        <span v-if="selectedBar.mood" :style="{ color: selectedBar.color }" class="font-medium">
          {{ moodLevel(selectedBar.mood)?.label }}
        </span>
        <span v-else>записи нет</span>
      </template>
    </p>

    <div class="flex items-end gap-[2px] h-32">
      <button
        v-for="bar in bars"
        :key="bar.date"
        type="button"
        :aria-label="`${bar.date}: ${bar.mood ? moodLevel(bar.mood)?.label : 'записи нет'}`"
        @click="selected = selected === bar.date ? null : bar.date"
        class="flex-1 h-full flex items-end min-w-0"
      >
        <span
          v-if="bar.mood"
          class="w-full rounded-t transition-opacity"
          :style="{ height: `${bar.heightPercent}%`, backgroundColor: bar.color }"
          :class="selected && selected !== bar.date ? 'opacity-40' : ''"
        />
        <span v-else class="w-full h-[2px] rounded bg-neutral-200" />
      </button>
    </div>

    <div class="flex gap-[2px]">
      <span
        v-for="(bar, i) in bars"
        :key="bar.date"
        class="flex-1 min-w-0 text-[10px] text-neutral-400 text-center truncate"
      >
        {{ i % labelEvery === 0 ? formatDayShort(bar.date) : '' }}
      </span>
    </div>
  </div>
</template>
