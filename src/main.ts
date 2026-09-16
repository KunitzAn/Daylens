import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { checkSession, me } from './lib/auth'
import { ensureDefaultCategoriesSeeded } from './lib/db'
import { router } from './router'
import { installSyncTriggers, runSync } from './lib/sync'

async function bootstrap() {
  // Если есть сессия — сначала подтягиваем то, что уже есть на сервере
  // (другое устройство могло завести аккаунт раньше), и только потом
  // проверяем дефолтный сид: ensureDefaultCategoriesSeeded() сама
  // ничего не делает, если разделы уже есть. Обратный порядок даёт
  // дубли — локальный сид и серверные данные не знают друг о друге.
  // Без сессии сеть не трогаем вообще — офлайн-старт остаётся мгновенным.
  await checkSession().catch(() => {})
  if (me.value) {
    await runSync().catch(() => {})
  }
  await ensureDefaultCategoriesSeeded()

  createApp(App).use(router).mount('#app')
  installSyncTriggers()
}

void bootstrap()
