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
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
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
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,ico,woff2}'],
        // iOS сам решает, какой из 11 сплэшей ему подходит по media query,
        // и один раз кладёт его в свой собственный системный кэш при
        // «Добавить на экран Домой» — нашему SW эти файлы больше никогда
        // не нужны. Precache-ить все 11 (~4 МБ) значило бы тащить в
        // офлайн-шелл десять файлов, которые для конкретного устройства
        // никогда не используются. Остаются обычными статик-файлами в
        // dist/, просто не в install-time кэше.
        globIgnores: ['splash/**'],
      },
    }),
  ],
})
