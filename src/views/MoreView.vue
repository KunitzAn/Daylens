<script setup lang="ts">
import { ChevronRight, LogOut, Palette, Settings, Smile } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { logout, me } from '../lib/auth'

const links = [
  { to: '/settings/categories', label: 'Разделы и действия', icon: Settings },
  { to: '/mood-sets', label: 'Наборы настроений', icon: Smile },
  { to: '/mood-palettes', label: 'Цвета настроений', icon: Palette },
]
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] px-4 pt-6 pb-28 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <h1 class="text-xl font-semibold text-neutral-800">Больше</h1>

      <nav class="flex flex-col gap-2">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-[0_4px_8px_rgba(0,0,0,0.06)]"
        >
          <component :is="link.icon" :size="18" class="text-neutral-400" />
          <span class="flex-1">{{ link.label }}</span>
          <ChevronRight :size="16" class="text-neutral-300" />
        </RouterLink>
      </nav>

      <section class="flex flex-col gap-2">
        <p class="text-sm font-medium text-neutral-500">Аккаунт</p>

        <template v-if="me">
          <p class="rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-[0_4px_8px_rgba(0,0,0,0.06)]">
            {{ me.email }}
          </p>
          <button
            type="button"
            @click="logout"
            class="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-red-500 shadow-[0_4px_8px_rgba(0,0,0,0.06)]"
          >
            <LogOut :size="18" />
            Выйти
          </button>
        </template>

        <RouterLink
          v-else
          to="/login"
          class="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-[0_4px_8px_rgba(0,0,0,0.06)]"
        >
          <span class="flex-1">Войти — синхронизация между устройствами</span>
          <ChevronRight :size="16" class="text-neutral-300" />
        </RouterLink>
      </section>
    </div>
  </main>
</template>
