<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getActiveMoodSetId, setActiveMoodSetId } from '../lib/db'
import { MOOD_LEVELS } from '../lib/mood'
import { MOOD_SETS } from '../lib/moodSets'

const router = useRouter()
const activeId = ref<string>('')

getActiveMoodSetId().then((id) => {
  activeId.value = id
})

async function select(id: string) {
  activeId.value = id
  await setActiveMoodSetId(id)
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
        <h1 class="text-lg font-semibold text-neutral-800">Наборы настроений</h1>
      </header>

      <p class="text-sm font-medium text-neutral-500">Системные</p>

      <button
        v-for="set in MOOD_SETS"
        :key="set.id"
        type="button"
        @click="select(set.id)"
        class="w-full rounded-2xl bg-white p-4 flex flex-col gap-3 text-left transition-shadow"
        :class="
          activeId === set.id
            ? 'shadow-[0_0_0_2px_#a78bfa]'
            : 'shadow-[0_4px_8px_rgba(0,0,0,0.06)]'
        "
      >
        <span class="text-sm font-medium text-neutral-700">{{ set.name }}</span>
        <span class="flex gap-2">
          <template v-if="set.images">
            <img
              v-for="(src, i) in set.images"
              :key="i"
              :src="src"
              :alt="`Уровень ${i + 1}`"
              class="w-10 h-10 rounded-xl object-cover"
            />
          </template>
          <template v-else>
            <span
              v-for="level in MOOD_LEVELS"
              :key="level.value"
              class="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-xl"
            >
              {{ level.emoji }}
            </span>
          </template>
        </span>
      </button>
    </div>
  </main>
</template>
