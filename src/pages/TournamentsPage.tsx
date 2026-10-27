import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, Autocomplete, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { MatchAnnouncement, TournamentItem, TournamentStatus } from '../types'
import { FixturesTab } from '../components/FixturesTab'
import { LoadingBar } from '../components/LoadingBar'
import { ShareButtons } from '../components/ShareButtons'
import type { TournamentPayment } from '../types'
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
  const [searchParams] = useSearchParams()
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
  const [maxTeams, setMaxTeams] = useState<number | ''>(8)
  const [entryFee, setEntryFee] = useState<number | ''>(0)
  const [payments, setPayments] = useState<TournamentPayment[]>([])
  const [payPhone, setPayPhone] = useState('')
  const [payMessage, setPayMessage] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [activeTab, setActiveTab] = useState<'standings' | 'fixtures' | 'stats'>('standings')
  const [fixtures, setFixtures] = useState<MatchAnnouncement[]>([])
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false)
  const [statusClock, setStatusClock] = useState(Date.now())
  const [generateError, setGenerateError] = useState('')
  const [manageTeamsOpen, setManageTeamsOpen] = useState(false)
  const [manageTeamsSelection, setManageTeamsSelection] = useState<string[]>([])
  const [isSavingTeams, setIsSavingTeams] = useState(false)
  const [teamsDialogError, setTeamsDialogError] = useState('')
  useAutoHide(message, () => setMessage(''))
  useAutoHide(generateError, () => setGenerateError(''))
  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canCreateHere =
    Boolean(loggedInUser) &&
    (normalizedRole === 'tm' ||
      normalizedRole === 'coach' ||
      normalizedRole === 'captain' ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin')
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
        form: Array<'W' | 'D' | 'L'>
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
          form: [] as Array<'W' | 'D' | 'L'>,
        },
      ]),
    )
    const resultsByTeam = new Map<string, Array<{ kickoff: number; outcome: 'W' | 'D' | 'L' }>>()

    const teamSet = new Set(sortedSelectedTournamentTeams)
    // Only fixtures that belong to this tournament count towards its table.
    const tournamentMatches = matches.filter((match) =>
      match.tournamentId
        ? match.tournamentId === selectedTournament.id
        : match.sport === selectedTournament.sport &&
          teamSet.has(match.homeTeam) &&
          teamSet.has(match.awayTeam),
    )
    const relevantMatches = tournamentMatches.filter((match) =>
      Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore),
    )

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

      const kickoffMs = new Date(match.kickoff).getTime() || 0

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

      const pushResult = (teamName: string, outcome: 'W' | 'D' | 'L') => {
        const list = resultsByTeam.get(teamName) ?? []
        list.push({ kickoff: kickoffMs, outcome })
        resultsByTeam.set(teamName, list)
      }
      pushResult(match.homeTeam, homeScore > awayScore ? 'W' : homeScore === awayScore ? 'D' : 'L')
      pushResult(match.awayTeam, awayScore > homeScore ? 'W' : homeScore === awayScore ? 'D' : 'L')
    }

    for (const row of rows.values()) {
      row.goalDifference = row.goalsFor - row.goalsAgainst
      row.form = (resultsByTeam.get(row.team) ?? [])
        .sort((a, b) => b.kickoff - a.kickoff)
        .slice(0, 5)
        .map((entry) => entry.outcome)
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

  // Share of this tournament's scheduled fixtures that have a recorded result.
  const selectedTournamentEfficiency = useMemo(() => {
    if (!selectedTournament) {
      return 0
    }

    const teamSet = new Set(sortedSelectedTournamentTeams)
    const scheduled = matches.filter((match) =>
      match.tournamentId
        ? match.tournamentId === selectedTournament.id
        : match.sport === selectedTournament.sport &&
          teamSet.has(match.homeTeam) &&
          teamSet.has(match.awayTeam),
    )
    if (scheduled.length === 0) {
      return 0
    }

    const completed = scheduled.filter(
      (match) => Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore),
    ).length

    return Math.round((completed / scheduled.length) * 100)
  }, [matches, selectedTournament, sortedSelectedTournamentTeams])
  const estimatedPrizePool = useMemo(() => {
    const base = 5000
    const perTeam = 750
    return base + selectedTournamentTeams.length * perTeam
  }, [selectedTournamentTeams.length])
  // MVP = best goals + assists contribution across this tournament's fixtures.
  const mvpPreview = useMemo(() => {
    if (!selectedTournament) {
      return null
    }

    const tournamentMatches = matches.filter((match) =>
      match.tournamentId
        ? match.tournamentId === selectedTournament.id
        : match.sport === selectedTournament.sport &&
          sortedSelectedTournamentTeams.includes(match.homeTeam) &&
          sortedSelectedTournamentTeams.includes(match.awayTeam),
    )

    const tally = new Map<string, { team: string; goals: number; assists: number }>()
    for (const match of tournamentMatches) {
      for (const goal of match.goals ?? []) {
        const scorer = goal.scorer?.trim()
        const team = goal.team?.trim()
        if (!scorer || !team) {
          continue
        }
        const key = `${team}::${scorer}`
        const entry = tally.get(key) ?? { team, goals: 0, assists: 0 }
        entry.goals += 1
        tally.set(key, entry)

        const assist = goal.assist?.trim()
        if (assist) {
          const assistKey = `${team}::${assist}`
          const assistEntry = tally.get(assistKey) ?? { team, goals: 0, assists: 0 }
          assistEntry.assists += 1
          tally.set(assistKey, assistEntry)
        }
      }
    }

    let best: { team: string; player: string; goals: number; assists: number; score: number } | null = null
    for (const [key, entry] of tally) {
      const player = key.split('::')[1] ?? key
      const score = entry.goals * 3 + entry.assists * 2
      if (!best || score > best.score || (score === best.score && entry.goals > best.goals)) {
        best = { team: entry.team, player, goals: entry.goals, assists: entry.assists, score }
      }
    }

    return best
  }, [matches, selectedTournament, sortedSelectedTournamentTeams])

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

  // Deep links such as /tournaments?tournament=<id> open the detail view.
  useEffect(() => {
    if (!selectedTournament || !loggedInUser) {
      setPayments([])
      return
    }

    const token = api.getToken()
    if (!token) {
      return
    }

    let active = true
    void api
      .getTournamentPayments(selectedTournament.id, token)
      .then((response) => {
        if (active) {
          setPayments(response.payments)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [selectedTournament, loggedInUser])

  useEffect(() => {
    const linkedId = searchParams.get('tournament')
    if (!linkedId || tournaments.length === 0) {
      return
    }

    const linked = tournaments.find((tournament) => tournament.id === linkedId)
    if (linked) {
      setSelectedTournamentId(linked.id)
      setSelectedSport(linked.sport)
    }
  }, [searchParams, tournaments])

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

  const handlePayEntry = async () => {
    if (!selectedTournament) {
      return
    }

    const token = api.getToken()
    if (!token) {
      setPayMessage('Log in with your team account to pay.')
      return
    }

    setIsPaying(true)
    setPayMessage('')
    try {
      const response = await api.payTournamentEntry(selectedTournament.id, payPhone.trim(), token)
      setPayMessage(response.mpesa?.message ?? response.message ?? 'Payment recorded.')
      if (response.payment) {
        setPayments((prev) => [response.payment as TournamentPayment, ...prev])
      }
    } catch (error) {
      setPayMessage(error instanceof Error ? error.message : 'Could not start that payment.')
    } finally {
      setIsPaying(false)
    }
  }

  const handleConfirmPayment = async (paymentId: string) => {
    const token = api.getToken()
    if (!token) {
      return
    }

    try {
      const response = await api.confirmTournamentPayment(paymentId, token)
      setPayments((prev) => prev.map((payment) => (payment.id === paymentId ? response.payment : payment)))
      setPayMessage('Payment confirmed and the team registered.')
      const refreshed = await api.getTournaments()
      setTournaments(refreshed)
    } catch (error) {
      setPayMessage(error instanceof Error ? error.message : 'Could not confirm that payment.')
    }
  }

  const handleCreateTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const safeName = name.trim()
    const safeVenue = venue.trim()
    const parsedMaxTeams = maxTeams === '' ? undefined : Number(maxTeams)
    if (!safeName || !safeVenue) {
      setMessage('Please complete all required tournament fields.')
      return
    }

    if (parsedMaxTeams === undefined || parsedMaxTeams < 2) {
      setMessage('Enter the maximum number of teams (at least 2).')
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
          maxTeams: parsedMaxTeams,
          entryFee: entryFee === '' ? 0 : Math.max(0, Math.floor(Number(entryFee))),
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
    setMaxTeams(8)
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

  const availableTeams = useMemo(() => {
    const names = new Set(Object.keys(teamLogosByName))
    for (const teamName of selectedTournament?.registeredTeams ?? []) {
      if (teamName.trim()) {
        names.add(teamName.trim())
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [selectedTournament, teamLogosByName])

  const openManageTeams = () => {
    if (!selectedTournament) {
      return
    }
    setManageTeamsSelection(selectedTournament.registeredTeams)
    setTeamsDialogError('')
    setManageTeamsOpen(true)
  }

  const handleSaveTeams = async () => {
    if (!selectedTournament) {
      return
    }

    const token = api.getToken()
    if (!token) {
      setTeamsDialogError('Please log in.')
      return
    }

    if (manageTeamsSelection.length < 2) {
      setTeamsDialogError('Select at least 2 teams.')
      return
    }

    setIsSavingTeams(true)
    try {
      const updated = await api.setTournamentTeams(
        selectedTournament.id,
        manageTeamsSelection,
        token,
      )
      setTournaments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setManageTeamsOpen(false)
      setTeamsDialogError('')
      setMessage('Tournament roster saved.')
      await loadMatches()
    } catch (error) {
      setTeamsDialogError(error instanceof Error ? error.message : 'Failed to save roster.')
    } finally {
      setIsSavingTeams(false)
    }
  }

  const rosterLocked = fixtures.length > 0

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
                label="Max teams"
                type="number"
                value={maxTeams}
                onChange={(event) => {
                  const val = event.target.value
                  setMaxTeams(val === '' ? '' : Math.max(2, Math.floor(Number(val))))
                }}
                slotProps={{ htmlInput: { min: 2, step: 1 } }}
                required
                helperText="Minimum 2. Open tournaments close registration at this limit."
              />

              <TextField
                label="Entry fee (Ksh)"
                type="number"
                value={entryFee}
                onChange={(event) => {
                  const val = event.target.value
                  setEntryFee(val === '' ? '' : Math.max(0, Math.floor(Number(val))))
                }}
                slotProps={{ htmlInput: { min: 0, step: 50 } }}
                helperText="0 means free. Paid fees are tracked in the tournament ledger."
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

      {message && (
        <Alert severity="info" onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {canCreateHere && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={() => setShowNewForm((prev) => !prev)}
            sx={{ fontWeight: 800 }}
          >
            {showNewForm ? 'Close form' : '+ Create tournament'}
          </Button>
        </Stack>
      )}

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
        <Stack spacing={0.8}>
          <LoadingBar label="Loading tournaments…" />
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.72rem', sm: '0.8rem' } }}>
            Loading tournaments…
          </Typography>
        </Stack>
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
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.8 }}>
                    <Chip label={selectedTournament.status.toUpperCase()} size="small" sx={{ bgcolor: selectedTournament.status === 'finished' ? '#444958' : '#adff0f', color: selectedTournament.status === 'finished' ? '#f4f7ff' : '#122000', fontWeight: 800, height: { xs: 22, md: 24 }, '& .MuiChip-label': { fontSize: { xs: '0.58rem', md: '0.66rem' }, px: { xs: 0.8, md: 1 } } }} />
                    <Chip
                      label={(selectedTournament.type ?? 'open').toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(76,227,163,0.1)',
                        color: '#4ce3a3',
                        border: '1px solid rgba(76,227,163,0.3)',
                        fontWeight: 800,
                        height: { xs: 20, md: 22 },
                        '& .MuiChip-label': { fontSize: { xs: '0.54rem', md: '0.6rem' }, px: { xs: 0.7, md: 0.9 } },
                      }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="h3" sx={{ fontSize: { xs: '0.92rem', md: '1.15rem' }, fontWeight: 800, lineHeight: 1.15 }}>
                      {selectedTournament.name}
                    </Typography>
                    <ShareButtons
                      payload={{
                        title: `${selectedTournament.name} — ${selectedTournament.sport}`,
                        text: `${selectedTournament.name} · ${selectedTournament.period} · ${selectedTournament.venue}`,
                        url: `${window.location.origin}/tournaments?tournament=${selectedTournament.id}`,
                      }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', color: '#99a3bb' }}>
                    <Typography sx={{ fontSize: '0.7rem' }}>{selectedTournament.period}</Typography>
                    <Typography sx={{ fontSize: '0.7rem' }}>{selectedTournament.venue}</Typography>
                    <Typography sx={{ fontSize: '0.7rem' }}>{selectedTournamentTeams.length} Teams{selectedTournament.maxTeams ? ` / ${selectedTournament.maxTeams} Max` : ' Participating'}</Typography>
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
                  <Typography sx={{ color: '#f4f7ff', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em', mb: 0.8 }}>
                    {selectedTournament.status === 'registration open' ? 'REGISTRATION OPEN' : selectedTournament.status === 'finished' ? 'TOURNAMENT FINISHED' : 'TOURNAMENT DESK'}
                  </Typography>
                  <Typography sx={{ color: '#99a3bb', fontSize: '0.68rem', mb: 1.2 }}>
                    {(selectedTournament.type ?? 'open') === 'closed'
                      ? isOwner
                        ? 'Closed tournament — select the teams that will take part.'
                        : 'Closed tournament — the organiser defines the participating teams.'
                      : isTournamentFull
                        ? 'This tournament is full. No more teams can register.'
                        : selectedTournament.status === 'finished'
                          ? 'This tournament has ended. Registration is closed.'
                          : selectedTournament.status === 'registration open'
                            ? 'Spots are available. Register your team now.'
                            : 'Manage participants and keep standings updated.'}
                  </Typography>
                  {selectedTournament.maxTeams && (
                    <Typography sx={{ color: isTournamentFull ? '#f16f77' : '#adff0f', fontSize: '0.72rem', fontWeight: 700, mb: 1.2 }}>
                      {isTournamentFull
                        ? `Full — ${selectedTournament.maxTeams}/${selectedTournament.maxTeams} teams`
                        : `${selectedTournamentTeams.length}/${selectedTournament.maxTeams} teams ${(selectedTournament.type ?? 'open') === 'closed' ? 'selected' : 'registered'}`}
                    </Typography>
                  )}

                  {(selectedTournament.type ?? 'open') === 'closed' ? (
                    isOwner ? (
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={openManageTeams}
                        disabled={selectedTournament.status === 'ongoing' || selectedTournament.status === 'finished' || rosterLocked}
                        
                      >
                        {rosterLocked ? 'Roster locked (fixtures generated)' : 'Manage teams'}
                      </Button>
                    ) : null
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => void handleRegisterTeam()}
                      disabled={selectedTournament.status !== 'registration open' || !canRegisterTeam || !loggedInTeam || selectedTournamentTeams.includes(loggedInTeam) || isTournamentFull}
                      
                    >
                      {isTournamentFull ? 'Tournament Full' : selectedTournament.status === 'finished' ? 'Registration Closed' : selectedTournament.status === 'upcoming' ? 'Registration Not Open' : 'Join Tournament'}
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: 'grid', gap: 1.4, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            <Card variant="outlined" sx={{ borderColor: 'rgba(170,186,212,0.2)', bgcolor: 'rgba(17,19,31,0.94)' }}>
              <CardContent>
                <Typography sx={{ color: '#8e98b0', fontSize: '0.55rem', letterSpacing: '0.07em' }}>TOTAL PRIZE POOL</Typography>
                <Typography sx={{ fontSize: { xs: '0.95rem', md: '1.15rem' }, fontWeight: 800, mt: 0.2 }}>Ksh {estimatedPrizePool.toLocaleString()}</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ borderColor: 'rgba(170,186,212,0.2)', bgcolor: 'rgba(17,19,31,0.94)' }}>
              <CardContent>
                <Typography sx={{ color: '#8e98b0', fontSize: '0.55rem', letterSpacing: '0.07em' }}>TOURNAMENT MVP</Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.6 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.74rem', bgcolor: 'rgba(173,255,15,0.15)', color: '#adff0f' }}>
                    {(mvpPreview?.team ?? 'N').charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', lineHeight: 1.2 }} noWrap>
                      {mvpPreview?.player ?? 'No data'}
                    </Typography>
                    {mvpPreview && (
                      <Typography sx={{ color: '#8e98b0', fontSize: '0.64rem' }} noWrap>
                        {mvpPreview.team} · {mvpPreview.goals}G {mvpPreview.assists}A
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ borderColor: 'rgba(170,186,212,0.2)', bgcolor: 'rgba(17,19,31,0.94)' }}>
              <CardContent>
                <Typography sx={{ color: '#8e98b0', fontSize: '0.55rem', letterSpacing: '0.07em' }}>MATCH EFFICIENCY</Typography>
                <Typography sx={{ fontSize: { xs: '0.95rem', md: '1.15rem' }, fontWeight: 800, mt: 0.2 }}>{selectedTournamentEfficiency}%</Typography>
              </CardContent>
            </Card>
          </Box>

          {(selectedTournament.entryFee ?? 0) > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.84rem' }}>Entry fee & payments</Typography>
                  <Chip
                    size="small"
                    label={`Ksh ${selectedTournament.entryFee}`}
                    sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: 'rgba(76,227,163,0.16)', color: 'primary.main' }}
                  />
                </Stack>

                {loggedInTeam && !selectedTournamentTeams.includes(loggedInTeam) && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.2 }}>
                    <TextField
                      size="small"
                      label="M-Pesa phone"
                      placeholder="2547XXXXXXXX"
                      value={payPhone}
                      onChange={(event) => setPayPhone(event.target.value)}
                      sx={{ maxWidth: 240 }}
                    />
                    <Button variant="contained" size="small" onClick={() => void handlePayEntry()} disabled={isPaying}>
                      {isPaying ? 'Starting…' : `Pay Ksh ${selectedTournament.entryFee}`}
                    </Button>
                  </Stack>
                )}

                {payMessage && (
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 1 }}>{payMessage}</Typography>
                )}

                {payments.length === 0 ? (
                  <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>
                    No payments recorded yet.
                  </Typography>
                ) : (
                  <Stack spacing={0.6}>
                    {payments.map((payment) => (
                      <Stack
                        key={payment.id}
                        direction="row"
                        sx={{
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: '1px solid rgba(159,176,201,0.14)',
                          borderRadius: 1.2,
                          px: 1.1,
                          py: 0.6,
                          gap: 1,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }} noWrap>
                            {payment.team} · Ksh {payment.amount}
                          </Typography>
                          <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }} noWrap>
                            {new Date(payment.createdAt).toLocaleString()} · {payment.status.toUpperCase()}
                            {payment.receipt ? ` · ${payment.receipt}` : ''}
                          </Typography>
                        </Box>
                        {payment.status !== 'paid' && isOwner && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => void handleConfirmPayment(payment.id)}
                            sx={{ fontSize: '0.66rem', py: 0.2, px: 1 }}
                          >
                            Confirm paid
                          </Button>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab switcher */}
          <Stack direction="row" spacing={0.8}>
            {(['standings', 'fixtures', 'stats'] as const).map((tab) => (
              <Button
                key={tab}
                onClick={() => setActiveTab(tab)}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.66rem',
                  textTransform: 'capitalize',
                  px: 1.2,
                  py: 0.35,
                  borderRadius: 1.5,
                  bgcolor: activeTab === tab ? '#4ce3a3' : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab ? '#07111f' : '#8090b0',
                  '&:hover': { bgcolor: activeTab === tab ? '#3ecf92' : 'rgba(255,255,255,0.09)' },
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
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '0.78rem', md: '0.84rem' } }}>League Standings</Typography>
                <Stack direction="row" spacing={0.9}>
                  <Chip size="small" label="All Groups" sx={{ bgcolor: 'rgba(255,255,255,0.08)', fontSize: '0.56rem', height: 19 }} />
                  <Chip size="small" label="Group A" variant="outlined" sx={{ fontSize: '0.56rem', height: 19 }} />
                  <Chip size="small" label="Group B" variant="outlined" sx={{ fontSize: '0.56rem', height: 19 }} />
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
                        fontSize: '0.55rem',
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
                      const formBadges = standing.form

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
                          <Typography sx={{ color: '#d6deee', fontWeight: 700, fontSize: '0.74rem' }}>0{index + 1}</Typography>
                          <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                            {teamLogosByName[standing.team] ? (
                              <Avatar src={teamLogosByName[standing.team]} sx={{ width: 20, height: 20 }} />
                            ) : (
                              <Avatar sx={{ width: 20, height: 20, fontSize: '0.62rem', bgcolor: 'rgba(173,255,15,0.15)', color: '#adff0f' }}>
                                {standing.team.charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            <Typography sx={{ fontWeight: 700, fontSize: '0.76rem' }}>{standing.team}</Typography>
                          </Stack>
                          <Typography sx={{ textAlign: 'center', fontSize: '0.76rem' }}>{standing.played}</Typography>
                          <Typography sx={{ textAlign: 'center', fontSize: '0.76rem' }}>{standing.won}</Typography>
                          <Typography sx={{ textAlign: 'center', fontSize: '0.76rem' }}>{standing.drawn}</Typography>
                          <Typography sx={{ textAlign: 'center', fontSize: '0.76rem' }}>{standing.lost}</Typography>
                          <Typography sx={{ textAlign: 'center', color: standing.goalDifference >= 0 ? '#adff0f' : '#f16f77', fontWeight: 700, fontSize: '0.76rem' }}>
                            {standing.goalDifference >= 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                          </Typography>
                          <Typography sx={{ textAlign: 'center', fontWeight: 800, fontSize: '0.76rem' }}>{standing.points}</Typography>
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
                    <Typography sx={{ color: '#a8b1c7', fontWeight: 600, fontSize: '0.74rem' }}>
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

      <Dialog open={manageTeamsOpen} onClose={() => setManageTeamsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 800 }}>Manage tournament roster</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary', mb: 1.4 }}>
            Select the teams that will play.
            {selectedTournament?.maxTeams
              ? ` Up to ${selectedTournament.maxTeams}.`
              : ' You can change this until fixtures are generated.'}
          </Typography>

          <Autocomplete
            multiple
            size="small"
            options={availableTeams}
            value={manageTeamsSelection}
            onChange={(_, value) => {
              const max = selectedTournament?.maxTeams
              setManageTeamsSelection(max ? value.slice(0, max) : value)
            }}
            getOptionDisabled={(option) => {
              const max = selectedTournament?.maxTeams
              return Boolean(
                max &&
                  !manageTeamsSelection.includes(option) &&
                  manageTeamsSelection.length >= max,
              )
            }}
            disableCloseOnSelect
            autoHighlight
            noOptionsText="No registered teams match"
            renderInput={(params) => (
              <TextField {...params} label="Teams" placeholder="Search teams…" />
            )}
            sx={{ '& .MuiAutocomplete-tag': { fontSize: '0.72rem' } }}
          />

          <Typography sx={{ fontSize: '0.68rem', color: '#7f8aa3', mt: 1.4 }}>
            {manageTeamsSelection.length} selected
            {selectedTournament?.maxTeams ? ` of ${selectedTournament.maxTeams} max` : ''}
          </Typography>
          <Typography sx={{ fontSize: '0.64rem', color: '#66708a', mt: 0.4 }}>
            Only teams registered in the community can be selected.
          </Typography>

          {teamsDialogError && (
            <Alert severity="error" sx={{ mt: 1.4, fontSize: '0.75rem' }}>
              {teamsDialogError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageTeamsOpen(false)} sx={{ fontSize: '0.75rem' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveTeams()}
            disabled={isSavingTeams}
            sx={{ fontSize: '0.75rem' }}
          >
            {isSavingTeams ? 'Saving…' : 'Save roster'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
