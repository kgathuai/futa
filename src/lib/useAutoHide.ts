import { useEffect, useRef } from 'react'

/**
 * Optionally calls `clear` after `delay` ms whenever `value` becomes truthy.
 *
 * Auto-hide is opt-in: with the default `delay` of 0 a message stays on screen
 * until the user dismisses it or a newer message replaces it.
 */
export function useAutoHide(value: string, clear: () => void, delay = 0) {
  const clearRef = useRef(clear)

  useEffect(() => {
    clearRef.current = clear
  }, [clear])

  useEffect(() => {
    if (!value || delay <= 0) return
    const id = setTimeout(() => clearRef.current(), delay)
    return () => clearTimeout(id)
  }, [value, delay])
}
