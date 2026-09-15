import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { ensureDefaultSpheresSeeded } from './lib/db'

ensureDefaultSpheresSeeded().finally(() => {
  createApp(App).mount('#app')
})
