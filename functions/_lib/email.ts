import type { Env } from './env'

export async function sendMagicLinkEmail(env: Env, to: string, link: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAGIC_LINK_FROM,
      to: [to],
      subject: 'Вход в Daylens',
      html: `
        <p>Ссылка для входа в Daylens (действует 15 минут):</p>
        <p><a href="${link}">${link}</a></p>
        <p>Если вы не запрашивали вход — просто проигнорируйте это письмо.</p>
      `,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend: ${res.status} ${body}`)
  }
}
