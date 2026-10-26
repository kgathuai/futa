export type MatchRuntimeStatus = 'scheduled' | 'playing' | 'finished'

/**
 * Runtime status is derived from the clock, with a recorded score always winning.
 *
 * - `scheduled` before kickoff
 * - `playing` from kickoff until kickoff + duration
 * - `finished` (shown as "Played") once the duration has elapsed, or as soon as
 *   both scores are recorded — a late score entry still lands on `finished`.
 */
export const getMatchRuntimeStatus = (
  kickoff: string,
  durationMinutes?: number,
  homeScore?: number,
  awayScore?: number,
): MatchRuntimeStatus => {
  if (homeScore !== undefined && awayScore !== undefined) {
    return 'finished'
  }

  const kickoffTime = new Date(kickoff)
  if (!Number.isFinite(kickoffTime.getTime())) {
    return 'scheduled'
  }

  const now = Date.now()
  const kickoffMs = kickoffTime.getTime()
  const duration = (durationMinutes ?? 90) * 60 * 1000

  if (now < kickoffMs) {
    return 'scheduled'
  }

  if (now < kickoffMs + duration) {
    return 'playing'
  }

  return 'finished'
}

export const MATCH_STATUS_LABELS: Record<MatchRuntimeStatus, string> = {
  scheduled: 'Scheduled',
  playing: 'Playing',
  finished: 'Played',
}

export const getMatchStatusLabel = (status: MatchRuntimeStatus) => MATCH_STATUS_LABELS[status]

export const hasRecordedScore = (homeScore?: number, awayScore?: number) =>
  homeScore !== undefined && awayScore !== undefined
