<script setup lang="ts">
import { computed } from 'vue'
import type { ChartBar } from '../lib/periods'

const props = defineProps<{
  bars: ChartBar[]
  selectedKey: string | null
  /** Цвет дорожки-маркера выбранного действия. null/не задан — маркеры не рисуем. */
  markerColor?: string | null
}>()
const emit = defineEmits<{ select: [key: string | null] }>()

const MAX_LEVEL = 7

// Подписи не под каждым столбиком: на 14 днях они слипаются в кашу.
const labelEvery = computed(() => (props.bars.length > 8 ? Math.ceil(props.bars.length / 6) : 1))

function heightPercent(value: number | null): number {
  return value === null ? 0 : (value / MAX_LEVEL) * 100
}

/**
 * Непрозрачность столбика: выбор периода и фильтр по действию — два разных
 * затемнения, но одновременно оба не нужны — выбранный период всегда читается
 * чётко, а маркер добавляет градацию только когда период не выбран точечно.
 */
function barOpacity(bar: ChartBar): number {
  if (props.selectedKey) return props.selectedKey === bar.key ? 1 : 0.45
  if (props.markerColor && bar.markerShare != null) return 0.3 + bar.markerShare * 0.7
  return 1
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
          class="w-full rounded-t-xl rounded-b-sm transition-opacity ring-1 ring-inset ring-black/[0.07] shadow-clay-1"
          :style="{ height: `${heightPercent(bar.value)}%`, backgroundColor: bar.color, opacity: barOpacity(bar) }"
        />
      </button>
    </div>

    <!-- Дорожка маркеров выбранного действия: точка есть, если в этот день
         (или у части дней бакета) оно было отмечено; насыщенность = доля. -->
    <div v-if="markerColor" class="flex gap-[3px] h-2">
      <span v-for="bar in bars" :key="`${bar.key}-marker`" class="flex-1 min-w-0 flex items-center justify-center">
        <span
          v-if="bar.markerShare != null && bar.markerShare > 0"
          class="w-1.5 h-1.5 rounded-full shrink-0"
          :style="{ backgroundColor: markerColor, opacity: 0.35 + bar.markerShare * 0.65 }"
        />
      </span>
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
