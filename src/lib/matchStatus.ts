export type MatchRuntimeStatus = 'scheduled' | 'playing' | 'finished'

/**
 * A match becomes `finished` only once both scores are recorded.
 * After kickoff + duration it stays `playing` until someone reports the score.
 */
export const getMatchRuntimeStatus = (
  kickoff: string,
  durationMinutes?: number,
  homeScore?: number,
  awayScore?: number,
): MatchRuntimeStatus => {
  const kickoffTime = new Date(kickoff)
  if (!Number.isFinite(kickoffTime.getTime())) {
    return 'scheduled'
  }

  const now = Date.now()
  const kickoffMs = kickoffTime.getTime()
  const duration = (durationMinutes ?? 90) * 60 * 1000
  const matchEndMs = kickoffMs + duration

  if (now < kickoffMs) {
    return 'scheduled'
  }

  if (now < matchEndMs) {
    return 'playing'
  }

  return homeScore !== undefined && awayScore !== undefined ? 'finished' : 'playing'
}
