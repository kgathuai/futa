import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { api } from '../lib/api'
import { LoadingBar } from '../components/LoadingBar'
import type { MatchAnnouncement, TournamentItem } from '../types'

interface SeasonRow {
  tournament: TournamentItem
  champion: string
  runnerUp: string
  playedMatches: number
  goals: number
}

/**
 * Season archive: finished tournaments grouped by season with the champion and
 * a few headline numbers, derived from recorded results.
 */
export function ArchivePage() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([])
  const [matches, setMatches] = useState<MatchAnnouncement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    void Promise.all([api.getTournaments(), api.getMatches()])
      .then(([tournamentRows, matchRows]) => {
        if (active) {
          setTournaments(tournamentRows)
          setMatches(matchRows as MatchAnnouncement[])
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const seasons = useMemo(() => {
    const finished = tournaments.filter((tournament) => tournament.status === 'finished')
    const rows: SeasonRow[] = []

    for (const tournament of finished) {
      const teamSet = new Set(tournament.registeredTeams)
      const results = matches.filter(
        (match) =>
          (match.tournamentId === tournament.id ||
            (teamSet.has(match.homeTeam) && teamSet.has(match.awayTeam))) &&
          Number.isFinite(match.homeScore) &&
          Number.isFinite(match.awayScore),
      )

      const table = new Map<string, { points: number; goals: number }>()
      for (const team of teamSet) {
        table.set(team, { points: 0, goals: 0 })
      }

      let goals = 0
      for (const match of results) {
        const homeScore = Number(match.homeScore)
        const awayScore = Number(match.awayScore)
        goals += homeScore + awayScore

        const home = table.get(match.homeTeam) ?? { points: 0, goals: 0 }
        const away = table.get(match.awayTeam) ?? { points: 0, goals: 0 }
        home.goals += homeScore
        away.goals += awayScore
        if (homeScore > awayScore) {
          home.points += 3
        } else if (awayScore > homeScore) {
          away.points += 3
        } else {
          home.points += 1
          away.points += 1
        }
        table.set(match.homeTeam, home)
        table.set(match.awayTeam, away)
      }

      const ranked = [...table.entries()].sort((a, b) => b[1].points - a[1].points || b[1].goals - a[1].goals)

      rows.push({
        tournament,
        champion: ranked[0]?.[0] ?? '—',
        runnerUp: ranked[1]?.[0] ?? '—',
        playedMatches: results.length,
        goals,
      })
    }

    const grouped = new Map<string, SeasonRow[]>()
    for (const row of rows) {
      const year = (row.tournament.startDate || row.tournament.period || '').match(/\d{4}/)?.[0] ?? 'Undated'
      grouped.set(year, [...(grouped.get(year) ?? []), row])
    }

    return [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [tournaments, matches])

  return (
    <Stack spacing={2.4}>
      <Box>
        <Typography sx={{ fontSize: '0.56rem', letterSpacing: '0.16em', fontWeight: 800, color: '#5f6a84' }}>
          SEASON ARCHIVE
        </Typography>
        <Typography sx={{ fontSize: { xs: '1rem', md: '1.15rem' }, fontWeight: 800, lineHeight: 1.2 }}>
          Past tournaments
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem', mt: 0.3 }}>
          Every completed tournament, grouped by season, with its champion.
        </Typography>
      </Box>

      {isLoading && <LoadingBar label="Loading archive…" />}

      {!isLoading && seasons.length === 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
              No finished tournaments yet — the archive fills up as soon as a tournament ends.
            </Typography>
          </CardContent>
        </Card>
      )}

      {seasons.map(([year, rows]) => (
        <Stack key={year} spacing={1.2}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.86rem', color: 'text.secondary' }}>{year}</Typography>
          <Box sx={{ display: 'grid', gap: 1.2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
            {rows.map((row) => (
              <Card key={row.tournament.id} variant="outlined">
                <CardContent sx={{ p: 1.6 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.88rem' }} noWrap>
                      {row.tournament.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={row.tournament.sport.toUpperCase()}
                      sx={{ height: 18, fontSize: '0.54rem', fontWeight: 800 }}
                    />
                  </Stack>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 0.3 }} noWrap>
                    {row.tournament.period} · {row.tournament.venue} · {row.tournament.registeredTeams.length} teams
                  </Typography>

                  <Stack direction="row" spacing={2} sx={{ mt: 1.2 }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.5rem', letterSpacing: '0.1em', color: 'text.secondary' }}>CHAMPION</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', color: 'primary.main' }} noWrap>
                        {row.champion}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.5rem', letterSpacing: '0.1em', color: 'text.secondary' }}>RUNNER-UP</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }} noWrap>
                        {row.runnerUp}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.5rem', letterSpacing: '0.1em', color: 'text.secondary' }}>MATCHES</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{row.playedMatches}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.5rem', letterSpacing: '0.1em', color: 'text.secondary' }}>GOALS</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{row.goals}</Typography>
                    </Box>
                  </Stack>

                  <Typography
                    component={RouterLink}
                    to={`/tournaments?tournament=${row.tournament.id}`}
                    sx={{
                      display: 'inline-block',
                      mt: 1.2,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Open tournament →
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}
