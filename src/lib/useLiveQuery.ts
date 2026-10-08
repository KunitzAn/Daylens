import { liveQuery } from 'dexie'
import { onScopeDispose, ref, type Ref } from 'vue'

export function useLiveQuery<T>(querier: () => T | Promise<T>, initial: T): Ref<T> {
  const value = ref(initial) as Ref<T>
  // unsubscribe() не отменяет уведомление, которое Dexie уже поставил в свою
  // очередь: запрос асинхронный, и результат может приехать уже после того,
  // как компонент размонтирован. Тогда мы бы писали в ref мёртвого
  // компонента — а это планирование обновления на инстансе, которого больше
  // нет. Флаг дешевле, чем разбираться потом, чей это рендер упал.
  let disposed = false
  const subscription = liveQuery(querier).subscribe({
    next: (result) => {
      if (!disposed) value.value = result
    },
    error: (err) => {
      if (!disposed) console.error(err)
    },
  })
  onScopeDispose(() => {
    disposed = true
    subscription.unsubscribe()
  })
  return value
}
