import { and, eq, isNull } from 'drizzle-orm'
import { magicLinkTokens, users } from '../../../db/schema'
import { getDb } from '../../_lib/db'
import type { Env } from '../../_lib/env'
import { hashToken } from '../../_lib/magicToken'
import { sessionCookie, signSession } from '../../_lib/session'

function redirect(url: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, { status: 302, headers: { Location: url, ...extraHeaders } })
}

// GET, а не POST: это ссылка из письма, кликается напрямую. Токен
// одноразовый (usedAt) и живёт 15 минут — цена этого выбора известна
// (антивирусы/почтовые сканеры иногда открывают ссылки заранее), но для
// личного дневника риск принят ради простоты одного клика.
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const rawToken = url.searchParams.get('token')
  if (!rawToken) return redirect(`${ctx.env.APP_URL}/login?error=missing_token`)

  const db = getDb(ctx.env)
  const tokenHash = await hashToken(rawToken)

  const [row] = await db
    .select()
    .from(magicLinkTokens)
    .where(and(eq(magicLinkTokens.tokenHash, tokenHash), isNull(magicLinkTokens.usedAt)))
    .limit(1)

  if (!row || row.expiresAt < new Date()) {
    return redirect(`${ctx.env.APP_URL}/login?error=expired_link`)
  }

  await db.update(magicLinkTokens).set({ usedAt: new Date() }).where(eq(magicLinkTokens.id, row.id))

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1)
  if (!user) return redirect(`${ctx.env.APP_URL}/login?error=user_not_found`)

  const sessionToken = await signSession({ uid: user.id, email: user.email }, ctx.env.SESSION_SECRET)

  return redirect(`${ctx.env.APP_URL}/`, { 'Set-Cookie': sessionCookie(sessionToken) })
}
