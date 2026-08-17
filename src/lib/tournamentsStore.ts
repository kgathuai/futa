export type TournamentStatus = 'upcoming' | 'registration open' | 'ongoing'

export interface TournamentItem {
  id: string
  sport: string
  format: string
  name: string
  period: string
  venue: string
  status: TournamentStatus
  ownerTeam?: string
}

const TOURNAMENTS_STORAGE_KEY = 'futa_tournaments'

const isTournamentItem = (value: unknown): value is TournamentItem => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.sport === 'string' &&
    typeof item.format === 'string' &&
    typeof item.name === 'string' &&
    typeof item.period === 'string' &&
    typeof item.venue === 'string' &&
    (item.status === 'upcoming' || item.status === 'registration open' || item.status === 'ongoing')
  )
}

export const loadStoredTournaments = (): TournamentItem[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(TOURNAMENTS_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isTournamentItem)
  } catch {
    return []
  }
}

export const saveStoredTournaments = (items: TournamentItem[]) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage write failures.
  }
}
