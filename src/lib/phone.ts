/**
 * Kenyan phone helpers.
 *
 * Accepted mobile formats: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX,
 * 7XXXXXXXX (and the 01… equivalents). Anything else is rejected.
 */
const KENYAN_MOBILE = /^(?:\+?254|0)?([17]\d{8})$/

export const normalizeKenyanPhone = (value: string): string | null => {
  const cleaned = value.replace(/[\s()-]/g, '')
  const match = cleaned.match(KENYAN_MOBILE)
  if (!match) {
    return null
  }
  return `254${match[1]}`
}

export const isKenyanPhone = (value: string) => normalizeKenyanPhone(value) !== null

export const isEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

/**
 * A team contact may be either a Kenyan phone number or an email address.
 * Returns the value to store (phone normalised to 254…) or an error message.
 */
export const validateTeamContact = (value: string): { ok: boolean; value: string; error?: string } => {
  const trimmed = value.trim()
  if (!trimmed) {
    return { ok: false, value: '', error: 'Add a contact phone number.' }
  }

  if (isEmailAddress(trimmed)) {
    return { ok: true, value: trimmed }
  }

  const phone = normalizeKenyanPhone(trimmed)
  if (!phone) {
    return {
      ok: false,
      value: trimmed,
      error: 'Enter a Kenyan phone number, e.g. 0712 345 678 or +254712345678.',
    }
  }

  return { ok: true, value: phone }
}

export const KENYAN_PHONE_HINT = 'Kenyan number: 0712 345 678 or +254712345678'
