<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { me } from '../lib/auth'
import { lastSyncError, pendingCount, syncing } from '../lib/sync'
</script>

<template>
  <RouterLink
    v-if="!me"
    to="/login"
    class="text-xs text-neutral-400 hover:text-neutral-600 underline underline-offset-2 text-right shrink-0"
  >
    Войти для синхронизации
  </RouterLink>
  <div v-else class="text-right shrink-0 min-w-0 max-w-[55%]">
    <p class="text-xs text-neutral-400">
      <template v-if="syncing">Синхронизация…</template>
      <template v-else-if="lastSyncError">Синк не удался, попробую снова</template>
      <template v-else-if="pendingCount > 0">Ждут отправки: {{ pendingCount }}</template>
      <template v-else>Синхронизировано</template>
    </p>
    <!-- Чей это аккаунт — часть статуса, а не отдельная настройка: «Синхронизировано»
         на двух устройствах с разными данными невозможно понять, не зная почты. -->
    <p class="text-[10px] text-neutral-300 truncate">{{ me.email }}</p>
  </div>
</template>
