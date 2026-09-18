<script setup lang="ts">
import { ArrowLeft, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { archiveCategory, db, type Category, type Tag } from '../lib/db'
import { resolveIcon } from '../lib/icons'
import { runSync } from '../lib/sync'
import { useLiveQuery } from '../lib/useLiveQuery'

const router = useRouter()

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

async function deleteCategory(category: Category) {
  if (!confirm(`Удалить раздел «${category.name}»? Все его действия тоже скроются из выбора.`)) return
  await archiveCategory(category.id)
  void runSync()
}
</script>

<template>
  <main class="min-h-dvh p-6 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/more')"
          class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-clay-1 shrink-0"
        >
          <ArrowLeft :size="20" class="text-neutral-600" />
        </button>
        <h1 class="text-lg font-semibold text-neutral-800">Разделы и действия</h1>
      </header>

      <section v-for="category in categories" :key="category.id" class="flex flex-col gap-3">
        <h2 class="text-sm font-medium flex items-center gap-2" :style="{ color: category.color }">
          <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: category.color }" />
          <span class="truncate">{{ category.name }}</span>
          <span class="ml-auto flex items-center gap-1 shrink-0">
            <button
              type="button"
              :aria-label="`Редактировать раздел ${category.name}`"
              @click="router.push(`/categories/${category.id}/edit`)"
              class="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600"
            >
              <Pencil :size="14" />
            </button>
            <button
              type="button"
              :aria-label="`Удалить раздел ${category.name}`"
              @click="deleteCategory(category)"
              class="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500"
            >
              <Trash2 :size="14" />
            </button>
          </span>
        </h2>

        <div class="flex flex-wrap gap-x-4 gap-y-2">
          <span
            v-for="tag in tagsByCategory.get(category.id) ?? []"
            :key="tag.id"
            class="flex items-center gap-1.5 text-sm text-neutral-600"
          >
            <component
              :is="resolveIcon(tag.icon)"
              :size="16"
              :style="{ color: category.color }"
              class="opacity-70"
            />
            {{ tag.name }}
          </span>
        </div>
      </section>

      <button
        type="button"
        @click="router.push('/categories/new')"
        class="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 py-3 text-sm"
      >
        <Plus :size="16" /> Добавить раздел
      </button>
    </div>
  </main>
</template>
