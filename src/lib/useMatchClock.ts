import { useEffect, useState } from 'react'

/**
 * Forces a re-render on a fixed cadence so clock-derived match statuses
 * (`scheduled` → `playing` → `played`) flip without a manual refresh.
 */
export const useMatchClock = (intervalMs = 30_000) => {
  const [, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
}
