<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ICON_GROUPS, resolveIcon } from '../lib/icons'

defineProps<{ modelValue: string; color?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const query = ref('')

// Ищем и по английскому имени иконки, и по русской подписи группы:
// совпало название группы — показываем её целиком.
const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return ICON_GROUPS.map((group) => {
    const names = Object.keys(group.icons)
    if (!q || group.label.toLowerCase().includes(q)) return { label: group.label, names }
    return { label: group.label, names: names.filter((n) => n.toLowerCase().includes(q)) }
  }).filter((group) => group.names.length > 0)
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
        class="absolute z-50 mt-2 w-72 p-3 bg-white rounded-2xl shadow-clay-3 flex flex-col gap-2"
      >
        <input
          v-model="query"
          type="text"
          placeholder="Поиск: спорт, еда, coffee…"
          autofocus
          class="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-accent"
        />

        <div class="max-h-64 overflow-y-auto flex flex-col gap-2">
          <section v-for="group in filteredGroups" :key="group.label" class="flex flex-col gap-1">
            <h3 class="text-[11px] text-neutral-400 sticky top-0 bg-white py-1">{{ group.label }}</h3>
            <div class="grid grid-cols-6 gap-2">
              <button
                v-for="name in group.names"
                :key="name"
                type="button"
                :title="name"
                @click="pick(name)"
                class="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-neutral-100"
                :class="name === modelValue ? 'bg-neutral-100' : ''"
              >
                <component :is="resolveIcon(name)" :size="18" :style="{ color: color ?? '#525252' }" />
              </button>
            </div>
          </section>
          <p v-if="filteredGroups.length === 0" class="text-center text-xs text-neutral-400 py-4">
            Ничего не найдено
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
