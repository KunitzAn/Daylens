<script setup lang="ts">
import { computed } from 'vue'
import type { ChartBar } from '../lib/periods'

const props = defineProps<{
  bars: ChartBar[]
  selectedKey: string | null
}>()
const emit = defineEmits<{ select: [key: string | null] }>()

const MAX_LEVEL = 7

// Подписи не под каждым столбиком: на 14 днях они слипаются в кашу.
const labelEvery = computed(() => (props.bars.length > 8 ? Math.ceil(props.bars.length / 6) : 1))

function heightPercent(value: number | null): number {
  return value === null ? 0 : (value / MAX_LEVEL) * 100
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-end gap-[3px] h-32 border-b border-neutral-100">
      <button
        v-for="bar in bars"
        :key="bar.key"
        type="button"
        :aria-label="`${bar.title}: ${bar.value === null ? 'записей нет' : bar.value.toFixed(1)}`"
        :aria-pressed="selectedKey === bar.key"
        @click="emit('select', selectedKey === bar.key ? null : bar.key)"
        class="flex-1 h-full min-w-0 flex items-end rounded-t-md transition-colors"
        :class="selectedKey === bar.key ? 'bg-neutral-100' : 'hover:bg-neutral-50'"
      >
        <!-- Контур обязателен: середина дивергирующей палитры — почти белая
             (так и задумано, «ни хорошо ни плохо»), и без обводки нейтральный
             день на белой карточке выглядел бы как отсутствие данных.
             Пустой период не рисует ничего — только пустая колонка. -->
        <span
          v-if="bar.value !== null"
          class="w-full rounded-t-md transition-opacity ring-1 ring-inset ring-black/[0.07]"
          :style="{ height: `${heightPercent(bar.value)}%`, backgroundColor: bar.color }"
          :class="selectedKey && selectedKey !== bar.key ? 'opacity-45' : ''"
        />
      </button>
    </div>

    <div class="flex gap-[3px]">
      <!-- Без truncate: колонка уже подписи («04.09» в 24px не влезает), но
           подписи стоят через labelEvery, так что текст свободно вылезает
           в соседние пустые колонки и ни с чем не сталкивается. -->
      <span
        v-for="(bar, i) in bars"
        :key="bar.key"
        class="flex-1 min-w-0 text-[10px] text-center whitespace-nowrap"
        :class="selectedKey === bar.key ? 'text-neutral-600 font-medium' : 'text-neutral-400'"
      >
        {{ selectedKey === bar.key || i % labelEvery === 0 ? bar.label : '' }}
      </span>
    </div>
  </div>
</template>
