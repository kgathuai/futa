import type { TournamentItem, TournamentStatus } from '../types'

const parseDate = (value: string, endOfDay = false) => {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}` : value)
  return Number.isFinite(date.getTime()) ? date.getTime() : null
}

const parsePeriod = (period: string) => {
  const parts = period.split(' - ')
  if (parts.length !== 2) {
    return null
  }

  const end = parseDate(parts[1], true)
  if (end === null) {
    return null
  }

  const start = parseDate(parts[0])
  return start === null ? null : { start, end }
}

export const getTournamentStatus = (tournament: Pick<TournamentItem, 'status' | 'period' | 'startDate' | 'endDate'>, now = Date.now()): TournamentStatus => {
  const start = tournament.startDate ? parseDate(tournament.startDate) : null
  const end = tournament.endDate ? parseDate(tournament.endDate, true) : null
  const dates = start !== null && end !== null ? { start, end } : parsePeriod(tournament.period)

  if (!dates) {
    return tournament.status
  }

  if (now < dates.start) {
    return tournament.status === 'registration open' || tournament.status === 'ongoing'
      ? tournament.status
      : 'upcoming'
  }

  if (now <= dates.end) {
    return 'ongoing'
  }

  return 'finished'
}
