import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { applyAccent, getActiveAccentId } from './lib/accents'
import { ensureDefaultCategoriesSeeded } from './lib/db'
import { installErrorOverlay, showError } from './lib/errorOverlay'
import { router } from './router'
import { installSyncTriggers, runSync } from './lib/sync'

installErrorOverlay()

async function bootstrap() {
  try {
    // До mount() — только локальное, ничего сетевого. Раньше здесь стоял
    // `await checkSession()` и `await runSync()`: синк обязан был успеть
    // до засева дефолтных разделов, иначе на новом устройстве локальные
    // дефолты дублировались с серверными. Но на iOS в авиарежиме запрос
    // не падает, а висит — и холодный запуск офлайн навсегда застревал
    // до mount(), показывая пустой экран вместо дневника. Это и был тот
    // самый «белый экран без интернета».
    //
    // Порядок «сначала сид, потом pull» безопасен сам по себе: на первом
    // синке устройства mergePulled заменяет локальные разделы и теги
    // серверными целиком, а не мёржит по id (см. sync.ts) — дублей,
    // ради которых тут стояло ожидание, он не даст.
    await ensureDefaultCategoriesSeeded()
    // Цвет приложения — до монтирования, иначе первый кадр мигнёт дефолтным.
    applyAccent(await getActiveAccentId())
  } catch (err) {
    // Локальная подготовка не должна мешать показать приложение: лучше
    // дневник с дефолтным цветом и плашкой ошибки, чем белый экран.
    showError('bootstrap', err)
  }

  const app = createApp(App)
  // Ошибки рендера Vue ловит сам, до window.onerror они не доходят — без
  // этого сломанный экран был бы просто белым.
  app.config.errorHandler = (err) => showError('vue', err)
  router.onError((err) => showError('router', err))
  app.use(router).mount('#app')

  installSyncTriggers()
  // Сеть — строго после mount и без ожидания. runSync сам проверит сессию
  // и молча ничего не сделает, если её нет или нет интернета.
  void runSync()
}

void bootstrap()
