<script setup lang="ts">
import SyncStatus from '../components/SyncStatus.vue'
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] px-4 pt-6 pb-28 flex justify-center">
    <div class="w-full max-w-md flex flex-col gap-4">
      <header class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-neutral-800">Статистика</h1>
        <SyncStatus />
      </header>
      <p class="text-sm text-neutral-500 bg-white rounded-3xl p-6 text-center">Скоро</p>
    </div>
  </main>
</template>
