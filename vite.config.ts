import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // `npm run dev:api` поднимает Functions отдельно (wrangler pages dev,
    // порт 8788) — без этого прокси фронтенд на 5183 не видит /api/*.
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // apple-touch-icon нужен на старте — из него сделана заглушка в
      // index.html, без него холодный запуск офлайн показал бы пустоту.
      // favicon.svg сюда не входит осознанно: он весит 592 КБ (обведённый
      // растр из imagetracer), а нужен только для вкладки браузера —
      // в офлайн-копии ему делать нечего. favicon.ico (12 КБ) остаётся
      // запасным вариантом и precache-ится обычным правилом.
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      // Иконки манифеста (672 КБ) системе нужны только при «На экран
      // Домой» — а это всегда онлайн. Precache отдаёт страницы из кэша
      // только скачав ВСЁ целиком: на телефоне установка не успевала до
      // того, как приложение закрывали, и холодный запуск офлайн уходил
      // в сеть — там его ловила ошибка Safari вместо дневника.
      includeManifestIcons: false,
      manifest: {
        name: 'Daylens',
        short_name: 'Daylens',
        description: 'Личный трекер настроения',
        start_url: '/',
        display: 'standalone',
        background_color: '#faf9f7',
        theme_color: '#faf9f7',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // /api/* — живые данные, отдавать на них index.html из кэша нельзя
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,ico,woff2}'],
        // Всё, что не нужно самому приложению при офлайн-запуске. Размер
        // офлайн-копии здесь не косметика: SW начинает обслуживать
        // страницы, только скачав её целиком, так что каждый лишний
        // мегабайт — это ещё один шанс, что установка не успеет
        // завершиться до того, как приложение закроют (см. README).
        //
        // splash/** — iOS сам выбирает нужный ему сплэш по media query и
        //   кладёт в свой системный кэш при «На экран Домой», нашему SW
        //   эти 11 файлов (4 МБ) не нужны вообще.
        // icons/** — иконки манифеста, тоже только для «На экран Домой».
        // favicon.svg — 592 КБ ради значка вкладки браузера.
        // Все они остаются обычными файлами в dist/, просто не в
        // install-time кэше.
        globIgnores: ['splash/**', 'icons/**', 'favicon.svg'],
      },
    }),
  ],
})
