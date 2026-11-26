/**
 * Match length formatting.
 *
 * Most sports are played for a fixed time ("90 min"). Pool is played to a
 * target instead: a friendly is a race to a set number of racks, not a clock.
 */

/** Sports whose match length is expressed as "race to N" instead of minutes. */
export const RACE_SPORTS = ['Pool Table'] as const

export const DEFAULT_RACE_TO = 5

/** Racks a player/team can race to. Kept small — these are social friendlies. */
// Pool is raced to an odd number of racks so a match can't finish level.
export const RACE_TO_OPTIONS = [1, 3, 5, 7, 9, 11, 13, 15]

export const isRaceSport = (sport?: string | null) =>
  RACE_SPORTS.includes((sport ?? '').trim() as (typeof RACE_SPORTS)[number])

/**
 * Human-readable match length: "Race to 5" for pool, "90 min" otherwise.
 * Returns an empty string when there is nothing sensible to show.
 */
export function formatMatchLength(match: {
  sport?: string | null
  raceTo?: number | null
  durationMinutes?: number | null
}) {
  if (isRaceSport(match.sport)) {
    return `Race to ${match.raceTo && match.raceTo > 0 ? match.raceTo : DEFAULT_RACE_TO}`
  }

  return match.durationMinutes ? `${match.durationMinutes} min` : ''
}
