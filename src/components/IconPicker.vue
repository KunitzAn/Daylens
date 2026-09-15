<script setup lang="ts">
import { ref } from 'vue'
import { ICON_NAMES, resolveIcon } from '../lib/icons'

defineProps<{ modelValue: string; color?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)

function pick(name: string) {
  emit('update:modelValue', name)
  open.value = false
}
</script>

<template>
  <div class="relative shrink-0">
    <button
      type="button"
      @click="open = !open"
      class="w-12 h-12 rounded-2xl flex items-center justify-center border-2 bg-white"
      :style="{ borderColor: color ?? '#a78bfa', color: color ?? '#a78bfa' }"
    >
      <component :is="resolveIcon(modelValue)" :size="22" />
    </button>

    <template v-if="open">
      <div class="fixed inset-0 z-40" @click="open = false" />
      <div
        class="absolute z-50 mt-2 w-64 max-h-64 overflow-y-auto grid grid-cols-6 gap-2 p-3 bg-white rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.15)]"
      >
        <button
          v-for="name in ICON_NAMES"
          :key="name"
          type="button"
          @click="pick(name)"
          class="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-neutral-100"
          :class="name === modelValue ? 'bg-neutral-100' : ''"
        >
          <component :is="resolveIcon(name)" :size="18" :style="{ color: color ?? '#525252' }" />
        </button>
      </div>
    </template>
  </div>
</template>
