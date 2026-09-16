import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { ensureDefaultCategoriesSeeded } from './lib/db'
import { router } from './router'
import { installSyncTriggers } from './lib/sync'

ensureDefaultCategoriesSeeded().finally(() => {
  createApp(App).use(router).mount('#app')
  // Не блокирует монтирование: без сессии/сети просто ничего не делает.
  installSyncTriggers()
})
