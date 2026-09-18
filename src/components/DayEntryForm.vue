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
  type MoodEmojiSet,
  type Tag,
} from '../lib/db'
import { formatDateHuman } from '../lib/date'
import { resolveIcon } from '../lib/icons'
import { MOOD_LEVELS } from '../lib/mood'
import { useMoodColors } from '../lib/moodPalettes'
import { moodSetEmoji, resolveMoodSet } from '../lib/moodSets'
import { runSync } from '../lib/sync'
import { useLiveQuery } from '../lib/useLiveQuery'

const props = defineProps<{ date: string }>()
const emit = defineEmits<{ saved: [] }>()

const activeMoodSetId = useLiveQuery<string>(
  () => db.settings.get(ACTIVE_MOOD_SET_KEY).then((row) => row?.value ?? DEFAULT_MOOD_SET_ID),
  DEFAULT_MOOD_SET_ID,
)
const customMoodSets = useLiveQuery<MoodEmojiSet[]>(() => db.moodEmojiSets.toArray(), [])
const activeMoodSet = computed(() => resolveMoodSet(activeMoodSetId.value, customMoodSets.value))
const { colorFor } = useMoodColors()

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

// Подсветка всего экрана цветом выбранного настроения — ради этого стиль и брали.
const ambientColor = computed(() => (mood.value === null ? null : colorFor.value(mood.value)))

/**
 * Заливаем плитку цветом только у эмодзи-наборов. Если набор картиночный,
 * заливки всё равно не видно — картинка непрозрачна и закрывает плитку
 * целиком, поэтому цвет там несёт ореол снаружи (класс .halo).
 */
function moodTileFill(level: number): string {
  const isSelected = mood.value === level
  return isSelected && !activeMoodSet.value.images ? colorFor.value(level) : '#ffffff'
}

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

// ---------------------------------------------------------------------------
// Долгое нажатие на тег — редактировать, а не только отметить. Собрано на
// pointerdown/up/move: сработает и на пальце, и на мыши в браузере. Порог
// движения отменяет распознавание — иначе случайный свайп ленты триггерил бы
// редактирование. suppressClick гасит клик-тоггл, который иначе полетел бы
// следом за отпусканием пальца после долгого нажатия.
const LONG_PRESS_MS = 480
const MOVE_CANCEL_PX = 10
let pressTimer: ReturnType<typeof setTimeout> | null = null
let pressStart = { x: 0, y: 0 }
let suppressClick = false
const pressingTagId = ref<string | null>(null)

function clearPress() {
  if (pressTimer) clearTimeout(pressTimer)
  pressTimer = null
  pressingTagId.value = null
}

function onTagPointerDown(tag: Tag, event: PointerEvent) {
  pressStart = { x: event.clientX, y: event.clientY }
  suppressClick = false
  pressingTagId.value = tag.id
  pressTimer = setTimeout(() => {
    suppressClick = true
    pressingTagId.value = null
    openEditTag(tag)
  }, LONG_PRESS_MS)
}

function onTagPointerMove(event: PointerEvent) {
  if (!pressTimer) return
  const dx = event.clientX - pressStart.x
  const dy = event.clientY - pressStart.y
  if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearPress()
}

function onTagClick(tag: Tag) {
  clearPress()
  if (suppressClick) {
    suppressClick = false
    return
  }
  toggleTag(tag.id)
}

const editingTag = ref<Tag | null>(null)
const editTagName = ref('')
const editTagIcon = ref('Circle')
const editingTagColor = computed(
  () => categories.value.find((c) => c.id === editingTag.value?.categoryId)?.color ?? '#78716c',
)

function openEditTag(tag: Tag) {
  editingTag.value = tag
  editTagName.value = tag.name
  editTagIcon.value = tag.icon
}

function closeEditTag() {
  editingTag.value = null
}

async function saveEditedTag() {
  const tag = editingTag.value
  const name = editTagName.value.trim()
  if (!tag || !name) return
  await db.tags.update(tag.id, { name, icon: editTagIcon.value, updatedAt: new Date().toISOString() })
  closeEditTag()
  void runSync()
}

async function archiveEditedTag() {
  const tag = editingTag.value
  if (!tag) return
  if (!confirm(`Скрыть действие «${tag.name}»? Уже сохранённые записи его не потеряют.`)) return
  const now = new Date().toISOString()
  await db.tags.update(tag.id, { archivedAt: now, updatedAt: now })
  // Если тег отмечен в этой ещё не сохранённой записи — снимаем отметку,
  // иначе запись ссылалась бы на тег, скрытый из выбора.
  selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tag.id)
  closeEditTag()
  void runSync()
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
    <!-- Экран теплеет под выбранное настроение. Лежит за содержимым, но над
         общим фоновым «мешем» (у него z-index: -2). -->
    <div
      v-if="ambientColor"
      aria-hidden="true"
      class="mood-ambient fixed inset-x-0 top-0 h-[55vh] pointer-events-none transition-opacity duration-500"
      :style="{ zIndex: -1, '--c': ambientColor }"
    />

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
        class="tone w-full aspect-square flex items-center justify-center rounded-tile overflow-hidden transition-transform duration-200"
        :style="{
          '--c': colorFor(level.value),
          backgroundColor: moodTileFill(level.value),
        }"
        :class="
          mood === level.value
            ? 'halo -translate-y-1 scale-105'
            : 'shadow-clay-2 opacity-75 hover:opacity-100'
        "
      >
        <img
          v-if="activeMoodSet.images"
          :src="activeMoodSet.images[level.value - 1]"
          :alt="level.label"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-xl leading-none">{{ moodSetEmoji(activeMoodSet, level.value) }}</span>
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
            :title="`${tag.name} · долгое нажатие — изменить`"
            @pointerdown="onTagPointerDown(tag, $event)"
            @pointermove="onTagPointerMove"
            @pointerup="clearPress"
            @pointercancel="clearPress"
            @pointerleave="clearPress"
            @click="onTagClick(tag)"
            @contextmenu.prevent
            class="flex flex-col items-center gap-1 min-w-0 select-none"
          >
            <!-- Выбранный тег вдавливается внутрь: для переключателя
                 «было / не было» это точнее, чем просто заливка. Во время
                 долгого нажатия слегка приседает — обратная связь, что
                 палец распознан, а не просто игнорируется. -->
            <span
              class="tone w-14 h-14 shrink-0 rounded-full flex items-center justify-center transition-all duration-150"
              :style="{
                '--c': category.color,
                backgroundColor: selectedTagIds.includes(tag.id) ? category.color : '#ffffff',
              }"
              :class="[
                selectedTagIds.includes(tag.id)
                  ? 'shadow-clay-in'
                  : 'shadow-clay-2 hover:-translate-y-0.5',
                pressingTagId === tag.id ? 'scale-90' : '',
              ]"
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
            class="flex-1 min-w-0 rounded-2xl bg-white p-3 text-sm text-neutral-700 shadow-clay-in outline-none focus:ring-2 focus:ring-accent"
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
      class="w-full rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-clay-in outline-none focus:ring-2 focus:ring-accent resize-none"
    />

    <button
      type="button"
      :disabled="!canSave"
      @click="save"
      class="btn-primary w-full rounded-2xl py-3.5 text-white font-bold transition-opacity disabled:opacity-40"
    >
      {{ entryId ? 'Сохранить изменения' : 'Записать' }}
    </button>

    <!-- Лист редактирования тега — вызывается долгим нажатием на его плитку.
         Тот же смысл, что и редактор в «Больше» → «Разделы», но без ухода с
         экрана записи: правишь тег в моменте, не теряя, что уже заполнил. -->
    <Teleport to="body">
      <div v-if="editingTag" class="fixed inset-0 z-50 flex items-end justify-center">
        <div class="absolute inset-0 bg-black/30" @click="closeEditTag" />
        <div
          class="relative w-full max-w-md rounded-t-card bg-[#faf9f7] px-5 pt-5 pb-8 flex flex-col gap-4 shadow-clay-3"
        >
          <h2 class="text-base font-bold text-neutral-800">Действие</h2>

          <div class="flex items-center gap-2">
            <IconPicker v-model="editTagIcon" :color="editingTagColor" />
            <input
              v-model="editTagName"
              type="text"
              placeholder="Название действия"
              @keyup.enter="saveEditedTag"
              class="flex-1 min-w-0 rounded-2xl bg-white p-3 text-sm text-neutral-700 shadow-clay-in outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <button
            type="button"
            :disabled="!editTagName.trim()"
            @click="saveEditedTag"
            class="btn-primary w-full rounded-2xl py-3 text-white font-bold disabled:opacity-40"
          >
            Сохранить
          </button>
          <button
            type="button"
            @click="archiveEditedTag"
            class="w-full rounded-2xl py-3 text-red-500 font-medium bg-white shadow-clay-1"
          >
            Скрыть действие
          </button>
          <button type="button" @click="closeEditTag" class="w-full rounded-2xl py-2 text-sm text-neutral-500">
            Отмена
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
