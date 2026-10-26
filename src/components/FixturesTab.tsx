import { useMemo, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import type { MatchAnnouncement, TournamentItem } from '../types'
import { api } from '../lib/api'
import { getMatchRuntimeStatus, getMatchStatusLabel } from '../lib/matchStatus'
import { useMatchClock } from '../lib/useMatchClock'

interface FixturesTabProps {
  tournament: TournamentItem
  fixtures: MatchAnnouncement[]
  isLoading: boolean
  isOwner: boolean
  teamLogosByName: Record<string, string | undefined>
  onGenerate: () => Promise<void>
  generateError: string
}

const roundLabel = (round: number, format: string): string => {
  const f = format.toLowerCase()
  if (f.includes('knockout') && !f.includes('group')) {
    const labels: Record<number, string> = { 1: 'Round of 16 / Quarter-finals', 2: 'Semi-finals', 3: 'Final' }
    return labels[round] ?? `Round ${round}`
  }
  if (f.includes('group')) {
    return round <= 10 ? `Group Stage — Matchday ${round}` : `Knockout Round ${round - 10}`
  }
  return `Matchday ${round}`
}

const statusColor = (status: string) => {
  if (status === 'finished') return '#2ed598'
  if (status === 'playing') return '#f4b84f'
  return '#6478a0'
}

function TeamBlock({
  name,
  logo,
  align,
}: {
  name: string
  logo?: string
  align: 'left' | 'right'
}) {
  return (
    <Stack
      direction={align === 'left' ? 'row' : 'row-reverse'}
      spacing={0.8}
      sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}
    >
      {logo ? (
        <Avatar src={logo} sx={{ width: 26, height: 26 }} />
      ) : (
        <Avatar sx={{ width: 26, height: 26, bgcolor: 'rgba(173,255,15,0.15)', color: '#adff0f', fontSize: '0.7rem', fontWeight: 800 }}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
      )}
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: { xs: '0.78rem', sm: '0.88rem' },
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: align,
        }}
      >
        {name}
      </Typography>
    </Stack>
  )
}

export function FixturesTab({
  tournament,
  fixtures,
  isLoading,
  isOwner,
  teamLogosByName,
  onGenerate,
  generateError,
}: FixturesTabProps) {
  useMatchClock()
  const [generating, setGenerating] = useState(false)
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1]))

  const rounds = useMemo(() => {
    const map = new Map<number, MatchAnnouncement[]>()
    for (const fixture of fixtures) {
      const r = fixture.round ?? 1
      const list = map.get(r) ?? []
      list.push(fixture)
      map.set(r, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [fixtures])

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev)
      if (next.has(round)) {
        next.delete(round)
      } else {
        next.add(round)
      }
      return next
    })
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await onGenerate()
    } finally {
      setGenerating(false)
    }
  }

  const token = api.getToken()

  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={28} sx={{ color: '#adff0f' }} />
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      {/* Header row */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography sx={{ color: '#8e98b0', fontSize: '0.68rem', letterSpacing: '0.1em', fontWeight: 700 }}>
            {tournament.format.toUpperCase()} · {tournament.registeredTeams.length} TEAMS
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>Fixture List</Typography>
        </Box>

        {isOwner && token && fixtures.length === 0 && (
          <Button
            variant="contained"
            onClick={() => void handleGenerate()}
            disabled={generating || tournament.registeredTeams.length < 2}
            
          >
            {generating ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={14} sx={{ color: '#102100' }} />
                <span>Generating…</span>
              </Stack>
            ) : (
              '⚡ Generate Fixtures'
            )}
          </Button>
        )}
      </Stack>

      {generateError && (
        <Typography sx={{ color: '#f16f77', fontSize: '0.82rem' }}>{generateError}</Typography>
      )}

      {fixtures.length === 0 && !generating && (
        <Box
          sx={{
            border: '1px dashed rgba(173,255,15,0.2)',
            borderRadius: 2,
            py: 4,
            textAlign: 'center',
          }}
        >
          <SportsSoccerIcon sx={{ fontSize: '2rem', color: 'rgba(173,255,15,0.3)', mb: 1 }} />
          <Typography sx={{ color: '#6f7890', fontSize: '0.88rem' }}>
            {isOwner
              ? tournament.registeredTeams.length < 2
                ? 'Register at least 2 teams before generating fixtures.'
                : 'No fixtures yet. Click "Generate Fixtures" to build the schedule.'
              : 'Fixtures have not been generated yet.'}
          </Typography>
        </Box>
      )}

      {rounds.map(([round, roundFixtures]) => {
        const isExpanded = expandedRounds.has(round)
        const finishedCount = roundFixtures.filter((f) => f.homeScore !== undefined && f.awayScore !== undefined).length

        return (
          <Box key={`round-${round}`} sx={{ border: '1px solid rgba(170,186,212,0.15)', borderRadius: 2, overflow: 'hidden' }}>
            {/* Round header — clickable toggle */}
            <Stack
              direction="row"
              onClick={() => toggleRound(round)}
              sx={{
                px: 2,
                py: 1.2,
                bgcolor: 'rgba(20,23,38,0.95)',
                cursor: 'pointer',
                justifyContent: 'space-between',
                alignItems: 'center',
                '&:hover': { bgcolor: 'rgba(173,255,15,0.05)' },
              }}
            >
              <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    bgcolor: 'rgba(173,255,15,0.12)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#adff0f',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                  }}
                >
                  {round}
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {roundLabel(round, tournament.format)}
                </Typography>
                <Chip
                  label={`${finishedCount}/${roundFixtures.length} played`}
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    height: 20,
                    bgcolor: finishedCount === roundFixtures.length ? 'rgba(46,213,152,0.15)' : 'rgba(100,120,160,0.15)',
                    color: finishedCount === roundFixtures.length ? '#2ed598' : '#8090b0',
                  }}
                />
              </Stack>
              <Typography sx={{ color: '#6f7890', fontSize: '0.9rem', userSelect: 'none' }}>
                {isExpanded ? '▲' : '▼'}
              </Typography>
            </Stack>

            {/* Fixture rows */}
            {isExpanded && (
              <Stack divider={<Box sx={{ height: '1px', bgcolor: 'rgba(170,186,212,0.08)' }} />}>
                {roundFixtures.map((fixture) => {
                  const hasScore = fixture.homeScore !== undefined && fixture.awayScore !== undefined
                  const runtimeStatus = getMatchRuntimeStatus(
                    fixture.kickoff,
                    fixture.durationMinutes,
                    fixture.homeScore,
                    fixture.awayScore,
                  )
                  const kickoff = new Date(fixture.kickoff)
                  const dateStr = Number.isFinite(kickoff.getTime())
                    ? kickoff.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
                    : '—'

                  return (
                    <Box
                      key={fixture.id}
                      sx={{
                        px: { xs: 1.5, sm: 2 },
                        py: 1.3,
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        gap: { xs: 0.8, sm: 1.5 },
                        alignItems: 'center',
                        bgcolor: hasScore ? 'rgba(46,213,152,0.03)' : 'rgba(17,19,31,0.85)',
                      }}
                    >
                      {/* Home team */}
                      <TeamBlock
                        name={fixture.homeTeam}
                        logo={teamLogosByName[fixture.homeTeam]}
                        align="left"
                      />

                      {/* Score / date block */}
                      <Stack sx={{ alignItems: 'center', minWidth: 72 }}>
                        {hasScore ? (
                          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#f4f7ff', letterSpacing: '0.06em' }}>
                            {fixture.homeScore} – {fixture.awayScore}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#6f7890', textAlign: 'center' }}>
                            {dateStr}
                          </Typography>
                        )}
                        <Chip
                          label={getMatchStatusLabel(runtimeStatus).toUpperCase()}
                          size="small"
                          sx={{
                            mt: 0.4,
                            height: 16,
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            color: statusColor(runtimeStatus),
                            bgcolor: 'transparent',
                            border: `1px solid ${statusColor(runtimeStatus)}44`,
                            '& .MuiChip-label': { px: 0.6 },
                          }}
                        />
                      </Stack>

                      {/* Away team */}
                      <TeamBlock
                        name={fixture.awayTeam}
                        logo={teamLogosByName[fixture.awayTeam]}
                        align="right"
                      />
                    </Box>
                  )
                })}
              </Stack>
            )}
          </Box>
        )
      })}
    </Stack>
  )
}
