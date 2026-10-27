export interface SharePayload {
  title: string
  text: string
  url: string
}

export const copyToClipboard = async (value: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fall through to the legacy path below.
  }

  try {
    const field = document.createElement('textarea')
    field.value = value
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(field)
    return ok
  } catch {
    return false
  }
}

/** Native share sheet when available, clipboard otherwise. */
export const shareOrCopy = async (payload: SharePayload): Promise<'shared' | 'copied' | 'failed'> => {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'shared'
      }
    }
  }

  return (await copyToClipboard(`${payload.text} ${payload.url}`)) ? 'copied' : 'failed'
}

export const whatsappUrl = (payload: SharePayload) =>
  `https://wa.me/?text=${encodeURIComponent(`${payload.text} ${payload.url}`)}`

export const twitterUrl = (payload: SharePayload) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload.text)}&url=${encodeURIComponent(payload.url)}`
