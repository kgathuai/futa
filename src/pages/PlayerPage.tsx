import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Avatar, Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { useAppData } from '../context/AppContext'
import { api } from '../lib/api'
import { LoadingBar } from '../components/LoadingBar'
import type { Player } from '../types'

const StatTile = ({ label, value, accent }: { label: string; value: number | string; accent?: string }) => (
  <Box
    sx={{
      border: '1px solid rgba(159,176,201,0.16)',
      borderRadius: 1.4,
      bgcolor: 'rgba(21,31,51,0.7)',
      px: 1.2,
      py: 1,
      textAlign: 'center',
    }}
  >
    <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: accent ?? '#edf2f7', lineHeight: 1.1 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: '0.56rem', letterSpacing: '0.08em', color: '#8b97ad', textTransform: 'uppercase', mt: 0.3 }}>
      {label}
    </Typography>
  </Box>
)

/** Public player profile: squad details plus goals/assists from recorded matches. */
export function PlayerPage() {
  const [searchParams] = useSearchParams()
  const team = (searchParams.get('team') ?? '').trim()
  const name = (searchParams.get('name') ?? '').trim()

  const { matches } = useAppData()
  const [player, setPlayer] = useState<Player | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(team))

  useEffect(() => {
    if (!team) {
      return
    }

    let active = true
    void api
      .getSquad(team)
      .then((response) => {
        if (!active) {
          return
        }
        const found = response.squad.find(
          (entry) => entry.name.trim().toLowerCase() === name.trim().toLowerCase(),
        )
        setPlayer(found ?? null)
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
  }, [team, name])

  const stats = useMemo(() => {
    const normalisedTeam = team.toLowerCase()
    const normalisedName = name.toLowerCase()
    let goals = 0
    let assists = 0
    let matchesInvolved = 0

    const recent: Array<{ id: string; opponent: string; score: string; kickoff: string; goals: number; assists: number }> = []

    for (const match of matches) {
      const isHome = match.homeTeam.trim().toLowerCase() === normalisedTeam
      const isAway = match.awayTeam.trim().toLowerCase() === normalisedTeam
      if (!isHome && !isAway) {
        continue
      }

      let matchGoals = 0
      let matchAssists = 0
      for (const goal of match.goals ?? []) {
        if (goal.team.trim().toLowerCase() !== normalisedTeam) {
          continue
        }
        if (goal.scorer?.trim().toLowerCase() === normalisedName) {
          goals += 1
          matchGoals += 1
        }
        if (goal.assist?.trim().toLowerCase() === normalisedName) {
          assists += 1
          matchAssists += 1
        }
      }

      if (matchGoals > 0 || matchAssists > 0) {
        matchesInvolved += 1
        recent.push({
          id: match.id,
          opponent: isHome ? match.awayTeam : match.homeTeam,
          score:
            match.homeScore !== undefined && match.awayScore !== undefined
              ? `${match.homeScore} - ${match.awayScore}`
              : 'vs',
          kickoff: match.kickoff,
          goals: matchGoals,
          assists: matchAssists,
        })
      }
    }

    recent.sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())

    return { goals, assists, matchesInvolved, recent: recent.slice(0, 8) }
  }, [matches, team, name])

  if (!team || !name) {
    return <Alert severity="info">Open a player from a team squad to see their profile.</Alert>
  }

  return (
    <Stack spacing={2}>
      {isLoading && <LoadingBar label="Loading player…" />}

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1.6} sx={{ alignItems: 'center' }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'rgba(76,227,163,0.16)',
                color: 'primary.main',
                fontWeight: 900,
                fontSize: '1.3rem',
              }}
            >
              {name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', md: '1.25rem' }, lineHeight: 1.2 }} noWrap>
                {name}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }} noWrap>
                {team}
                {player?.number ? ` · #${player.number}` : ''}
                {player?.position ? ` · ${player.position}` : ''}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 1, mt: 2 }}>
            <StatTile label="Goals" value={stats.goals} accent="#4ce3a3" />
            <StatTile label="Assists" value={stats.assists} />
            <StatTile label="Matches" value={stats.matchesInvolved} />
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Recent contributions
          </Typography>
          {stats.recent.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mt: 0.5 }}>
              No goals or assists recorded for {name} yet.
            </Typography>
          ) : (
            <Stack spacing={0.8} sx={{ mt: 1 }}>
              {stats.recent.map((entry) => (
                <Stack
                  key={entry.id}
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid rgba(159,176,201,0.14)',
                    borderRadius: 1.3,
                    px: 1.2,
                    py: 0.7,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }} noWrap>
                      vs {entry.opponent}
                    </Typography>
                    <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }} noWrap>
                      {new Date(entry.kickoff).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: '#a7b3c9' }}>
                    {entry.score}
                    {entry.goals > 0 ? ` · ${entry.goals}G` : ''}
                    {entry.assists > 0 ? ` · ${entry.assists}A` : ''}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}
