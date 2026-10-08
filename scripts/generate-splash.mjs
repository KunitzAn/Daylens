// Генерирует сплэш-скрины для apple-touch-startup-image (холодный запуск PWA
// на iOS — без них экран стоит белым до монтирования Vue).
//
// Это ЗАЛИВКА ФОНОМ БЕЗ ИКОНКИ, и это осознанно. Сначала иконка на сплэше
// была, но фотография (кадр из «Телепузиков») — это 99,98% веса файла:
// 152 КБ против 2,9 КБ у чистой заливки, то есть 3,3 МБ против 64 КБ на все
// 22 файла. А сплэши обязаны лежать в офлайн-кэше: iOS берёт картинку при
// запуске, и если её нет локально, запуск без сети показывает белый экран —
// ровно на это и пожаловались. Положить же в кэш 3,3 МБ нельзя: service
// worker начинает отдавать страницы, только скачав precache целиком, и
// именно переразмер этого кэша был прошлым багом с белым экраном.
//
// Иконку в итоге показывает #app-loading из index.html — она в precache
// и рисуется через ~36 мс после старта. Пользователь видит фон → иконку →
// приложение, без белого кадра на любом этапе.
// Запуск: node scripts/generate-splash.mjs — печатает готовые <link>-теги.
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public', 'splash')

// Два набора: iOS выбирает сплэш по prefers-color-scheme, без тёмного
// холодный запуск с тёмной системной темой вспыхивал бы светлым экраном.
//
// Цвета — фон приложения на дефолтном (фиолетовом) акценте. Привязать сплэш
// к выбранному цвету нельзя в принципе: картинка собирается на сборке, а
// акцент выбирается в рантайме. Но все пастели сделаны одной светлоты, так
// что на другом акценте переход сплэш → приложение это сдвиг оттенка, а не
// вспышка.
const THEMES = [
  { suffix: '', bg: '#f1ebff', media: '' },
  { suffix: '-dark', bg: '#100b1f', media: ' and (prefers-color-scheme: dark)' },
]

// device-width x device-height (CSS px, portrait) + DPR — актуальный модельный
// ряд iPhone плюс более старые размеры, которые ещё встречаются.
const devices = [
  { name: 'iphone-440x956-3x', width: 440, height: 956, dpr: 3 }, // 16 Pro Max
  { name: 'iphone-430x932-3x', width: 430, height: 932, dpr: 3 }, // 15/16 Plus, Pro Max
  { name: 'iphone-402x874-3x', width: 402, height: 874, dpr: 3 }, // 16 Pro
  { name: 'iphone-393x852-3x', width: 393, height: 852, dpr: 3 }, // 15/16, 15 Pro
  { name: 'iphone-428x926-3x', width: 428, height: 926, dpr: 3 }, // 12/13/14 Pro Max, 14 Plus
  { name: 'iphone-390x844-3x', width: 390, height: 844, dpr: 3 }, // 12/13/14, 12/13 Pro
  { name: 'iphone-375x812-3x', width: 375, height: 812, dpr: 3 }, // X/XS/11 Pro/12/13 mini
  { name: 'iphone-414x896-3x', width: 414, height: 896, dpr: 3 }, // XS Max/11 Pro Max
  { name: 'iphone-414x896-2x', width: 414, height: 896, dpr: 2 }, // XR/11
  { name: 'iphone-414x736-3x', width: 414, height: 736, dpr: 3 }, // 6s/7/8 Plus
  { name: 'iphone-375x667-2x', width: 375, height: 667, dpr: 2 }, // SE2/SE3/6s/7/8
]

const linkTags = []

for (const d of devices) {
  const w = d.width * d.dpr
  const h = d.height * d.dpr

  for (const theme of THEMES) {
    const file = `${d.name}${theme.suffix}.png`

    await sharp({
      create: { width: w, height: h, channels: 4, background: theme.bg },
    })
      // Палитра: в заливке одним тоном цветов ровно один, 16 миллионов ей
      // ни к чему.
      .png({ palette: true, compressionLevel: 9 })
      .toFile(path.join(outDir, file))

    console.log('generated', file, `${w}x${h}`)

    // Тёмный вариант обязан идти ПЕРВЫМ среди двух для одного устройства:
    // media у светлого не содержит prefers-color-scheme, то есть подходит
    // под обе темы, и Safari берёт первый подходящий тег.
    linkTags[theme.suffix ? 'unshift' : 'push'](
      `<link rel="apple-touch-startup-image" href="/splash/${file}" media="screen and (device-width: ${d.width}px) and (device-height: ${d.height}px) and (-webkit-device-pixel-ratio: ${d.dpr})${theme.media} and (orientation: portrait)">`,
    )
  }
}

console.log('\n--- вставить в index.html ---\n')
console.log(linkTags.join('\n'))
