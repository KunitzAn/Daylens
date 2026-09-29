// Генерирует сплэш-скрины для apple-touch-startup-image (холодный запуск
// PWA на iOS — без них экран несколько секунд стоит белым до монтирования
// Vue). Марка — тот же apple-touch-icon.png, что уже зарегистрирован в
// манифесте: не отдельный логотип, а ровно та иконка, что пользователь
// видит на домашнем экране, только увеличенная и на фирменном фоне.
// Запуск: node scripts/generate-splash.mjs — печатает готовые <link>-теги.
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const markPng = path.join(__dirname, '..', 'public', 'apple-touch-icon.png')
const outDir = path.join(__dirname, '..', 'public', 'splash')

// Два набора: iOS умеет выбирать сплэш по prefers-color-scheme, и без
// тёмного холодный запуск с системной тёмной темой вспыхивал бы белым
// экраном на всю секунду до монтирования Vue. Цвета фиксированные,
// нейтральные по тону: сплэш собирается на сборке, а цвет приложения
// пользователь выбирает в рантайме — привязать одно к другому нельзя.
const THEMES = [
  { suffix: '', bg: '#faf9f7', media: '' },
  { suffix: '-dark', bg: '#16151c', media: ' and (prefers-color-scheme: dark)' },
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

const markPx = 168 // размер марки на сплэше в CSS px
const radiusRatio = 0.22 // скругление угла marks — как у иконки на домашнем экране

async function roundedMark(sizePx) {
  const mask = Buffer.from(
    `<svg width="${sizePx}" height="${sizePx}"><rect width="${sizePx}" height="${sizePx}" rx="${Math.round(sizePx * radiusRatio)}" fill="#fff"/></svg>`,
  )
  return sharp(markPng)
    .resize(sizePx, sizePx)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

const linkTags = []

for (const d of devices) {
  const w = d.width * d.dpr
  const h = d.height * d.dpr
  const markSize = Math.round(markPx * d.dpr)
  const mark = await roundedMark(markSize)

  for (const theme of THEMES) {
    const file = `${d.name}${theme.suffix}.png`

    await sharp({
      create: { width: w, height: h, channels: 4, background: theme.bg },
    })
      .composite([{ input: mark, gravity: 'center' }])
      // Палитра в 256 цветов: сплэш — это заливка одним тоном плюс марка,
      // цветов там и близко не 16 миллионов. Даёт втрое меньший файл
      // (447 → 155 КБ на 3x), на глаз от полноцветного неотличимо —
      // сравнивал кропом по самой марке, а не по однотонному фону.
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
