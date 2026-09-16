function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Токен, который уходит пользователю по почте — в БД он не хранится. */
export function generateToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)))
}

/** То, что реально хранится в magic_link_tokens.token_hash. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return b64url(new Uint8Array(digest))
}

export const MAGIC_LINK_TTL_SECONDS = 15 * 60 // 15 минут
