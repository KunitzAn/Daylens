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
  <p v-else class="text-xs text-neutral-400 text-right shrink-0">
    <template v-if="syncing">Синхронизация…</template>
    <template v-else-if="lastSyncError">Синк не удался, попробую снова</template>
    <template v-else-if="pendingCount > 0">Ждут отправки: {{ pendingCount }}</template>
    <template v-else>Синхронизировано</template>
  </p>
</template>
