<script setup lang="ts">
import { Check, Plus, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import IconPicker from './IconPicker.vue'
import {
  ACTIVE_MOOD_SET_KEY,
  DEFAULT_MOOD_SET_ID,
  db,
  type Category,
  type Entry,
  type Tag,
} from '../lib/db'
import { formatDateHuman } from '../lib/date'
import { resolveIcon } from '../lib/icons'
import { MOOD_LEVELS } from '../lib/mood'
import { resolveMoodSet } from '../lib/moodSets'
import { runSync } from '../lib/sync'
import { useLiveQuery } from '../lib/useLiveQuery'

const props = defineProps<{ date: string }>()
const emit = defineEmits<{ saved: [] }>()

const activeMoodSetId = useLiveQuery<string>(
  () => db.settings.get(ACTIVE_MOOD_SET_KEY).then((row) => row?.value ?? DEFAULT_MOOD_SET_ID),
  DEFAULT_MOOD_SET_ID,
)
const activeMoodSet = computed(() => resolveMoodSet(activeMoodSetId.value))

const categories = useLiveQuery<Category[]>(
  () => db.categories.orderBy('sortOrder').filter((c) => c.archivedAt === null).toArray(),
  [],
)
const tags = useLiveQuery<Tag[]>(
  () => db.tags.orderBy('sortOrder').filter((t) => t.archivedAt === null).toArray(),
  [],
)

const tagsByCategory = computed(() => {
  const map = new Map<string, Tag[]>()
  for (const tag of tags.value) {
    const list = map.get(tag.categoryId) ?? []
    list.push(tag)
    map.set(tag.categoryId, list)
  }
  return map
})

const entryId = ref<string | null>(null)
const mood = ref<number | null>(null)
const selectedTagIds = ref<string[]>([])
const note = ref('')

async function loadEntry(date: string) {
  const existing = await db.entries.where('date').equals(date).first()

  // Удалённая запись за этот день всё ещё занимает дату (уникальный индекс),
  // поэтому её id мы держим, чтобы при сохранении оживить строку, а не
  // пытаться вставить вторую за тот же день. Но поля показываем пустые —
  // для пользователя день удалён и заполняется с нуля.
  const isDeleted = existing?.deletedAt != null

  entryId.value = existing?.id ?? null
  mood.value = isDeleted ? null : (existing?.mood ?? null)
  selectedTagIds.value = isDeleted ? [] : (existing?.tagIds ?? [])
  note.value = isDeleted ? '' : (existing?.note ?? '')
}

watch(() => props.date, loadEntry, { immediate: true })

function toggleTag(id: string) {
  const i = selectedTagIds.value.indexOf(id)
  if (i === -1) selectedTagIds.value.push(id)
  else selectedTagIds.value.splice(i, 1)
}

// Добавление действия прямо отсюда: «вспомнил в момент записи» — самый
// частый повод завести новый тег, гонять за этим в настройки не надо.
const addingInCategoryId = ref<string | null>(null)
const newTagName = ref('')
const newTagIcon = ref('Circle')

function startAddingTag(categoryId: string) {
  addingInCategoryId.value = categoryId
  newTagName.value = ''
  newTagIcon.value = 'Circle'
}

function cancelAddingTag() {
  addingInCategoryId.value = null
}

async function saveNewTag(categoryId: string) {
  const name = newTagName.value.trim()
  if (!name) return
  const existing = tagsByCategory.value.get(categoryId) ?? []
  const id = crypto.randomUUID()
  await db.tags.add({
    id,
    categoryId,
    name,
    icon: newTagIcon.value,
    sortOrder: existing.length,
    archivedAt: null,
    updatedAt: new Date().toISOString(),
  })
  selectedTagIds.value.push(id) // раз только что завёл — почти наверняка хочет отметить
  addingInCategoryId.value = null
  void runSync()
}

const canSave = computed(() => mood.value !== null)

async function save() {
  if (mood.value === null) return
  const now = new Date().toISOString()

  if (entryId.value) {
    const patch: Partial<Entry> = {
      mood: mood.value,
      tagIds: [...selectedTagIds.value],
      note: note.value,
      updatedAt: now,
      deletedAt: null, // оживляем, если день до этого удаляли
      dirty: true,
    }
    await db.entries.update(entryId.value, patch)
  } else {
    const id = crypto.randomUUID()
    await db.entries.add({
      id,
      date: props.date,
      mood: mood.value,
      note: note.value,
      tagIds: [...selectedTagIds.value],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dirty: true,
    })
    entryId.value = id
  }

  void runSync()
  emit('saved')
}
</script>

<template>
  <div class="w-full flex flex-col items-center gap-8">
    <header class="text-center">
      <!-- Без CSS `capitalize`: он поднимает регистр у каждого слова и делает
           из «17 сентября» — «17 Сентября». -->
      <p class="text-sm text-neutral-500">{{ formatDateHuman(props.date) }}</p>
      <h1 class="text-xl font-semibold text-neutral-800">Как прошёл день?</h1>
    </header>

    <!-- Сетка на 7 колонок, а не flex-wrap: шкала настроения — это одна
         последовательность, и на узком экране седьмой уровень не должен
         уезжать в отдельную строку. -->
    <div class="w-full grid grid-cols-7 gap-1.5">
      <button
        v-for="level in MOOD_LEVELS"
        :key="level.value"
        type="button"
        :aria-label="level.label"
        :title="level.label"
        @click="mood = level.value"
        class="w-full aspect-square flex items-center justify-center rounded-2xl overflow-hidden bg-white transition-transform shadow-[0_6px_12px_rgba(0,0,0,0.08),inset_2px_2px_4px_rgba(255,255,255,0.7),inset_-2px_-2px_4px_rgba(0,0,0,0.06)]"
        :class="mood === level.value ? 'scale-110 ring-2 ring-violet-400' : 'opacity-70 hover:opacity-100'"
      >
        <img
          v-if="activeMoodSet.images"
          :src="activeMoodSet.images[level.value - 1]"
          :alt="level.label"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-xl leading-none">{{ level.emoji }}</span>
      </button>
    </div>

    <div class="w-full flex flex-col gap-6">
      <section v-for="category in categories" :key="category.id" class="flex flex-col gap-3">
        <h2 class="text-sm font-medium flex items-center gap-2" :style="{ color: category.color }">
          <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: category.color }" />
          <span class="truncate">{{ category.name }}</span>
        </h2>

        <!-- Сетка, а не flex-wrap: у плитки фиксированная ширина колонки, и
             подпись переносится внутри неё. На flex-wrap длинное слово вроде
             «Многозадачность» распирало плитку и наезжало на соседнюю. -->
        <div class="grid grid-cols-4 gap-x-2 gap-y-3">
          <button
            v-for="tag in tagsByCategory.get(category.id) ?? []"
            :key="tag.id"
            type="button"
            :title="tag.name"
            @click="toggleTag(tag.id)"
            class="flex flex-col items-center gap-1 min-w-0"
          >
            <span
              class="w-14 h-14 shrink-0 rounded-full flex items-center justify-center border-2 transition-transform"
              :class="selectedTagIds.includes(tag.id) ? 'scale-105' : ''"
              :style="
                selectedTagIds.includes(tag.id)
                  ? { backgroundColor: category.color, borderColor: category.color }
                  : { backgroundColor: 'white', borderColor: category.color }
              "
            >
              <component
                :is="resolveIcon(tag.icon)"
                :size="22"
                :stroke-width="2"
                :style="{ color: selectedTagIds.includes(tag.id) ? 'white' : category.color }"
              />
            </span>
            <!-- hyphens-auto, чтобы «Продуктивный» переносилось по слогам,
                 а не рвалось как «Продуктивны/й». Работает от lang документа. -->
            <span
              class="w-full text-xs text-neutral-600 text-center leading-tight break-words hyphens-auto"
            >
              {{ tag.name }}
            </span>
          </button>

          <button
            v-if="addingInCategoryId !== category.id"
            type="button"
            :aria-label="`Добавить действие в раздел ${category.name}`"
            @click="startAddingTag(category.id)"
            class="flex flex-col items-center gap-1 min-w-0"
          >
            <span
              class="w-14 h-14 shrink-0 rounded-full flex items-center justify-center border-2 border-dashed text-neutral-400"
              :style="{ borderColor: category.color, color: category.color }"
            >
              <Plus :size="22" />
            </span>
            <span class="w-full text-xs text-neutral-400 text-center leading-tight break-words">
              Добавить
            </span>
          </button>
        </div>

        <div v-if="addingInCategoryId === category.id" class="flex items-center gap-2">
          <IconPicker v-model="newTagIcon" :color="category.color" />
          <input
            v-model="newTagName"
            type="text"
            placeholder="Название действия"
            @keyup.enter="saveNewTag(category.id)"
            class="flex-1 min-w-0 rounded-2xl bg-white p-3 text-sm text-neutral-700 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button
            type="button"
            aria-label="Сохранить действие"
            :disabled="!newTagName.trim()"
            @click="saveNewTag(category.id)"
            class="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40"
            :style="{ backgroundColor: category.color }"
          >
            <Check :size="18" />
          </button>
          <button
            type="button"
            aria-label="Отменить"
            @click="cancelAddingTag"
            class="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 shrink-0"
          >
            <X :size="18" />
          </button>
        </div>
      </section>
    </div>

    <textarea
      v-model="note"
      placeholder="Заметка (необязательно)"
      rows="3"
      class="w-full rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] outline-none focus:ring-2 focus:ring-violet-300 resize-none"
    />

    <button
      type="button"
      :disabled="!canSave"
      @click="save"
      class="w-full rounded-2xl py-3 text-white font-medium transition-opacity bg-violet-400 shadow-[0_6px_12px_rgba(0,0,0,0.1)] disabled:opacity-40"
    >
      {{ entryId ? 'Сохранить изменения' : 'Записать' }}
    </button>
  </div>
</template>
