<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ICON_GROUPS, resolveIcon } from '../lib/icons'

defineProps<{ modelValue: string; color?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const query = ref('')

// Список открывался всегда вниз и у нижних действий в форме наполовину
// уезжал за край экрана. Перед открытием меряем, где больше места, и
// раскрываемся в эту сторону, а высоту списка подрезаем под то, что есть.
const trigger = ref<HTMLElement | null>(null)
const dropUp = ref(false)
const listMaxHeight = ref(256)

/** Поле поиска, отступы и заголовок — всё, что в карточке занимает место помимо списка. */
const CHROME_PX = 92
const MIN_LIST_PX = 150
const MAX_LIST_PX = 320
const EDGE_GAP_PX = 12

function toggle() {
  open.value = !open.value
  if (!open.value) return

  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const below = window.innerHeight - rect.bottom - EDGE_GAP_PX
  const above = rect.top - EDGE_GAP_PX

  // Вверх разворачиваемся, только если снизу и правда тесно, а сверху
  // просторнее: иначе список прыгал бы вверх при малейшем недостатке места.
  dropUp.value = below < MIN_LIST_PX + CHROME_PX && above > below
  const room = (dropUp.value ? above : below) - CHROME_PX
  listMaxHeight.value = Math.min(MAX_LIST_PX, Math.max(MIN_LIST_PX, room))
}

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
      ref="trigger"
      type="button"
      @click="toggle"
      class="w-12 h-12 rounded-2xl flex items-center justify-center border-2 bg-surface"
      :style="{ borderColor: color ?? '#a78bfa', color: color ?? '#a78bfa' }"
    >
      <component :is="resolveIcon(modelValue)" :size="22" />
    </button>

    <template v-if="open">
      <div class="fixed inset-0 z-40" @click="open = false" />
      <div
        class="absolute z-50 w-72 p-3 bg-surface rounded-2xl shadow-clay-3 flex flex-col gap-2"
        :class="dropUp ? 'bottom-full mb-2' : 'top-full mt-2'"
      >
        <input
          v-model="query"
          type="text"
          placeholder="Поиск: спорт, еда, coffee…"
          autofocus
          class="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-accent"
        />

        <!-- overscroll-contain: долистав список до конца, палец не утаскивает
             за собой страницу под открытым пикером. -->
        <div
          class="overflow-y-auto overscroll-contain flex flex-col gap-2"
          :style="{ maxHeight: `${listMaxHeight}px` }"
        >
          <section v-for="group in filteredGroups" :key="group.label" class="flex flex-col gap-1">
            <h3 class="text-[11px] text-neutral-400 sticky top-0 bg-surface py-1">{{ group.label }}</h3>
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
                <component :is="resolveIcon(name)" :size="18" :style="{ color: color ?? 'var(--color-neutral-500)' }" />
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
