<script setup lang="ts">
import { ArrowLeft, Plus, Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import IconPicker from '../components/IconPicker.vue'
import { archiveCategory, db } from '../lib/db'
import { runSync } from '../lib/sync'

const props = defineProps<{ id?: string }>()
const router = useRouter()

const isNew = computed(() => !props.id)
const categoryId = props.id ?? crypto.randomUUID()

const name = ref('')
const color = ref('#a78bfa')
interface DraftTag {
  id: string
  name: string
  icon: string
}
const tags = ref<DraftTag[]>([])
let originalTagIds: string[] = []
let originalSortOrder = 0

async function load(id: string | undefined) {
  if (!id) return
  const category = await db.categories.get(id)
  if (category) {
    name.value = category.name
    color.value = category.color
    originalSortOrder = category.sortOrder
  }
  const existingTags = await db.tags
    .where('categoryId')
    .equals(id)
    .filter((t) => t.archivedAt === null)
    .sortBy('sortOrder')
  tags.value = existingTags.map((t) => ({ id: t.id, name: t.name, icon: t.icon }))
  originalTagIds = existingTags.map((t) => t.id)
}

watch(() => props.id, load, { immediate: true })

function addTag() {
  tags.value.push({ id: crypto.randomUUID(), name: '', icon: 'Circle' })
}

function removeTag(id: string) {
  tags.value = tags.value.filter((t) => t.id !== id)
}

const canSave = computed(() => name.value.trim().length > 0)

async function save() {
  if (!canSave.value) return
  const now = new Date().toISOString()

  await db.transaction('rw', db.categories, db.tags, async () => {
    const sortOrder = isNew.value ? await db.categories.count() : originalSortOrder
    await db.categories.put({
      id: categoryId,
      name: name.value.trim(),
      color: color.value,
      sortOrder,
      archivedAt: null,
      updatedAt: now,
    })

    for (const [index, tag] of tags.value.entries()) {
      await db.tags.put({
        id: tag.id,
        categoryId,
        name: tag.name.trim() || 'Без названия',
        icon: tag.icon,
        sortOrder: index,
        archivedAt: null,
        updatedAt: now,
      })
    }

    const currentIds = new Set(tags.value.map((t) => t.id))
    for (const id of originalTagIds.filter((id) => !currentIds.has(id))) {
      await db.tags.update(id, { archivedAt: now, updatedAt: now })
    }
  })

  void runSync()
  router.push('/')
}

async function deleteCategory() {
  if (!confirm(`Удалить раздел «${name.value}»? Все его теги тоже скроются из выбора.`)) return
  await archiveCategory(categoryId)
  void runSync()
  router.push('/')
}
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] p-6 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/')"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_4px_8px_rgba(0,0,0,0.06)] shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>
        <h1 class="text-lg font-semibold text-neutral-800">
          {{ isNew ? 'Новый раздел' : 'Раздел' }}
        </h1>
      </header>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-neutral-500">Название</label>
        <input
          v-model="name"
          type="text"
          placeholder="Например, Сон"
          class="rounded-2xl bg-white p-3 text-sm text-neutral-700 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm text-neutral-500">Цвет</label>
        <div class="flex items-center gap-3">
          <input v-model="color" type="color" class="w-12 h-12 rounded-2xl border-0 cursor-pointer bg-transparent" />
          <span class="text-sm text-neutral-500">{{ color }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <label class="text-sm text-neutral-500">Действия в разделе</label>

        <div v-for="tag in tags" :key="tag.id" class="flex items-center gap-2">
          <IconPicker v-model="tag.icon" :color="color" />
          <input
            v-model="tag.name"
            type="text"
            placeholder="Название действия"
            class="flex-1 min-w-0 rounded-2xl bg-white p-3 text-sm text-neutral-700 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button
            type="button"
            @click="removeTag(tag.id)"
            class="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500 shrink-0"
          >
            <Trash2 :size="18" />
          </button>
        </div>

        <button
          type="button"
          @click="addTag"
          class="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 py-3 text-sm"
        >
          <Plus :size="16" /> Добавить действие
        </button>
      </div>

      <button
        type="button"
        :disabled="!canSave"
        @click="save"
        class="w-full rounded-2xl py-3 text-white font-medium bg-violet-400 shadow-[0_6px_12px_rgba(0,0,0,0.1)] disabled:opacity-40"
      >
        Сохранить
      </button>

      <button
        v-if="!isNew"
        type="button"
        @click="deleteCategory"
        class="w-full rounded-2xl py-3 text-red-500 font-medium bg-white shadow-[0_4px_8px_rgba(0,0,0,0.06)]"
      >
        Удалить раздел
      </button>
    </div>
  </main>
</template>
