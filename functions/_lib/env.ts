/** Переменные окружения Pages Functions (secrets + vars). */
export interface Env {
  DATABASE_URL: string
  /** Секрет подписи session-куки. */
  SESSION_SECRET: string
  RESEND_API_KEY: string
  /** "Name <email>" — отправитель magic link писем. */
  MAGIC_LINK_FROM: string
  /** Базовый URL фронтенда — на него ссылается magic link. */
  APP_URL: string
}
