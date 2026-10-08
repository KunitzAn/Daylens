import { sql } from 'drizzle-orm'
import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Коды входа (6 цифр, приходят в письме, вводятся в приложении).
 * Хранится хеш, не сам код — как с паролем. Не ссылка: см. README,
 * почему отказались от кликабельного magic link.
 */
export const loginCodes = pgTable(
  'login_codes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    /** Неверных попыток ввода — код 6 цифр, короткий TTL один перебор не спасёт. */
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('login_codes_hash_uidx').on(t.codeHash)],
)

/**
 * Passkey (WebAuthn). Второй способ входа рядом с кодом на почту, не вместо:
 * ключ живёт в связке ключей iCloud, то есть переживает удаление приложения и
 * очистку данных Safari — ровно то, чего не умеет ни одно веб-хранилище.
 *
 * Приватного ключа тут нет и быть не может — он не покидает устройство. Мы
 * храним публичный, им только проверяется подпись; утечка этой таблицы не даёт
 * войти ни за кого.
 */
export const passkeys = pgTable(
  'passkeys',
  {
    /** credential ID от аутентификатора, base64url. */
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    publicKey: text('public_key').notNull(),
    /**
     * Счётчик подписей — защита от клонированного аутентификатора. bigint, а не
     * integer: по спеке это uint32, а он не влезает в знаковый int4. Платформенные
     * passkey (Face ID) всегда шлют 0, но закладываться на это нельзя — ключ могут
     * завести и с внешнего USB-токена.
     */
    counter: bigint('counter', { mode: 'number' }).notNull().default(0),
    /** JSON-массив: по нему браузер подсказывает, где искать ключ (internal, hybrid…). */
    transports: text('transports'),
    /** Для списка в настройках — иначе непонятно, какой ключ удаляешь. */
    label: text('label'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (t) => [index('passkeys_user_idx').on(t.userId)],
)

export const userSettings = pgTable('user_settings', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  activeMoodSetId: text('active_mood_set_id').notNull().default('emoji'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** id — UUID, сгенерированный клиентом (тот же id, что и в Dexie). */
export const categories = pgTable(
  'categories',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('categories_user_idx').on(t.userId, t.id)],
)

export const tags = pgTable(
  'tags',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('tags_user_idx').on(t.userId, t.id)],
)

export const entries = pgTable(
  'entries',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD, локальная дата клиента
    mood: integer('mood').notNull(),
    note: text('note').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('entries_user_date_uidx')
      .on(t.userId, t.date)
      .where(sql`${t.deletedAt} is null`),
  ],
)

export const entryTags = pgTable(
  'entry_tags',
  {
    entryId: text('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.tagId] })],
)

/** Только для rate-limit проверки в API — не читается фронтендом. */
export const loginCodeRequests = pgTable('login_code_requests', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  ip: text('ip').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
