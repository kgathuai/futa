import { useEffect, useRef } from 'react'

/**
 * Calls `clear` after `delay` ms whenever `value` becomes truthy.
 * Cancels the timer if value changes before it fires.
 */
export function useAutoHide(value: string, clear: () => void, delay = 4000) {
  const clearRef = useRef(clear)

  useEffect(() => {
    clearRef.current = clear
  }, [clear])

  useEffect(() => {
    if (!value) return
    const id = setTimeout(() => clearRef.current(), delay)
    return () => clearTimeout(id)
  }, [value, delay])
}
