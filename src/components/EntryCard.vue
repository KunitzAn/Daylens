<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed } from 'vue'
import type { Category, Entry, Tag } from '../lib/db'
import { formatDateWithWeekday, formatTime } from '../lib/date'
import { resolveIcon } from '../lib/icons'
import { moodLevel } from '../lib/mood'
import type { MoodSet } from '../lib/moodSets'

const props = defineProps<{
  entry: Entry
  tagsById: Map<string, Tag>
  categoriesById: Map<string, Category>
  moodSet: MoodSet
}>()

const emit = defineEmits<{ open: []; remove: [] }>()

const mood = computed(() => moodLevel(props.entry.mood))
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
    class="relative rounded-3xl bg-white p-4 flex flex-col gap-3 text-left w-full cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
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
        class="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-2xl shrink-0"
        :style="{ backgroundColor: moodImage ? 'transparent' : (mood?.color ?? '#a8a29e') }"
      >
        <img v-if="moodImage" :src="moodImage" :alt="mood?.label" class="w-full h-full object-cover" />
        <template v-else>{{ mood?.emoji }}</template>
      </span>

      <div class="min-w-0">
        <p class="text-xs uppercase tracking-wide text-neutral-400 truncate">
          {{ formatDateWithWeekday(entry.date) }}
        </p>
        <p class="flex items-baseline gap-2">
          <span class="text-lg font-semibold" :style="{ color: mood?.color }">
            {{ mood?.label }}
          </span>
          <span class="text-xs text-neutral-400">{{ formatTime(entry.createdAt) }}</span>
        </p>
      </div>
    </header>

    <div v-if="entryTags.length" class="flex flex-wrap gap-x-3 gap-y-2">
      <span v-for="tag in entryTags" :key="tag.id" class="flex items-center gap-1.5 text-sm text-neutral-600">
        <component
          :is="resolveIcon(tag.icon)"
          :size="16"
          class="opacity-60"
          :style="{ color: categoriesById.get(tag.categoryId)?.color ?? '#a8a29e' }"
        />
        {{ tag.name }}
      </span>
    </div>

    <p v-if="entry.note" class="text-sm text-neutral-600 whitespace-pre-line">{{ entry.note }}</p>
  </article>
</template>
