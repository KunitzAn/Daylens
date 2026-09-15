import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { ensureDefaultCategoriesSeeded } from './lib/db'

ensureDefaultCategoriesSeeded().finally(() => {
  createApp(App).mount('#app')
})
