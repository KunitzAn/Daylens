import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { ensureDefaultCategoriesSeeded } from './lib/db'
import { router } from './router'

ensureDefaultCategoriesSeeded().finally(() => {
  createApp(App).use(router).mount('#app')
})
