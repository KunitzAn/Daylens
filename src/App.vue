<script setup lang="ts">
import DayEntryForm from './components/DayEntryForm.vue'
import { todayLocalDate } from './lib/date'
</script>

<template>
  <main class="min-h-dvh bg-[#faf9f7] flex items-center justify-center p-6">
    <DayEntryForm :date="todayLocalDate()" />
  </main>
</template>
