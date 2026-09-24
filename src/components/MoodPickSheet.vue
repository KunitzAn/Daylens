<script setup lang="ts">
import { MOOD_LEVELS } from '../lib/mood'
import { useMoodColors } from '../lib/moodPalettes'
import { moodSetEmoji, type MoodSet } from '../lib/moodSets'

const props = defineProps<{ moodSet: MoodSet; activeLevel: number }>()
const emit = defineEmits<{ close: []; pick: [level: number] }>()

const { colorFor } = useMoodColors()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <div class="absolute inset-0 bg-black/30" @click="emit('close')" />

    <div class="relative w-full max-w-md rounded-t-3xl bg-[#faf9f7] px-4 pt-5 pb-8 flex flex-col gap-2 shadow-clay-3">
      <h2 class="text-base font-semibold text-neutral-800 mb-1">Какое настроение?</h2>

      <button
        v-for="level in MOOD_LEVELS"
        :key="level.value"
        type="button"
        @click="emit('pick', level.value)"
        class="rounded-2xl bg-white px-3 py-2 flex items-center gap-3 text-left shadow-clay-1 transition-shadow"
        :class="props.activeLevel === level.value ? 'shadow-[0_0_0_2px_var(--accent-ink)]' : ''"
      >
        <span
          class="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
          :style="{ backgroundColor: colorFor(level.value) }"
        >
          <img
            v-if="props.moodSet.images"
            :src="props.moodSet.images[level.value - 1]"
            :alt="level.label"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-xl leading-none">{{ moodSetEmoji(props.moodSet, level.value) }}</span>
        </span>
        <span class="text-sm font-medium text-neutral-700">{{ level.label }}</span>
      </button>

      <button type="button" @click="emit('close')" class="rounded-2xl py-3 text-sm text-neutral-500 mt-1">
        Отмена
      </button>
    </div>
  </div>
</template>
