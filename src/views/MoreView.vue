<script setup lang="ts">
import { ChevronRight, Droplet, Fingerprint, LogOut, Palette, Settings, Smile, Trash2 } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { logout, me } from '../lib/auth'
import {
  listPasskeys,
  passkeyAvailable,
  PasskeyCancelled,
  registerPasskey,
  removePasskey,
  type PasskeyInfo,
} from '../lib/passkey'
import { formatDateHuman } from '../lib/date'

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

// --- Вход по Face ID ---
const canUsePasskey = ref(false)
const keys = ref<PasskeyInfo[]>([])
const keysLoaded = ref(false)
const passkeyBusy = ref(false)
const passkeyError = ref<string | null>(null)

async function refreshKeys() {
  if (!me.value) {
    keys.value = []
    keysLoaded.value = true
    return
  }
  try {
    keys.value = await listPasskeys()
  } catch {
    // Нет сети — просто не показываем список, экран от этого не ломается.
    keys.value = []
  } finally {
    keysLoaded.value = true
  }
}

onMounted(async () => {
  canUsePasskey.value = await passkeyAvailable()
  await refreshKeys()
})
// Вошли/вышли уже на этом экране — список ключей больше не про того человека.
watch(me, refreshKeys)

async function addKey() {
  passkeyBusy.value = true
  passkeyError.value = null
  try {
    await registerPasskey()
    await refreshKeys()
  } catch (err) {
    if (!(err instanceof PasskeyCancelled)) {
      passkeyError.value = 'Не получилось завести ключ. Попробуйте ещё раз.'
    }
  } finally {
    passkeyBusy.value = false
  }
}

async function dropKey(key: PasskeyInfo) {
  if (!confirm('Удалить этот ключ? Входить по Face ID на этом устройстве больше не выйдет.')) return
  passkeyBusy.value = true
  passkeyError.value = null
  try {
    await removePasskey(key.id)
    await refreshKeys()
  } catch {
    passkeyError.value = 'Не получилось удалить ключ.'
  } finally {
    passkeyBusy.value = false
  }
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
          class="flex items-center gap-3 rounded-2xl bg-surface p-4 text-sm text-neutral-700 shadow-clay-1"
        >
          <component :is="link.icon" :size="18" class="text-neutral-400" />
          <span class="flex-1">{{ link.label }}</span>
          <ChevronRight :size="16" class="text-neutral-300" />
        </RouterLink>
      </nav>

      <section class="flex flex-col gap-2">
        <p class="text-sm font-medium text-neutral-500">Аккаунт</p>

        <template v-if="me">
          <p class="selectable rounded-2xl bg-surface p-4 text-sm text-neutral-700 shadow-clay-1">
            {{ me.email }}
          </p>
          <button
            type="button"
            @click="logout"
            class="flex items-center gap-3 rounded-2xl bg-surface p-4 text-sm text-red-500 shadow-clay-1"
          >
            <LogOut :size="18" />
            Выйти
          </button>
        </template>

        <RouterLink
          v-else
          to="/login"
          class="flex items-center gap-3 rounded-2xl bg-surface p-4 text-sm text-neutral-700 shadow-clay-1"
        >
          <span class="flex-1">Войти — синхронизация между устройствами</span>
          <ChevronRight :size="16" class="text-neutral-300" />
        </RouterLink>
      </section>

      <!-- Только для вошедших: ключ привязывается к аккаунту, без него привязывать
           не к чему. И только там, где есть встроенный аутентификатор. -->
      <section v-if="me && canUsePasskey && keysLoaded" class="flex flex-col gap-2">
        <p class="text-sm font-medium text-neutral-500">Вход по Face ID</p>

        <template v-if="keys.length === 0">
          <div class="rounded-2xl bg-surface p-4 shadow-clay-1 flex flex-col gap-3">
            <p class="text-xs text-neutral-400">
              Чтобы не вводить почту и код заново после переустановки приложения. Ключ хранится
              в связке ключей iCloud, а не в приложении — он переживёт и очистку Safari, и
              новый телефон.
            </p>
            <button
              type="button"
              :disabled="passkeyBusy"
              @click="addKey"
              class="w-full rounded-2xl py-3 flex items-center justify-center gap-2 text-white font-medium bg-accent-ink shadow-clay-2 disabled:opacity-40"
            >
              <Fingerprint :size="18" />
              {{ passkeyBusy ? 'Минутку…' : 'Включить вход по Face ID' }}
            </button>
          </div>
        </template>

        <template v-else>
          <div
            v-for="key in keys"
            :key="key.id"
            class="rounded-2xl bg-surface p-4 flex items-center gap-3 shadow-clay-1"
          >
            <Fingerprint :size="18" class="text-accent-ink shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-neutral-700 truncate">{{ key.label ?? 'Ключ' }}</p>
              <p class="text-xs text-neutral-400">
                добавлен {{ formatDateHuman(key.createdAt.slice(0, 10)) }}
              </p>
            </div>
            <button
              type="button"
              :aria-label="`Удалить ключ ${key.label ?? ''}`"
              :disabled="passkeyBusy"
              @click="dropKey(key)"
              class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500 shrink-0 disabled:opacity-40"
            >
              <Trash2 :size="16" />
            </button>
          </div>
          <button
            type="button"
            :disabled="passkeyBusy"
            @click="addKey"
            class="text-xs text-accent-ink self-start disabled:opacity-40"
          >
            Добавить ещё одно устройство
          </button>
        </template>

        <p v-if="passkeyError" class="text-xs text-red-500">{{ passkeyError }}</p>
      </section>

      <section class="flex flex-col gap-2">
        <p class="text-sm font-medium text-neutral-500">Офлайн</p>
        <div class="rounded-2xl bg-surface p-4 shadow-clay-1">
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
