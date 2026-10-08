/**
 * Ошибки прямо на экране. В PWA с экрана «Домой» консоли не видно, а белый
 * экран ничего не говорит — при любой ошибке JS показываем поверх
 * приложения плашку с текстом, стеком и адресом, её можно заскриншотить.
 * Чистый DOM, без Vue: должна показаться, даже если сломался сам Vue.
 */
let box: HTMLDivElement | null = null
let lastText = ''
let lastRepeat = 1

/**
 * Цепочка компонентов до сломавшегося. Имена переживают минификацию: SFC-
 * компилятор проставляет `__name`, и в прод-бандле он сохраняется. Без этого
 * от ошибки оставался только минифицированный стек вида `D@...js:1:47180`,
 * по которому непонятно даже, какой экран сломался.
 */
export function componentTrace(instance: unknown): string {
  const chain: string[] = []
  // В errorHandler прилетает публичный прокси; внутренний инстанс — в `$`.
  let current = (instance as { $?: unknown })?.$ ?? instance
  for (let depth = 0; current && depth < 12; depth++) {
    const type = (current as { type?: { __name?: string; name?: string } }).type
    chain.push(type?.__name ?? type?.name ?? '?')
    current = (current as { parent?: unknown }).parent
  }
  return chain.length ? chain.join(' ← ') : 'компонент не определён'
}

export function showError(source: string, err: unknown, context?: string): void {
  const e = err instanceof Error ? err : new Error(String(err))
  const text = [
    `${source}: ${e.message}`,
    context ? `где: ${context}` : '',
    `адрес: ${location.href}`,
    `онлайн: ${navigator.onLine ? 'да' : 'нет'}`,
    e.stack ?? '',
  ]
    .filter(Boolean)
    .join('\n')

  // Одна поломка рендера обычно повторяется каждый кадр. Без схлопывания
  // плашка за секунду превращается в простыню, и до первой — самой
  // информативной — ошибки в ней уже не долистать.
  if (text === lastText && box) {
    lastRepeat++
    box.textContent = box.textContent!.replace(/( ×\d+)?\n\(тап — закрыть\)$/, ` ×${lastRepeat}\n(тап — закрыть)`)
    return
  }
  lastText = text
  lastRepeat = 1

  if (!box) {
    box = document.createElement('div')
    box.style.cssText =
      'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;max-height:60vh;overflow:auto;' +
      'background:#7f1d1d;color:#fff;font:12px/1.4 ui-monospace,monospace;padding:12px;border-radius:12px;white-space:pre-wrap'
    box.addEventListener('click', () => {
      box?.remove()
      box = null
      lastText = ''
    })
    document.body.appendChild(box)
  }
  box.textContent = (box.textContent ? box.textContent + '\n\n' : '') + text + '\n(тап — закрыть)'
}

export function installErrorOverlay(): void {
  window.addEventListener('error', (ev) => showError('error', ev.error ?? ev.message))
  window.addEventListener('unhandledrejection', (ev) => showError('promise', ev.reason))
}
