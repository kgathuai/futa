/**
 * Minimal transactional email sender.
 *
 * Configure with an HTTP email API (Resend-compatible JSON payload):
 *   EMAIL_API_URL=https://api.resend.com/emails
 *   EMAIL_API_KEY=re_...
 *   EMAIL_FROM="Futa <no-reply@kambumbu.com>"
 *   APP_URL=https://kambumbu.com
 *
 * Without credentials the message is logged to the server console so password
 * resets and verification can still be tested end to end in development.
 */
const EMAIL_API_URL = process.env.EMAIL_API_URL?.trim() ?? ''
const EMAIL_API_KEY = process.env.EMAIL_API_KEY?.trim() ?? ''
const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || 'Futa <no-reply@kambumbu.com>'

export const APP_URL = (process.env.APP_URL?.trim() || 'http://localhost:5173').replace(/\/$/, '')

export const isEmailConfigured = () => Boolean(EMAIL_API_URL && EMAIL_API_KEY)

export const sendEmail = async (payload: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<{ delivered: boolean }> => {
  if (!isEmailConfigured()) {
    console.log(
      `[email] not configured — would send to ${payload.to}\n  subject: ${payload.subject}\n  ${payload.text.replace(/\n/g, '\n  ')}`,
    )
    return { delivered: false }
  }

  try {
    const response = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html ?? `<p>${payload.text.replace(/\n/g, '<br />')}</p>`,
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error(`[email] provider responded ${response.status}: ${detail.slice(0, 200)}`)
      return { delivered: false }
    }

    return { delivered: true }
  } catch (error) {
    console.error('[email] send failed:', error instanceof Error ? error.message : error)
    return { delivered: false }
  }
}

export const buildLink = (path: string, token: string) =>
  `${APP_URL}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
