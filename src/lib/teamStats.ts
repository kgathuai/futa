import type { MatchAnnouncement } from '../types'
import { hasRecordedScore } from './matchStatus'

export type FormResult = 'W' | 'D' | 'L'

export interface TeamStats {
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  cleanSheets: number
  points: number
  winRate: number
  form: FormResult[]
  topScorer: { name: string; goals: number } | null
  upcoming: number
  playing: number
  homeRecord: { wins: number; draws: number; losses: number }
  awayRecord: { wins: number; draws: number; losses: number }
  lastResult: { opponent: string; score: string; outcome: FormResult; kickoff: string } | null
}

const emptyStats = (): TeamStats => ({
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  cleanSheets: 0,
  points: 0,
  winRate: 0,
  form: [],
  topScorer: null,
  upcoming: 0,
  playing: 0,
  homeRecord: { wins: 0, draws: 0, losses: 0 },
  awayRecord: { wins: 0, draws: 0, losses: 0 },
  lastResult: null,
})

const kickoffMs = (match: MatchAnnouncement) => {
  const value = new Date(match.kickoff).getTime()
  return Number.isFinite(value) ? value : 0
}

/**
 * Aggregates every recorded match involving `teamName` into a single record:
 * results, goals, form, home/away splits and top scorer.
 */
export const computeTeamStats = (matches: MatchAnnouncement[], teamName: string): TeamStats => {
  const team = teamName.trim().toLowerCase()
  if (!team) {
    return emptyStats()
  }

  const stats = emptyStats()
  const scorerTally = new Map<string, number>()
  const played: Array<{ match: MatchAnnouncement; outcome: FormResult; scored: number; conceded: number; atHome: boolean }> = []

  for (const match of matches) {
    const home = match.homeTeam.trim().toLowerCase() === team
    const away = match.awayTeam.trim().toLowerCase() === team
    if (!home && !away) {
      continue
    }

    if (!hasRecordedScore(match.homeScore, match.awayScore)) {
      const start = kickoffMs(match)
      const end = start + (match.durationMinutes ?? 90) * 60_000
      const now = Date.now()
      if (start > now) {
        stats.upcoming += 1
      } else if (now < end) {
        stats.playing += 1
      }
      continue
    }

    const scored = (home ? match.homeScore : match.awayScore) ?? 0
    const conceded = (home ? match.awayScore : match.homeScore) ?? 0
    const outcome: FormResult = scored > conceded ? 'W' : scored === conceded ? 'D' : 'L'

    stats.played += 1
    stats.goalsFor += scored
    stats.goalsAgainst += conceded
    if (conceded === 0) {
      stats.cleanSheets += 1
    }

    if (outcome === 'W') {
      stats.wins += 1
      stats.points += 3
    } else if (outcome === 'D') {
      stats.draws += 1
      stats.points += 1
    } else {
      stats.losses += 1
    }

    const split = home ? stats.homeRecord : stats.awayRecord
    if (outcome === 'W') {
      split.wins += 1
    } else if (outcome === 'D') {
      split.draws += 1
    } else {
      split.losses += 1
    }

    for (const goal of match.goals ?? []) {
      if (goal.team.trim().toLowerCase() !== team) {
        continue
      }
      const scorer = goal.scorer.trim() || 'Unknown'
      scorerTally.set(scorer, (scorerTally.get(scorer) ?? 0) + 1)
    }

    played.push({ match, outcome, scored, conceded, atHome: home })
  }

  played.sort((a, b) => kickoffMs(b.match) - kickoffMs(a.match))
  stats.form = played.slice(0, 5).map((entry) => entry.outcome)
  stats.goalDifference = stats.goalsFor - stats.goalsAgainst
  stats.winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0

  const latest = played[0]
  if (latest) {
    stats.lastResult = {
      opponent: latest.atHome ? latest.match.awayTeam : latest.match.homeTeam,
      score: `${latest.scored} - ${latest.conceded}`,
      outcome: latest.outcome,
      kickoff: latest.match.kickoff,
    }
  }

  let topScorer: TeamStats['topScorer'] = null
  for (const [name, goals] of scorerTally) {
    if (!topScorer || goals > topScorer.goals) {
      topScorer = { name, goals }
    }
  }
  stats.topScorer = topScorer

  return stats
}
