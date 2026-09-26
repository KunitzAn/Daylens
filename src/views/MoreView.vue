<script setup lang="ts">
import { ChevronRight, Droplet, LogOut, Palette, Settings, Smile } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { logout, me } from '../lib/auth'

const links = [
  { to: '/settings/categories', label: 'Разделы и действия', icon: Settings },
  { to: '/mood-sets', label: 'Наборы настроений', icon: Smile },
  { to: '/mood-palettes', label: 'Цвета настроений', icon: Palette },
  { to: '/accent', label: 'Цвет приложения', icon: Droplet },
]

// Офлайн-копия готова, когда страницей управляет service worker — он
// активируется, только скачав приложение целиком. Пока не готова,
// выключать интернет и перезапускать приложение бесполезно: iOS пойдёт
// в сеть и покажет свою ошибку вместо дневника. Без этого статуса
// понять, дождалась установка или нет, было нечем.
const offlineReady = ref(false)
if ('serviceWorker' in navigator) {
  offlineReady.value = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    offlineReady.value = !!navigator.serviceWorker.controller
  })
}
</script>

<template>
  <main class="min-h-dvh px-4 pt-6 pb-28 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <h1 class="text-xl font-semibold text-neutral-800">Больше</h1>

      <nav class="flex flex-col gap-2">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-clay-1"
        >
          <component :is="link.icon" :size="18" class="text-neutral-400" />
          <span class="flex-1">{{ link.label }}</span>
          <ChevronRight :size="16" class="text-neutral-300" />
        </RouterLink>
      </nav>

      <section class="flex flex-col gap-2">
        <p class="text-sm font-medium text-neutral-500">Аккаунт</p>

        <template v-if="me">
          <p class="rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-clay-1">
            {{ me.email }}
          </p>
          <button
            type="button"
            @click="logout"
            class="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-red-500 shadow-clay-1"
          >
            <LogOut :size="18" />
            Выйти
          </button>
        </template>

        <RouterLink
          v-else
          to="/login"
          class="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-clay-1"
        >
          <span class="flex-1">Войти — синхронизация между устройствами</span>
          <ChevronRight :size="16" class="text-neutral-300" />
        </RouterLink>
      </section>

      <section class="flex flex-col gap-2">
        <p class="text-sm font-medium text-neutral-500">Офлайн</p>
        <div class="rounded-2xl bg-white p-4 shadow-clay-1">
          <p class="text-sm text-neutral-700">
            Работа без интернета:
            <strong :class="offlineReady ? 'text-emerald-600' : 'text-amber-600'">
              {{ offlineReady ? 'готова' : 'ещё загружается' }}
            </strong>
          </p>
          <p v-if="!offlineReady" class="mt-1 text-xs text-neutral-400">
            Подержите приложение открытым с интернетом, пока статус не сменится на «готова».
          </p>
          <p v-else class="mt-1 text-xs text-neutral-400">
            Дневник откроется и без сети — записи хранятся на устройстве.
          </p>
        </div>
      </section>
    </div>
  </main>
</template>
