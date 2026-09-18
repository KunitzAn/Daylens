<script setup lang="ts">
import { ref } from 'vue'
import { MOOD_EMOJI_CATALOG } from '../lib/moodEmojis'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)

function pick(emoji: string) {
  emit('update:modelValue', emoji)
  open.value = false
}
</script>

<template>
  <div class="relative shrink-0">
    <button
      type="button"
      @click="open = !open"
      class="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-accent bg-white text-2xl"
    >
      {{ modelValue }}
    </button>

    <template v-if="open">
      <div class="fixed inset-0 z-40" @click="open = false" />
      <div class="absolute z-50 mt-2 w-72 p-3 bg-white rounded-2xl shadow-clay-3">
        <div class="max-h-64 overflow-y-auto grid grid-cols-8 gap-1">
          <button
            v-for="emoji in MOOD_EMOJI_CATALOG"
            :key="emoji"
            type="button"
            @click="pick(emoji)"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-xl hover:bg-neutral-100"
            :class="emoji === modelValue ? 'bg-neutral-100' : ''"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
