/**
 * Общее для обеих passkey-церемоний.
 *
 * rpID и origin берём из самого запроса, а не из env.APP_URL: так одинаково
 * работает и прод, и локальный wrangler. Важное следствие, которое надо знать:
 * passkey привязан к домену, на котором его завели. Зарегистрировал на
 * daylens.kunitcan.online — на *.pages.dev он не подойдёт, и наоборот. От
 * кросс-сайтовых POST защищает sameOrigin(), как и везде в проекте.
 */
export function relyingParty(request: Request): { rpID: string; origin: string } {
  const url = new URL(request.url)
  return { rpID: url.hostname, origin: url.origin }
}

export const RP_NAME = 'Daylens'

/**
 * Подпись ключа для списка в настройках. Берём грубо, по User-Agent: точнее
 * всё равно неоткуда, а без подписи в списке «Удалить ключ» непонятно, какой
 * именно удаляешь.
 */
export function deviceLabel(request: Request): string {
  const ua = request.headers.get('User-Agent') ?? ''
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows'
  return 'Устройство'
}

export function encodePublicKey(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Uint8Array<ArrayBuffer>, а не просто Uint8Array: SimpleWebAuthn требует
// буфер, который точно не SharedArrayBuffer, и дефолтный ArrayBufferLike его
// не устраивает.
export function decodePublicKey(value: string): Uint8Array<ArrayBuffer> {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4))
  const bin = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
