<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed } from 'vue'
import type { Category, Entry, Tag } from '../lib/db'
import { formatDateWithWeekday, formatTime } from '../lib/date'
import { resolveIcon } from '../lib/icons'
import { moodLevel } from '../lib/mood'
import { useMoodColors } from '../lib/moodPalettes'
import type { MoodSet } from '../lib/moodSets'

const props = defineProps<{
  entry: Entry
  tagsById: Map<string, Tag>
  categoriesById: Map<string, Category>
  moodSet: MoodSet
}>()

const emit = defineEmits<{ open: []; remove: [] }>()

const { colorFor } = useMoodColors()
const mood = computed(() => moodLevel(props.entry.mood))
const moodColor = computed(() => colorFor.value(props.entry.mood))
const moodImage = computed(() => props.moodSet.images?.[props.entry.mood - 1])

const entryTags = computed(() =>
  props.entry.tagIds
    .map((id) => props.tagsById.get(id))
    .filter((tag): tag is Tag => tag !== undefined),
)
</script>

<template>
  <article
    role="button"
    tabindex="0"
    @click="emit('open')"
    @keyup.enter="emit('open')"
    class="tone tint-day relative rounded-card p-4 flex flex-col gap-3 text-left w-full cursor-pointer shadow-clay-1 transition-transform active:scale-[.99]"
    :style="{ '--c': moodColor }"
  >
    <button
      type="button"
      :aria-label="`Удалить запись за ${formatDateWithWeekday(entry.date)}`"
      @click.stop="emit('remove')"
      class="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50"
    >
      <X :size="16" />
    </button>

    <header class="flex items-center gap-3 pr-8">
      <span
        class="halo w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-2xl shrink-0"
        :style="{ backgroundColor: moodImage ? '#ffffff' : moodColor }"
      >
        <img v-if="moodImage" :src="moodImage" :alt="mood?.label" class="w-full h-full object-cover" />
        <template v-else>{{ mood?.emoji }}</template>
      </span>

      <div class="min-w-0">
        <p class="text-xs uppercase tracking-wide text-neutral-500 truncate">
          {{ formatDateWithWeekday(entry.date) }}
        </p>
        <p class="flex items-baseline gap-2">
          <!-- Подпись тёмная, а не в цвете настроения: карточка теперь сама
               тонирована этим цветом, и цветной текст на ней сливался бы. -->
          <span class="text-lg font-bold text-neutral-800">{{ mood?.label }}</span>
          <span class="text-xs text-neutral-500">{{ formatTime(entry.createdAt) }}</span>
        </p>
      </div>
    </header>

    <div v-if="entryTags.length" class="flex flex-wrap gap-x-3 gap-y-2">
      <span v-for="tag in entryTags" :key="tag.id" class="flex items-center gap-1.5 text-sm text-neutral-700">
        <component
          :is="resolveIcon(tag.icon)"
          :size="16"
          class="opacity-60"
          :style="{ color: categoriesById.get(tag.categoryId)?.color ?? '#a8a29e' }"
        />
        {{ tag.name }}
      </span>
    </div>

    <p v-if="entry.note" class="text-sm text-neutral-700 whitespace-pre-line">{{ entry.note }}</p>
  </article>
</template>
