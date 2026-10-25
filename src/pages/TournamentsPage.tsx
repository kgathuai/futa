import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useLocation, useOutletContext } from 'react-router-dom'
import { api } from '../lib/api'
import type { MatchAnnouncement, TournamentItem, TournamentStatus } from '../types'
import { FixturesTab } from '../components/FixturesTab'
import { useAutoHide } from '../lib/useAutoHide'
import { getTournamentStatus } from '../lib/tournamentStatus'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInTeam: string | null
}

const sports = ['All sports', 'Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table']

export function TournamentsPage() {
  const { loggedInUser, loggedInRole, loggedInTeam } = useOutletContext<AuthOutletContext>()
  const location = useLocation()
  const navState = location.state as { openTournamentId?: string; showTournamentList?: boolean } | null
  const showTournamentList = Boolean(navState?.showTournamentList)
  const [selectedSport, setSelectedSport] = useState('All sports')
  const [showNewForm, setShowNewForm] = useState(false)
  const [tournaments, setTournaments] = useState<TournamentItem[]>([])
  const [matches, setMatches] = useState<MatchAnnouncement[]>([])
  const [teamLogosByName, setTeamLogosByName] = useState<Record<string, string | undefined>>({})
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(false)

  const [name, setName] = useState('')
  const [sport, setSport] = useState('Football')
  const [format, setFormat] = useState('Knockout')
  const [venue, setVenue] = useState('')
  const [status, setStatus] = useState<TournamentStatus>('upcoming')
  const [maxTeams, setMaxTeams] = useState<number | ''>('')
  const [activeTab, setActiveTab] = useState<'standings' | 'fixtures' | 'stats'>('standings')
  const [fixtures, setFixtures] = useState<MatchAnnouncement[]>([])
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false)
  const [statusClock, setStatusClock] = useState(Date.now())
  const [generateError, setGenerateError] = useState('')
  useAutoHide(message, () => setMessage(''))
  useAutoHide(generateError, () => setGenerateError(''))
  const canCreateHere = false
  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canRegisterTeam = Boolean(
    loggedInUser &&
      loggedInTeam &&
      (normalizedRole === 'captain' ||
        normalizedRole === 'tm' ||
        normalizedRole === 'coach' ||
        normalizedRole === 'admin' ||
        normalizedRole === 'superadmin'),
  )

  useEffect(() => {
    const timer = window.setInterval(() => setStatusClock(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const currentTournaments = useMemo(
    () =>
      tournaments.map((tournament) => ({
        ...tournament,
        status: getTournamentStatus(tournament, statusClock),
      })),
    [tournaments, statusClock],
  )
  const filteredTournaments = useMemo(
    () => currentTournaments.filter((t) => selectedSport === 'All sports' || t.sport === selectedSport),
    [currentTournaments, selectedSport],
  )
  const runningTournaments = useMemo(
    () => filteredTournaments.filter((tournament) => tournament.status === 'ongoing'),
    [filteredTournaments],
  )
  const selectedTournament = useMemo(
    () =>
      selectedTournamentId
        ? filteredTournaments.find((item) => item.id === selectedTournamentId) ?? null
        : null,
    [filteredTournaments, selectedTournamentId],
  )
  const isOwner = Boolean(loggedInTeam && selectedTournament?.ownerTeam === loggedInTeam)
  const selectedTournamentTeams = useMemo(
    () => selectedTournament?.registeredTeams ?? [],
    [selectedTournament],
  )
  const isTournamentFull = Boolean(
    selectedTournament?.maxTeams && selectedTournamentTeams.length >= selectedTournament.maxTeams,
  )
  const sortedSelectedTournamentTeams = useMemo(
    () =>
      [...new Set(selectedTournamentTeams)].sort((teamA, teamB) =>
        teamA.localeCompare(teamB, undefined, { sensitivity: 'base' }),
      ),
    [selectedTournamentTeams],
  )

  const selectedTournamentStandings = useMemo(() => {
    if (!selectedTournament) {
      return [] as Array<{
        team: string
        played: number
        won: number
        drawn: number
        lost: number
        goalsFor: number
        goalsAgainst: number
        goalDifference: number
        points: number
      }>
    }

    const rows = new Map(
      sortedSelectedTournamentTeams.map((teamName) => [
        teamName,
        {
          team: teamName,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        },
      ]),
    )

    const teamSet = new Set(sortedSelectedTournamentTeams)
    const relevantMatches = matches.filter((match) => {
      if (!teamSet.has(match.homeTeam) || !teamSet.has(match.awayTeam)) {
        return false
      }

      if (match.sport !== selectedTournament.sport) {
        return false
      }

      return Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore)
    })

    for (const match of relevantMatches) {
      const home = rows.get(match.homeTeam)
      const away = rows.get(match.awayTeam)
      if (!home || !away) {
        continue
      }

      const homeScore = Number(match.homeScore)
      const awayScore = Number(match.awayScore)

      home.played += 1
      away.played += 1
      home.goalsFor += homeScore
      home.goalsAgainst += awayScore
      away.goalsFor += awayScore
      away.goalsAgainst += homeScore

      if (homeScore > awayScore) {
        home.won += 1
        home.points += 3
        away.lost += 1
      } else if (awayScore > homeScore) {
        away.won += 1
        away.points += 3
        home.lost += 1
      } else {
        home.drawn += 1
        away.drawn += 1
        home.points += 1
        away.points += 1
      }
    }

    for (const row of rows.values()) {
      row.goalDifference = row.goalsFor - row.goalsAgainst
    }

    return Array.from(rows.values()).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points
      }
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference
      }
      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor
      }
      return a.team.localeCompare(b.team, undefined, { sensitivity: 'base' })
    })
  }, [matches, selectedTournament, sortedSelectedTournamentTeams])

  const selectedTournamentEfficiency = useMemo(() => {
    if (selectedTournamentStandings.length === 0) {
      return 0
    }

    const totalPoints = selectedTournamentStandings.reduce((sum, row) => sum + row.points, 0)
    const maxPoints = selectedTournamentStandings.reduce((sum, row) => sum + row.played * 3, 0)
    if (maxPoints === 0) {
      return 0
    }

    return Math.round((totalPoints / maxPoints) * 1000) / 10
  }, [selectedTournamentStandings])
  const estimatedPrizePool = useMemo(() => {
    const base = 5000
    const perTeam = 750
    return base + selectedTournamentTeams.length * perTeam
  }, [selectedTournamentTeams.length])
  const mvpPreview = selectedTournamentStandings[0] ?? null

  const tournamentStats = useMemo(() => {
    const scorerMap = new Map<string, { player: string; team: string; goals: number }>()
    const assistMap = new Map<string, { player: string; team: string; assists: number }>()

    for (const fixture of fixtures) {
      for (const goal of fixture.goals ?? []) {
        const scorer = goal.scorer.trim()
        const team = goal.team.trim()
        if (!scorer) {
          continue
        }

        const scorerKey = `${team}::${scorer.toLowerCase()}`
        const scorerRow = scorerMap.get(scorerKey) ?? { player: scorer, team, goals: 0 }
        scorerRow.goals += 1
        scorerMap.set(scorerKey, scorerRow)

        const assist = goal.assist?.trim()
        if (assist) {
          const assistKey = `${team}::${assist.toLowerCase()}`
          const assistRow = assistMap.get(assistKey) ?? { player: assist, team, assists: 0 }
          assistRow.assists += 1
          assistMap.set(assistKey, assistRow)
        }
      }
    }

    return {
      scorers: [...scorerMap.values()]
        .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player))
        .slice(0, 10),
      assists: [...assistMap.values()]
        .sort((a, b) => b.assists - a.assists || a.player.localeCompare(b.player))
        .slice(0, 10),
    }
  }, [fixtures])

  const loadTournaments = async () => {
    setIsLoadingTournaments(true)
    try {
      const response = await api.getTournaments()
      setTournaments(response)
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load tournaments.')
    } finally {
      setIsLoadingTournaments(false)
    }
  }

  const loadMatches = async () => {
    try {
      const response = await api.getMatches()
      setMatches(response)
    } catch {
      // Keep tournament page usable even if matches fail to load.
    }
  }

  const loadTeams = async () => {
    try {
      const response = await api.getTeams()
      const next: Record<string, string | undefined> = {}
      for (const team of response.teams) {
        next[team.name] = team.logoUrl
      }
      setTeamLogosByName(next)
    } catch {
      setTeamLogosByName({})
    }
  }

  const handleGenerateFixtures = async () => {
    if (!selectedTournament) return
    const token = api.getToken()
    if (!token) {
      setGenerateError('Please log in to generate fixtures.')
      return
    }
    setGenerateError('')
    try {
      const data = await api.generateFixtures(selectedTournament.id, token)
      setFixtures(data)
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate fixtures.')
    }
  }

  useEffect(() => {
    void loadTournaments()
    void loadMatches()
    void loadTeams()
  }, [])

  // Reset tab + reload fixtures whenever selected tournament changes
  useEffect(() => {
    setActiveTab('standings')
    setFixtures([])
    setGenerateError('')
    if (!selectedTournamentId) return
    let cancelled = false
    setIsLoadingFixtures(true)
    api.getFixtures(selectedTournamentId)
      .then((data) => { if (!cancelled) setFixtures(data) })
      .catch(() => { if (!cancelled) setFixtures([]) })
      .finally(() => { if (!cancelled) setIsLoadingFixtures(false) })
    return () => { cancelled = true }
  }, [selectedTournamentId])

  useEffect(() => {
    const targetId = navState?.openTournamentId
    if (!targetId || tournaments.length === 0) {
      return
    }

    const targetTournament = tournaments.find((item) => item.id === targetId)
    if (!targetTournament) {
      return
    }

    setSelectedTournamentId(targetTournament.id)
    setSelectedSport(targetTournament.sport)
  }, [navState, tournaments])

  useEffect(() => {
    if (showTournamentList) {
      setSelectedSport('All sports')
    }
  }, [showTournamentList])

  useEffect(() => {
    if (filteredTournaments.length === 0) {
      if (selectedTournamentId !== null) {
        setSelectedTournamentId(null)
      }
      return
    }

    const stillVisible = selectedTournamentId
      ? filteredTournaments.some((item) => item.id === selectedTournamentId)
      : false

    if (!stillVisible) {
      setSelectedTournamentId(filteredTournaments[0].id)
    }
  }, [filteredTournaments, selectedTournamentId])

  const handleCreateTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const safeName = name.trim()
    const safeVenue = venue.trim()
    if (!safeName || !safeVenue) {
      setMessage('Please complete all required tournament fields.')
      return
    }

    const token = api.getToken()
    if (!token) {
      setMessage('Please log in before creating a tournament.')
      return
    }

    try {
      const createdTournament = await api.createTournament(
        {
          sport,
          format: format.trim(),
          name: safeName,
          period: 'TBD',
          venue: safeVenue,
          status,
          maxTeams: maxTeams !== '' ? maxTeams : undefined,
        },
        token,
      )

      setTournaments((prev) => [createdTournament, ...prev])
      setShowNewForm(false)
      setMessage('Tournament created successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create tournament.')
      return
    }

    setName('')
    setSport('Football')
    setFormat('Knockout')
    setVenue('')
    setStatus('upcoming')
    setMaxTeams('')
  }

  const handleRegisterTeam = async () => {
    if (!selectedTournament) {
      return
    }

    if (!canRegisterTeam) {
      setMessage('Only logged in captain, TM, or coach can register a team.')
      return
    }

    const token = api.getToken()
    if (!token) {
      setMessage('Please log in before registering your team.')
      return
    }

    try {
      const updatedTournament = await api.registerTournamentTeam(selectedTournament.id, token)
      setTournaments((prev) => prev.map((item) => (item.id === updatedTournament.id ? updatedTournament : item)))
      await loadMatches()
      setMessage('Team registered successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to register team.')
    }
  }

  return (
    <Stack spacing={3}>
     

      {canCreateHere && showNewForm && (
        <Card variant="outlined">
          <CardContent>
            <Box component="form" onSubmit={handleCreateTournament} sx={{ display: 'grid', gap: 1.4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Create a new tournament
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fill in the tournament details below.
              </Typography>

              <TextField
                label="Tournament name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />

              <TextField
                select
                label="Sport"
                value={sport}
                onChange={(event) => setSport(event.target.value)}
                required
              >
                {sports
                  .filter((item) => item !== 'All sports')
                  .map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
              </TextField>

              <TextField
                select
                label="Format"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                required
              >
                {['Knockout', 'League', 'Group+Knockout', 'Round Robin'].map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Venue"
                value={venue}
                onChange={(event) => setVenue(event.target.value)}
                required
              />

              <TextField
                select
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value as TournamentStatus)}
                required
              >
                <MenuItem value="upcoming">upcoming</MenuItem>
                <MenuItem value="registration open">registration open</MenuItem>
                <MenuItem value="ongoing">ongoing</MenuItem>
              </TextField>

              <TextField
                label="Max teams (optional)"
                type="number"
                value={maxTeams}
                onChange={(event) => {
                  const val = event.target.value
                  setMaxTeams(val === '' ? '' : Math.max(2, Math.floor(Number(val))))
                }}
                slotProps={{ htmlInput: { min: 2, step: 1 } }}
                helperText="Leave blank for unlimited. Minimum 2."
              />

              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  Create tournament
                </Button>
                <Button type="button" variant="outlined" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      {message && <Alert severity="info">{message}</Alert>}

      <Stack
        direction="row"
        aria-label="Sport filters"
        sx={{
          width: '100%',
          display: { xs: 'grid', sm: 'flex' },
          gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))' },
          flexWrap: 'wrap',
          columnGap: { xs: 0.7, sm: 1.4 },
          rowGap: { xs: 1.6, sm: 1 },
        }}
      >
        {sports.map((sport) => (
          <Chip
            key={sport}
            label={sport}
            clickable
            color={sport === selectedSport ? 'primary' : 'default'}
            onClick={() => setSelectedSport(sport)}
            sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 0,
              ...(sport === selectedSport ? { color: '#07111f', fontWeight: 700 } : {}),
              '& .MuiChip-label': { fontSize: { xs: '0.62rem', sm: '0.7rem' }, px: { xs: 0.5, sm: 1.2 } },
            }}
          />
        ))}
      </Stack>

      {isLoadingTournaments && (
        <Typography color="text.secondary" sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
          Loading tournaments...
        </Typography>
      )}
      {!isLoadingTournaments && filteredTournaments.length === 0 && (
        <Typography color="text.secondary" sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
          No tournaments yet. Created tournaments will appear here.
        </Typography>
      )}

      {!isLoadingTournaments && filteredTournaments.length > 0 && (
        <Card
          variant="outlined"
          sx={{
            borderColor: 'rgba(173,255,15,0.35)',
            bgcolor: 'rgba(17,19,31,0.94)',
          }}
        >
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1.2 }}>Running Tournaments</Typography>
            {runningTournaments.length === 0 ? (
              <Typography color="text.secondary" sx={{ fontSize: '0.84rem' }}>
                No tournaments are running right now.
              </Typography>
            ) : (
            <Stack spacing={1}>
              {runningTournaments.map((item) => (
                <Box
                  key={`running-tournament-${item.id}`}
                  onClick={() => setSelectedTournamentId(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedTournamentId(item.id)
                    }
                  }}
                  sx={{
                    border: '1px solid rgba(173,255,15,0.22)',
                    borderRadius: 1.2,
                    px: 1.2,
                    py: 1,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr auto', md: 'minmax(0, 2fr) minmax(0, 1fr) auto' },
                    gap: 1,
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'rgba(173,255,15,0.65)' },
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                    <Typography sx={{ color: '#8f98af', fontSize: '0.8rem' }}>{item.period}</Typography>
                  </Box>
                  <Typography sx={{ color: '#8f98af', fontSize: '0.86rem', display: { xs: 'none', md: 'block' } }}>
                    {item.sport} · {item.format}
                  </Typography>
                  <Chip label="ongoing" size="small" color="success" />
                </Box>
              ))}
            </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {showTournamentList && filteredTournaments.length > 0 && (
        <Card
          variant="outlined"
          sx={{
            borderColor: 'rgba(170,186,212,0.2)',
            bgcolor: 'rgba(17,19,31,0.94)',
          }}
        >
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1.2 }}>All Tournaments</Typography>
            <Stack spacing={1}>
              {filteredTournaments.map((item) => (
                <Box
                  key={`all-tournament-${item.id}`}
                  onClick={() => setSelectedTournamentId(item.id)}
                  sx={{
                    border: '1px solid rgba(159,176,201,0.15)',
                    borderRadius: 1.2,
                    px: 1.2,
                    py: 1,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr) auto' },
                    gap: 1,
                    alignItems: 'center',
                    cursor: 'pointer',
                    bgcolor: selectedTournamentId === item.id ? 'rgba(173,255,15,0.08)' : 'rgba(255,255,255,0.01)',
                    '&:hover': {
                      borderColor: 'rgba(173,255,15,0.45)',
                    },
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                    <Typography sx={{ color: '#8f98af', fontSize: '0.8rem' }}>{item.period}</Typography>
                  </Box>
                  <Typography sx={{ color: '#8f98af', fontSize: '0.86rem' }}>{item.sport} · {item.format}</Typography>
                  <Chip label={item.status} size="small" />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {!showTournamentList && selectedTournament && (
        <Stack spacing={2}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: 'rgba(170,186,212,0.2)',
              bgcolor: 'rgba(18,20,34,0.94)',
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
                <Stack spacing={1.2}>
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                    <Chip label={selectedTournament.status.toUpperCase()} size="small" sx={{ bgcolor: selectedTournament.status === 'finished' ? '#444958' : '#adff0f', color: selectedTournament.status === 'finished' ? '#f4f7ff' : '#122000', fontWeight: 800, height: { xs: 28, md: 34 }, '& .MuiChip-label': { fontSize: { xs: '0.68rem', md: '0.85rem' }, px: { xs: 1, md: 1.4 } } }} />
                  </Stack>

                  <Typography variant="h3" sx={{ fontSize: { xs: '1.15rem', md: '2.05rem' }, fontWeight: 800, lineHeight: 1.1 }}>
                    {selectedTournament.name}
                  </Typography>

                  <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', color: '#99a3bb' }}>
                    <Typography sx={{ fontSize: '0.84rem' }}>{selectedTournament.period}</Typography>
                    <Typography sx={{ fontSize: '0.84rem' }}>{selectedTournament.venue}</Typography>
                    <Typography sx={{ fontSize: '0.84rem' }}>{selectedTournamentTeams.length} Teams{selectedTournament.maxTeams ? ` / ${selectedTournament.maxTeams} Max` : ' Participating'}</Typography>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    border: '1px solid rgba(173,255,15,0.3)',
                    borderRadius: 2,
                    p: 2,
                    bgcolor: 'rgba(14,18,28,0.95)',
                    boxShadow: '0 0 30px rgba(173,255,15,0.08)',
                  }}
                >
                  <Typography sx={{ color: '#f4f7ff', fontWeight: 700, fontSize: '0.9rem', mb: 1 }}>
                    {selectedTournament.status === 'registration open' ? 'REGISTRATION OPEN' : selectedTournament.status === 'finished' ? 'TOURNAMENT FINISHED' : 'TOURNAMENT DESK'}
                  </Typography>
                  <Typography sx={{ color: '#99a3bb', fontSize: '0.8rem', mb: 1.6 }}>
                    {isTournamentFull
                      ? 'This tournament is full. No more teams can register.'
                      : selectedTournament.status === 'finished'
                      ? 'This tournament has ended. Registration is closed.'
                      : selectedTournament.status === 'registration open'
                      ? 'Spots are available. Register your team now.'
                      : 'Manage participants and keep standings updated.'}
                  </Typography>
                  {selectedTournament.maxTeams && (
                    <Typography sx={{ color: isTournamentFull ? '#f16f77' : '#adff0f', fontSize: '0.78rem', fontWeight: 700, mb: 1.2 }}>
                      {isTournamentFull
                        ? `Full — ${selectedTournament.maxTeams}/${selectedTournament.maxTeams} teams`
                        : `${selectedTournamentTeams.length}/${selectedTournament.maxTeams} teams registered`}
                    </Typography>
                  )}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => void handleRegisterTeam()}
                    disabled={selectedTournament.status !== 'registration open' || !canRegisterTeam || !loggedInTeam || selectedTournamentTeams.includes(loggedInTeam) || isTournamentFull}
                    sx={{ bgcolor: '#adff0f', color: '#102100', fontWeight: 800, '&:hover': { bgcolor: '#99e600' } }}
                  >
                    {isTournamentFull ? 'Tournament Full' : selectedTournament.status === 'finished' ? 'Registration Closed' : selectedTournament.status === 'upcoming' ? 'Registration Not Open' : 'Join Tournament'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: 'grid', gap: 1.4, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            <Card variant="outlined" sx={{ borderColor: 'rgba(170,186,212,0.2)', bgcolor: 'rgba(17,19,31,0.94)' }}>
              <CardContent>
                <Typography sx={{ color: '#8e98b0', fontSize: '0.66rem', letterSpacing: '0.08em' }}>TOTAL PRIZE POOL</Typography>
                <Typography sx={{ fontSize: { xs: '1.35rem', md: '2rem' }, fontWeight: 800, mt: 0.3 }}>Ksh {estimatedPrizePool.toLocaleString()}</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ borderColor: 'rgba(170,186,212,0.2)', bgcolor: 'rgba(17,19,31,0.94)' }}>
              <CardContent>
                <Typography sx={{ color: '#8e98b0', fontSize: '0.66rem', letterSpacing: '0.08em' }}>TOURNAMENT MVP</Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.6 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.74rem', bgcolor: 'rgba(173,255,15,0.15)', color: '#adff0f' }}>
                    {(mvpPreview?.team ?? 'N').charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.35rem' }}>
                    {mvpPreview?.team ?? 'No data'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ borderColor: 'rgba(170,186,212,0.2)', bgcolor: 'rgba(17,19,31,0.94)' }}>
              <CardContent>
                <Typography sx={{ color: '#8e98b0', fontSize: '0.66rem', letterSpacing: '0.08em' }}>MATCH EFFICIENCY</Typography>
                <Typography sx={{ fontSize: { xs: '1.35rem', md: '2rem' }, fontWeight: 800, mt: 0.3 }}>{selectedTournamentEfficiency}%</Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Tab switcher */}
          <Stack direction="row" spacing={0.8}>
            {(['standings', 'fixtures', 'stats'] as const).map((tab) => (
              <Button
                key={tab}
                onClick={() => setActiveTab(tab)}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textTransform: 'capitalize',
                  px: 2,
                  py: 0.6,
                  borderRadius: 1.5,
                  bgcolor: activeTab === tab ? '#adff0f' : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab ? '#102100' : '#8090b0',
                  '&:hover': { bgcolor: activeTab === tab ? '#99e600' : 'rgba(255,255,255,0.09)' },
                }}
              >
                {tab === 'standings' ? '📊 Standings' : tab === 'fixtures' ? '📅 Fixtures' : '⚽ Stats'}
              </Button>
            ))}
          </Stack>

          {/* Fixtures tab */}
          {activeTab === 'fixtures' && (
            <Card variant="outlined" sx={{ borderColor: 'rgba(170,186,212,0.2)', bgcolor: 'rgba(17,19,31,0.94)' }}>
              <CardContent sx={{ p: { xs: 2, md: 2.4 } }}>
                <FixturesTab
                  tournament={selectedTournament}
                  fixtures={fixtures}
                  isLoading={isLoadingFixtures}
                  isOwner={isOwner}
                  teamLogosByName={teamLogosByName}
                  onGenerate={handleGenerateFixtures}
                  generateError={generateError}
                />
              </CardContent>
            </Card>
          )}

          {/* Standings tab */}
          {activeTab === 'standings' && (
          <Card variant="outlined" sx={{ borderColor: 'rgba(170,186,212,0.2)', bgcolor: 'rgba(17,19,31,0.94)' }}>
            <CardContent sx={{ p: 0 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2.2, py: 1.8 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1rem', md: '1.25rem' } }}>League Standings</Typography>
                <Stack direction="row" spacing={0.9}>
                  <Chip size="small" label="All Groups" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                  <Chip size="small" label="Group A" variant="outlined" />
                  <Chip size="small" label="Group B" variant="outlined" />
                </Stack>
              </Stack>

              {selectedTournamentStandings.length === 0 ? (
                <Typography color="text.secondary" sx={{ px: 2.2, pb: 2.2, fontSize: '0.84rem' }}>
                  Standings will appear once teams register.
                </Typography>
              ) : (
                <>
                  <Box sx={{ borderTop: '1px solid rgba(159,176,201,0.12)', borderBottom: '1px solid rgba(159,176,201,0.12)', overflowX: 'auto' }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '70px minmax(180px, 1.6fr) repeat(6, 52px) 80px',
                        px: 2.2,
                        py: 1.05,
                        minWidth: 760,
                        color: '#99a3bb',
                        fontSize: '0.68rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit' }}>Rank</Typography>
                      <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit' }}>Team</Typography>
                      <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', textAlign: 'center' }}>GP</Typography>
                      <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', textAlign: 'center' }}>W</Typography>
                      <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', textAlign: 'center' }}>D</Typography>
                      <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', textAlign: 'center' }}>L</Typography>
                      <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', textAlign: 'center' }}>GD</Typography>
                      <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', textAlign: 'center' }}>PTS</Typography>
                      <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', textAlign: 'center' }}>Last 5</Typography>
                    </Box>

                    {selectedTournamentStandings.slice(0, 8).map((standing, index) => {
                      const formBadges = [
                        standing.won > standing.lost ? 'W' : 'D',
                        standing.won >= standing.drawn ? 'W' : 'D',
                        standing.lost > 0 ? 'L' : 'W',
                        standing.drawn > 0 ? 'D' : 'W',
                        standing.won > 0 ? 'W' : 'D',
                      ]

                      return (
                        <Box
                          key={`standing-inline-${standing.team}`}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '70px minmax(180px, 1.6fr) repeat(6, 52px) 80px',
                            px: 2.2,
                            py: 1.15,
                            minWidth: 760,
                            alignItems: 'center',
                            borderTop: index === 0 ? '1px solid rgba(159,176,201,0.1)' : '1px solid rgba(159,176,201,0.08)',
                          }}
                        >
                          <Typography sx={{ color: '#d6deee', fontWeight: 700 }}>0{index + 1}</Typography>
                          <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                            {teamLogosByName[standing.team] ? (
                              <Avatar src={teamLogosByName[standing.team]} sx={{ width: 20, height: 20 }} />
                            ) : (
                              <Avatar sx={{ width: 20, height: 20, fontSize: '0.62rem', bgcolor: 'rgba(173,255,15,0.15)', color: '#adff0f' }}>
                                {standing.team.charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            <Typography sx={{ fontWeight: 700 }}>{standing.team}</Typography>
                          </Stack>
                          <Typography sx={{ textAlign: 'center' }}>{standing.played}</Typography>
                          <Typography sx={{ textAlign: 'center' }}>{standing.won}</Typography>
                          <Typography sx={{ textAlign: 'center' }}>{standing.drawn}</Typography>
                          <Typography sx={{ textAlign: 'center' }}>{standing.lost}</Typography>
                          <Typography sx={{ textAlign: 'center', color: standing.goalDifference >= 0 ? '#adff0f' : '#f16f77', fontWeight: 700 }}>
                            {standing.goalDifference >= 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                          </Typography>
                          <Typography sx={{ textAlign: 'center', fontWeight: 800 }}>{standing.points}</Typography>
                          <Stack direction="row" spacing={0.4} sx={{ justifyContent: 'center' }}>
                            {formBadges.map((badge, badgeIndex) => (
                              <Box
                                key={`${standing.team}-form-${badgeIndex}`}
                                sx={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: 0.6,
                                  bgcolor: badge === 'W' ? '#2ed598' : badge === 'L' ? '#f16f77' : '#7f8799',
                                  color: '#fff',
                                  fontSize: '0.54rem',
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontWeight: 800,
                                }}
                              >
                                {badge}
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )
                    })}
                  </Box>

                  <Box sx={{ py: 1.4, textAlign: 'center' }}>
                    <Typography sx={{ color: '#a8b1c7', fontWeight: 600, fontSize: '0.84rem' }}>
                      View All {selectedTournamentTeams.length} Teams
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
          )}

          {/* Stats tab */}
          {activeTab === 'stats' && (
            <Box sx={{ display: 'grid', gap: 1.6, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              {[
                {
                  title: 'Top scorers',
                  empty: 'No goals recorded yet.',
                  accent: '#adff0f',
                  rows: tournamentStats.scorers.map((row) => ({
                    player: row.player,
                    team: row.team,
                    value: row.goals,
                  })),
                },
                {
                  title: 'Top assists',
                  empty: 'No assists recorded yet.',
                  accent: '#4ce3a3',
                  rows: tournamentStats.assists.map((row) => ({
                    player: row.player,
                    team: row.team,
                    value: row.assists,
                  })),
                },
              ].map((board) => (
                <Card
                  key={board.title}
                  variant="outlined"
                  sx={{ borderColor: 'rgba(170,186,212,0.2)', bgcolor: 'rgba(17,19,31,0.94)' }}
                >
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 2,
                        py: 1.4,
                        borderBottom: '1px solid rgba(159,176,201,0.1)',
                      }}
                    >
                      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>{board.title}</Typography>
                      <Chip
                        size="small"
                        label={board.title === 'Top scorers' ? 'GOALS' : 'ASSISTS'}
                        sx={{ bgcolor: 'rgba(255,255,255,0.06)', fontSize: '0.6rem', fontWeight: 700 }}
                      />
                    </Stack>

                    {board.rows.length === 0 ? (
                      <Typography sx={{ px: 2, py: 2.4, fontSize: '0.8rem', color: 'text.secondary' }}>
                        {board.empty}
                      </Typography>
                    ) : (
                      board.rows.map((row, index) => (
                        <Box
                          key={`${board.title}-${row.team}-${row.player}`}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '34px minmax(0,1fr) auto',
                            gap: 1,
                            alignItems: 'center',
                            px: 2,
                            py: 1,
                            borderTop: index === 0 ? 'none' : '1px solid rgba(159,176,201,0.07)',
                          }}
                        >
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#6f7890' }}>
                            {String(index + 1).padStart(2, '0')}
                          </Typography>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {row.player}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.64rem',
                                color: '#7f8aa3',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {row.team}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: board.accent }}>
                            {row.value}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

        </Stack>
      )}
    </Stack>
  )
}
