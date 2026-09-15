<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ICON_NAMES, resolveIcon } from '../lib/icons'

defineProps<{ modelValue: string; color?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const query = ref('')

const filteredNames = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return ICON_NAMES
  return ICON_NAMES.filter((name) => name.toLowerCase().includes(q))
})

watch(open, (isOpen) => {
  if (!isOpen) query.value = ''
})

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
        class="absolute z-50 mt-2 w-72 p-3 bg-white rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.15)] flex flex-col gap-2"
      >
        <input
          v-model="query"
          type="text"
          placeholder="Поиск (на английском, напр. coffee)"
          autofocus
          class="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-violet-300"
        />

        <div class="max-h-56 overflow-y-auto grid grid-cols-6 gap-2">
          <button
            v-for="name in filteredNames"
            :key="name"
            type="button"
            :title="name"
            @click="pick(name)"
            class="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-neutral-100"
            :class="name === modelValue ? 'bg-neutral-100' : ''"
          >
            <component :is="resolveIcon(name)" :size="18" :style="{ color: color ?? '#525252' }" />
          </button>
          <p v-if="filteredNames.length === 0" class="col-span-6 text-center text-xs text-neutral-400 py-4">
            Ничего не найдено
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
