import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useOutletContext } from 'react-router-dom'
import { useAppData } from '../context/AppContext'
import { api } from '../lib/api'
import type { MatchAnnouncement, TeamProfile, TournamentItem, TournamentStatus } from '../types'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInAccountId: string | null
  loggedInTeam: string | null
}

type CreateFormKey = 'match' | 'friendly' | 'team' | 'result' | 'tournament' | 'manage'

const sports: MatchAnnouncement['sport'][] = ['Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table']

const formatPeriod = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} - ${endDate}`
  }

  const formattedStart = start.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  const formattedEnd = end.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  return `${formattedStart} - ${formattedEnd}`
}

const getMatchRuntimeStatus = (kickoff: string, durationMinutes?: number): 'scheduled' | 'playing' | 'finished' => {
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

  if (now >= kickoffMs && now < matchEndMs) {
    return 'playing'
  }

  return 'finished'
}

export function TeamDashboardPage() {
  const { loggedInUser, loggedInRole, loggedInAccountId, loggedInTeam } = useOutletContext<AuthOutletContext>()
  const { team, createTeam, addResultReport, friendlies } = useAppData()

  const [myMatches, setMyMatches] = useState<MatchAnnouncement[]>([])
  const [loadingMyMatches, setLoadingMyMatches] = useState(false)

  const [teamOptions, setTeamOptions] = useState<{ name: string; logoUrl?: string }[]>([])
  const [groundOptions, setGroundOptions] = useState<string[]>([])

  const [globalMessage, setGlobalMessage] = useState('')
  const [globalError, setGlobalError] = useState('')
  const [openCreateForm, setOpenCreateForm] = useState<CreateFormKey | null>(null)

  const [awayTeam, setAwayTeam] = useState('')
  const [venue, setVenue] = useState('')
  const [kickoff, setKickoff] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(90)
  const [category, setCategory] = useState<MatchAnnouncement['category']>('League')
  const [sport, setSport] = useState<MatchAnnouncement['sport']>('Football')
  const [comment, setComment] = useState('')

  const [friendlyTeamName, setFriendlyTeamName] = useState('')
  const [friendlyContact, setFriendlyContact] = useState('')
  const [friendlyPreferredDate, setFriendlyPreferredDate] = useState('')
  const [friendlyPreferredTime, setFriendlyPreferredTime] = useState('')
  const [friendlyLocation, setFriendlyLocation] = useState('')
  const [friendlyNote, setFriendlyNote] = useState('')

  const [teamName, setTeamName] = useState(team.name)
  const [manager, setManager] = useState(team.manager)
  const [county, setCounty] = useState(team.county)
  const [homeGround, setHomeGround] = useState(team.homeGround)
  const [level, setLevel] = useState<TeamProfile['level']>(team.level)
  const [bio, setBio] = useState(team.bio)
  const [logoUrl, setLogoUrl] = useState(team.logoUrl ?? '')
  const [isDragOver, setIsDragOver] = useState(false)

  const [resultHomeTeam, setResultHomeTeam] = useState('')
  const [resultAwayTeam, setResultAwayTeam] = useState('')
  const [resultHomeScore, setResultHomeScore] = useState<number>(0)
  const [resultAwayScore, setResultAwayScore] = useState<number>(0)
  const [resultVenue, setResultVenue] = useState('')
  const [resultPlayedOn, setResultPlayedOn] = useState('')
  const [resultReportedBy, setResultReportedBy] = useState('')

  const [tournaments, setTournaments] = useState<TournamentItem[]>([])
  const [tournamentName, setTournamentName] = useState('')
  const [tournamentSport, setTournamentSport] = useState<MatchAnnouncement['sport']>('Football')
  const [tournamentFormat, setTournamentFormat] = useState('Knockout')
  const [tournamentVenue, setTournamentVenue] = useState('')
  const [tournamentStartDate, setTournamentStartDate] = useState('')
  const [tournamentEndDate, setTournamentEndDate] = useState('')
  const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>('upcoming')

  const [editingKickoffByMatchId, setEditingKickoffByMatchId] = useState<Record<string, string>>({})
  const [editingHomeScoreByMatchId, setEditingHomeScoreByMatchId] = useState<Record<string, number>>({})
  const [editingAwayScoreByMatchId, setEditingAwayScoreByMatchId] = useState<Record<string, number>>({})

  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canCreateTeam = Boolean(loggedInUser && (normalizedRole === 'tm' || normalizedRole === 'coach' || normalizedRole === 'captain'))
  const canCreateMatches = canCreateTeam

  const teamNames = useMemo(() => teamOptions.map((option) => option.name), [teamOptions])
  const engagedFriendlies = useMemo(() => {
    if (loggedInAccountId) {
      return friendlies.filter(
        (friendly) =>
          friendly.requesterAccountId === loggedInAccountId || friendly.recipientAccountId === loggedInAccountId,
      )
    }

    if (loggedInTeam) {
      return friendlies.filter(
        (friendly) =>
          friendly.requesterTeam === loggedInTeam || friendly.recipientTeam === loggedInTeam,
      )
    }

    return []
  }, [friendlies, loggedInAccountId, loggedInTeam])
  const engagedTournaments = useMemo(() => {
    if (!loggedInTeam) {
      return []
    }

    return tournaments.filter((tournament) => tournament.ownerTeam === loggedInTeam)
  }, [tournaments, loggedInTeam])
  const scheduledRuntimeMatches = useMemo(
    () => myMatches.filter((match) => getMatchRuntimeStatus(match.kickoff, match.durationMinutes) === 'scheduled'),
    [myMatches],
  )
  const playingRuntimeMatches = useMemo(
    () => myMatches.filter((match) => getMatchRuntimeStatus(match.kickoff, match.durationMinutes) === 'playing'),
    [myMatches],
  )
  const finishedRuntimeMatches = useMemo(
    () => myMatches.filter((match) => getMatchRuntimeStatus(match.kickoff, match.durationMinutes) === 'finished'),
    [myMatches],
  )

  useEffect(() => {
    setTeamName(team.name)
    setManager(team.manager)
    setCounty(team.county)
    setHomeGround(team.homeGround)
    setLevel(team.level)
    setBio(team.bio)
    setLogoUrl(team.logoUrl ?? '')
  }, [team])

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [teamResponse, groundResponse] = await Promise.all([api.getTeams(), api.getGrounds()])
        setTeamOptions(teamResponse.teams)
        setGroundOptions(groundResponse.grounds)
      } catch {
        setGlobalError('Failed to load teams and grounds from backend.')
      }
    }

    void loadOptions()
  }, [])

  const loadMyMatches = async () => {
    const token = api.getToken()
    if (!token) {
      return
    }

    setLoadingMyMatches(true)
    try {
      const matches = await api.getMyMatches(token)
      setMyMatches(matches)
      setEditingKickoffByMatchId(
        Object.fromEntries(matches.map((match) => [match.id, match.kickoff.slice(0, 16)])),
      )
      setEditingHomeScoreByMatchId(
        Object.fromEntries(matches.map((match) => [match.id, match.homeScore ?? 0])),
      )
      setEditingAwayScoreByMatchId(
        Object.fromEntries(matches.map((match) => [match.id, match.awayScore ?? 0])),
      )
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to load your matches.')
    } finally {
      setLoadingMyMatches(false)
    }
  }

  useEffect(() => {
    void loadMyMatches()
  }, [])

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const response = await api.getTournaments()
        setTournaments(response)
      } catch {
        // Keep dashboard usable even when tournaments API is unavailable.
      }
    }

    void loadTournaments()
  }, [])

  const handleCreateMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canCreateMatches) {
      setGlobalError('Only TM, Coach, or captain can create matches.')
      return
    }

    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in before creating a match.')
      return
    }

    try {
      await api.createMatch(
        {
          awayTeam,
          venue,
          kickoff: new Date(kickoff).toISOString(),
          durationMinutes,
          category,
          sport,
          comment,
        },
        token,
      )
      setAwayTeam('')
      setVenue('')
      setKickoff('')
      setDurationMinutes(90)
      setCategory('League')
      setSport('Football')
      setComment('')
      setGlobalError('')
      setGlobalMessage('Match created successfully.')
      await loadMyMatches()
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to create match.')
    }
  }

  const handleCreateFriendly = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canCreateMatches) {
      setGlobalError('Only TM, Coach, or captain can send friendly requests.')
      return
    }

    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in before sending a friendly request.')
      return
    }

    try {
      await api.createFriendlyRequest(
        {
          teamName: friendlyTeamName,
          contact: friendlyContact,
          preferredDate: friendlyPreferredDate,
          preferredTime: friendlyPreferredTime,
          location: friendlyLocation,
          note: friendlyNote,
        },
        token,
      )
      setFriendlyTeamName('')
      setFriendlyContact('')
      setFriendlyPreferredDate('')
      setFriendlyPreferredTime('')
      setFriendlyLocation('')
      setFriendlyNote('')
      setGlobalError('')
      setGlobalMessage('Friendly request sent.')
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to create friendly request.')
    }
  }

  const handleLogoFile = (file: File | null) => {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setGlobalError('Please upload an image file for the team logo.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canCreateTeam) {
      setGlobalError('Only TM, Coach, or captain can create a team.')
      return
    }

    try {
      await createTeam({
        name: teamName,
        manager,
        county,
        homeGround,
        level,
        bio,
        logoUrl: logoUrl.trim() || undefined,
      })
      setGlobalError('')
      setGlobalMessage('Team saved successfully.')
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to save team.')
    }
  }

  const handleCreateResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await addResultReport({
        homeTeam: resultHomeTeam,
        awayTeam: resultAwayTeam,
        homeScore: resultHomeScore,
        awayScore: resultAwayScore,
        venue: resultVenue,
        playedOn: resultPlayedOn,
        reportedBy: resultReportedBy,
      })
      setResultHomeTeam('')
      setResultAwayTeam('')
      setResultHomeScore(0)
      setResultAwayScore(0)
      setResultVenue('')
      setResultPlayedOn('')
      setResultReportedBy('')
      setGlobalError('')
      setGlobalMessage('Result submitted successfully.')
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to submit result.')
    }
  }

  const handleCreateTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const safeName = tournamentName.trim()
    const safeVenue = tournamentVenue.trim()

    if (!safeName || !safeVenue || !tournamentStartDate || !tournamentEndDate) {
      setGlobalError('Please complete all required tournament fields.')
      return
    }

    if (new Date(tournamentEndDate).getTime() < new Date(tournamentStartDate).getTime()) {
      setGlobalError('End date must be on or after start date.')
      return
    }

    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in before creating a tournament.')
      return
    }

    const createdTournament: TournamentItem = {
      id: `temp-${Date.now()}`,
      sport: tournamentSport,
      format: tournamentFormat.trim(),
      name: safeName,
      period: formatPeriod(tournamentStartDate, tournamentEndDate),
      venue: safeVenue,
      status: tournamentStatus,
      ownerTeam: loggedInTeam ?? '',
      registeredTeams: loggedInTeam ? [loggedInTeam] : [],
    }

    try {
      const savedTournament = await api.createTournament(
        {
          sport: createdTournament.sport,
          format: createdTournament.format,
          name: createdTournament.name,
          period: createdTournament.period,
          venue: createdTournament.venue,
          status: createdTournament.status,
          registeredTeams: createdTournament.registeredTeams,
        },
        token,
      )
      setTournaments((prev) => [savedTournament, ...prev])
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to create tournament.')
      return
    }

    setTournamentName('')
    setTournamentSport('Football')
    setTournamentFormat('Knockout')
    setTournamentVenue('')
    setTournamentStartDate('')
    setTournamentEndDate('')
    setTournamentStatus('upcoming')
    setGlobalError('')
    setGlobalMessage('Tournament created successfully.')
  }

  const handleKickoffUpdate = async (matchId: string) => {
    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in to update kickoff.')
      return
    }

    const kickoffValue = editingKickoffByMatchId[matchId]
    if (!kickoffValue) {
      setGlobalError('Kickoff is required.')
      return
    }

    try {
      await api.updateMatchKickoff(matchId, new Date(kickoffValue).toISOString(), token)
      setGlobalError('')
      setGlobalMessage('Kickoff updated.')
      await loadMyMatches()
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to update kickoff.')
    }
  }

  const handleScoreUpdate = async (matchId: string) => {
    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in to update score.')
      return
    }

    try {
      await api.updateMatchScore(
        matchId,
        editingHomeScoreByMatchId[matchId] ?? 0,
        editingAwayScoreByMatchId[matchId] ?? 0,
        token,
      )
      setGlobalError('')
      setGlobalMessage('Score updated.')
      await loadMyMatches()
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to update score.')
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in to delete a match.')
      return
    }

    try {
      await api.deleteMatch(matchId, token)
      setGlobalError('')
      setGlobalMessage('Match deleted.')
      await loadMyMatches()
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to delete match.')
    }
  }

  const toggleCreateForm = (key: CreateFormKey) => {
    if ((key === 'match' || key === 'friendly' || key === 'manage') && !canCreateMatches) {
      setGlobalError('Only TM, Coach, or captain can access match management tools.')
      return
    }

    setOpenCreateForm((prev) => (prev === key ? null : key))
  }

  const renderManagedMatchCard = (match: MatchAnnouncement) => {
    const kickoffTime = new Date(match.kickoff)
    const hasStarted = Number.isFinite(kickoffTime.getTime()) && kickoffTime.getTime() <= Date.now()
    const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes)

    return (
      <Card key={match.id} variant="outlined">
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {match.homeTeam} vs {match.awayTeam}
            </Typography>
            {match.homeScore !== undefined && match.awayScore !== undefined && (
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {match.homeScore} - {match.awayScore}
              </Typography>
            )}
            <Chip
              label={runtimeStatus}
              size="small"
              color={runtimeStatus === 'finished' ? 'primary' : 'default'}
              sx={runtimeStatus === 'finished' ? { color: '#07111f' } : undefined}
            />
          </Stack>
          <Typography color="text.secondary" sx={{ mb: 1.25 }}>
            {new Date(match.kickoff).toLocaleString()} · {match.venue}
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mb: 1.25 }}>
            <TextField
              label="Kickoff"
              type="datetime-local"
              value={editingKickoffByMatchId[match.id] ?? ''}
              onChange={(event) =>
                setEditingKickoffByMatchId((prev) => ({
                  ...prev,
                  [match.id]: event.target.value,
                }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <Button variant="outlined" onClick={() => void handleKickoffUpdate(match.id)}>
              Update kickoff
            </Button>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mb: 1.25 }}>
            <TextField
              label="Home"
              type="number"
              value={editingHomeScoreByMatchId[match.id] ?? 0}
              onChange={(event) =>
                setEditingHomeScoreByMatchId((prev) => ({
                  ...prev,
                  [match.id]: Number(event.target.value),
                }))
              }
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Away"
              type="number"
              value={editingAwayScoreByMatchId[match.id] ?? 0}
              onChange={(event) =>
                setEditingAwayScoreByMatchId((prev) => ({
                  ...prev,
                  [match.id]: Number(event.target.value),
                }))
              }
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <Button variant="outlined" onClick={() => void handleScoreUpdate(match.id)} disabled={!hasStarted}>
              Update score
            </Button>
          </Stack>

          {!hasStarted && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              Scores can only be updated when the match has started.
            </Typography>
          )}

          <Button color="error" variant="outlined" onClick={() => void handleDeleteMatch(match.id)}>
            Delete match
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={3}>
    

      {!loggedInUser && <Alert severity="info">Log in to use dashboard creation tools.</Alert>}

      {loggedInUser && (
        <Alert severity="success">
          Signed in as {loggedInUser}
          {loggedInTeam ? ` · ${loggedInTeam}` : ''}
          {loggedInRole ? ` · ${loggedInRole}` : ''}
        </Alert>
      )}

      {globalError && <Alert severity="error">{globalError}</Alert>}
      {globalMessage && <Alert severity="success">{globalMessage}</Alert>}

      {openCreateForm === null ? (
        <Card
          variant="outlined"
          sx={{
            position: 'sticky',
            top: 12,
            zIndex: 5,
            backdropFilter: 'blur(6px)',
            bgcolor: 'rgba(16, 24, 40, 0.8)',
          }}
        >
          <CardContent>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              sx={{ alignItems: { xs: 'stretch', md: 'center' }, flexWrap: 'wrap' }}
            >
              {canCreateMatches && (
                <Button variant="contained" onClick={() => toggleCreateForm('match')}>
                  Create Match
                </Button>
              )}
              {canCreateMatches && (
                <Button variant="contained" onClick={() => toggleCreateForm('friendly')}>
                  Request Friendly
                </Button>
              )}
              <Button variant="contained" onClick={() => toggleCreateForm('team')}>
                Create or Update Team
              </Button>
              <Button variant="contained" onClick={() => toggleCreateForm('result')}>
                Submit Result
              </Button>
              <Button variant="contained" onClick={() => toggleCreateForm('tournament')}>
                Create Tournament
              </Button>
              {canCreateMatches && (
                <Button variant="contained" onClick={() => toggleCreateForm('manage')}>
                  Manage My Matches
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Card variant="outlined" sx={{ width: '100%', maxWidth: 620 }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {openCreateForm === 'match' && 'Create Match'}
                  {openCreateForm === 'friendly' && 'Request Friendly'}
                  {openCreateForm === 'team' && 'Create or Update Team'}
                  {openCreateForm === 'result' && 'Submit Result'}
                  {openCreateForm === 'tournament' && 'Create Tournament'}
                  {openCreateForm === 'manage' && 'Manage My Matches'}
                </Typography>
                <Button variant="outlined" onClick={() => setOpenCreateForm(null)}>
                  Back to all forms
                </Button>
              </Stack>

              {openCreateForm === 'match' && (
                <Box component="form" onSubmit={handleCreateMatch} sx={{ display: 'grid', gap: 1.25 }}>
                  <TextField
                    select
                    label="Away team"
                    value={awayTeam}
                    onChange={(event) => setAwayTeam(event.target.value)}
                    required
                  >
                    {teamOptions
                      .filter((option) => option.name !== loggedInTeam)
                      .map((option) => (
                        <MenuItem key={option.name} value={option.name}>
                          {option.name}
                        </MenuItem>
                      ))}
                  </TextField>
                  <TextField
                    select
                    label="Venue"
                    value={venue}
                    onChange={(event) => setVenue(event.target.value)}
                    required
                  >
                    {groundOptions.map((groundOption) => (
                      <MenuItem key={groundOption} value={groundOption}>
                        {groundOption}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Kickoff"
                    type="datetime-local"
                    value={kickoff}
                    onChange={(event) => setKickoff(event.target.value)}
                    required
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="Duration (minutes)"
                    type="number"
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(Number(event.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                    required
                  />
                  <TextField select label="Category" value={category} onChange={(event) => setCategory(event.target.value as MatchAnnouncement['category'])} required>
                    <MenuItem value="League">League</MenuItem>
                    <MenuItem value="Friendly">Friendly</MenuItem>
                    <MenuItem value="Cup">Cup</MenuItem>
                  </TextField>
                  <TextField select label="Sport" value={sport} onChange={(event) => setSport(event.target.value as MatchAnnouncement['sport'])} required>
                    {sports.map((sportItem) => (
                      <MenuItem key={sportItem} value={sportItem}>
                        {sportItem}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    multiline
                    rows={2}
                  />
                  <Button type="submit" variant="contained" disabled={!loggedInUser}>
                    Create match
                  </Button>
                </Box>
              )}

              {openCreateForm === 'friendly' && (
                <Box component="form" onSubmit={handleCreateFriendly} sx={{ display: 'grid', gap: 1.25 }}>
                  <TextField
                    select
                    label="Team"
                    value={friendlyTeamName}
                    onChange={(event) => setFriendlyTeamName(event.target.value)}
                    required
                  >
                    {teamOptions
                      .filter((option) => option.name !== loggedInTeam)
                      .map((option) => (
                        <MenuItem key={option.name} value={option.name}>
                          {option.name}
                        </MenuItem>
                      ))}
                  </TextField>
                  <TextField
                    label="Contact"
                    value={friendlyContact}
                    onChange={(event) => setFriendlyContact(event.target.value)}
                    placeholder="Phone / Email"
                    required
                  />
                  <TextField
                    label="Preferred date"
                    type="date"
                    value={friendlyPreferredDate}
                    onChange={(event) => setFriendlyPreferredDate(event.target.value)}
                    required
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="Preferred time"
                    type="time"
                    value={friendlyPreferredTime}
                    onChange={(event) => setFriendlyPreferredTime(event.target.value)}
                    required
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    select
                    label="Ground"
                    value={friendlyLocation}
                    onChange={(event) => setFriendlyLocation(event.target.value)}
                    required
                  >
                    {groundOptions.map((groundOption) => (
                      <MenuItem key={groundOption} value={groundOption}>
                        {groundOption}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Note"
                    value={friendlyNote}
                    onChange={(event) => setFriendlyNote(event.target.value)}
                    multiline
                    rows={2}
                    required
                  />
                  <Button type="submit" variant="contained" disabled={!loggedInUser}>
                    Send request
                  </Button>
                </Box>
              )}

              {openCreateForm === 'team' && (
                <>
                  {!canCreateTeam && (
                    <Alert severity="info" sx={{ mb: 1.5 }}>
                      Only TM, Coach, or captain can create a team.
                    </Alert>
                  )}
                  <Box component="form" onSubmit={handleSaveTeam} sx={{ display: 'grid', gap: 1.25 }}>
                    <TextField label="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
                    <TextField label="Manager" value={manager} onChange={(event) => setManager(event.target.value)} required />
                    <TextField label="County" value={county} onChange={(event) => setCounty(event.target.value)} required />
                    <TextField label="Home ground" value={homeGround} onChange={(event) => setHomeGround(event.target.value)} required />
                    <TextField select label="Level" value={level} onChange={(event) => setLevel(event.target.value as TeamProfile['level'])} required>
                      <MenuItem value="Junior">Junior</MenuItem>
                      <MenuItem value="Amateur">Amateur</MenuItem>
                      <MenuItem value="Semi-Pro">Semi-Pro</MenuItem>
                    </TextField>
                    <TextField
                      label="Team logo file (optional)"
                      type="file"
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { accept: 'image/*' } }}
                      onChange={(event) => {
                        const input = event.target as HTMLInputElement
                        handleLogoFile(input.files?.[0] ?? null)
                      }}
                      helperText="Upload an image to use as the team logo."
                    />
                    <Box
                      onDragOver={(event) => {
                        event.preventDefault()
                        setIsDragOver(true)
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(event) => {
                        event.preventDefault()
                        setIsDragOver(false)
                        handleLogoFile(event.dataTransfer.files[0] ?? null)
                      }}
                      sx={{
                        border: '1px dashed',
                        borderColor: isDragOver ? 'primary.main' : 'rgba(159,176,201,0.38)',
                        borderRadius: 2,
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDragOver ? 'rgba(76,227,163,0.08)' : 'transparent',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Or drag and drop the logo image here
                      </Typography>
                    </Box>
                    <TextField
                      label="Team logo URL (optional)"
                      type="url"
                      value={logoUrl}
                      onChange={(event) => setLogoUrl(event.target.value)}
                    />
                    <TextField label="Bio" value={bio} onChange={(event) => setBio(event.target.value)} multiline rows={3} required />
                    <Button type="submit" variant="contained" disabled={!canCreateTeam}>
                      Save team
                    </Button>
                  </Box>
                </>
              )}

              {openCreateForm === 'result' && (
                <Box component="form" onSubmit={handleCreateResult} sx={{ display: 'grid', gap: 1.25 }}>
                  <TextField select label="Home team" value={resultHomeTeam} onChange={(event) => setResultHomeTeam(event.target.value)} required>
                    {teamNames.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField select label="Away team" value={resultAwayTeam} onChange={(event) => setResultAwayTeam(event.target.value)} required>
                    {teamNames.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Stack direction="row" spacing={1.25}>
                    <TextField label="Home score" type="number" value={resultHomeScore} onChange={(event) => setResultHomeScore(Number(event.target.value))} slotProps={{ htmlInput: { min: 0 } }} required fullWidth />
                    <TextField label="Away score" type="number" value={resultAwayScore} onChange={(event) => setResultAwayScore(Number(event.target.value))} slotProps={{ htmlInput: { min: 0 } }} required fullWidth />
                  </Stack>
                  <TextField label="Venue" value={resultVenue} onChange={(event) => setResultVenue(event.target.value)} required />
                  <TextField label="Played on" type="date" value={resultPlayedOn} onChange={(event) => setResultPlayedOn(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
                  <TextField label="Reported by" value={resultReportedBy} onChange={(event) => setResultReportedBy(event.target.value)} required />
                  <Button type="submit" variant="contained">
                    Submit result
                  </Button>
                </Box>
              )}

              {openCreateForm === 'tournament' && (
                <>
                  <Box component="form" onSubmit={handleCreateTournament} sx={{ display: 'grid', gap: 1.25 }}>
                    <TextField label="Tournament name" value={tournamentName} onChange={(event) => setTournamentName(event.target.value)} required />
                    <TextField select label="Sport" value={tournamentSport} onChange={(event) => setTournamentSport(event.target.value as MatchAnnouncement['sport'])} required>
                      {sports.map((sportItem) => (
                        <MenuItem key={sportItem} value={sportItem}>
                          {sportItem}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField select label="Format" value={tournamentFormat} onChange={(event) => setTournamentFormat(event.target.value)} required>
                      {['Knockout', 'League', 'Group+Knockout', 'Round Robin'].map((formatItem) => (
                        <MenuItem key={formatItem} value={formatItem}>
                          {formatItem}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField label="Venue" value={tournamentVenue} onChange={(event) => setTournamentVenue(event.target.value)} required />
                    <Stack direction="row" spacing={1.25}>
                      <TextField
                        label="Start date"
                        type="date"
                        value={tournamentStartDate}
                        onChange={(event) => setTournamentStartDate(event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        required
                        fullWidth
                      />
                      <TextField
                        label="End date"
                        type="date"
                        value={tournamentEndDate}
                        onChange={(event) => setTournamentEndDate(event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        required
                        fullWidth
                      />
                    </Stack>
                    <TextField select label="Status" value={tournamentStatus} onChange={(event) => setTournamentStatus(event.target.value as TournamentStatus)} required>
                      <MenuItem value="upcoming">upcoming</MenuItem>
                      <MenuItem value="registration open">registration open</MenuItem>
                      <MenuItem value="ongoing">ongoing</MenuItem>
                    </TextField>
                    <Button type="submit" variant="contained">
                      Create tournament
                    </Button>
                  </Box>

                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {tournaments.slice(0, 3).map((item) => (
                      <Stack key={item.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">
                          {item.name} · {item.period}
                        </Typography>
                        <Chip label={item.status} size="small" />
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}

              {openCreateForm === 'manage' && (
                <>
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'center', mb: 1.5 }}>
                    <Button variant="outlined" onClick={() => void loadMyMatches()} disabled={loadingMyMatches || !loggedInAccountId}>
                      Refresh
                    </Button>
                  </Stack>

                  {!loggedInAccountId && (
                    <Typography color="text.secondary">Log in to manage your team matches.</Typography>
                  )}

                  {loggedInAccountId && myMatches.length === 0 && !loadingMyMatches && (
                    <Typography color="text.secondary">No matches found for your team.</Typography>
                  )}

                  <Stack spacing={1.25} sx={{ mb: 2.25 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                      SCHEDULED MATCHES
                    </Typography>
                    {scheduledRuntimeMatches.length === 0 ? (
                      <Typography color="text.secondary">No scheduled matches right now.</Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {scheduledRuntimeMatches.map((match) => renderManagedMatchCard(match))}
                      </Stack>
                    )}
                  </Stack>

                  <Stack spacing={1.25} sx={{ mb: 2.25 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                      PLAYING NOW
                    </Typography>
                    {playingRuntimeMatches.length === 0 ? (
                      <Typography color="text.secondary">No matches playing right now.</Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {playingRuntimeMatches.map((match) => renderManagedMatchCard(match))}
                      </Stack>
                    )}
                  </Stack>

                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                      FINISHED MATCHES
                    </Typography>
                    {finishedRuntimeMatches.length === 0 ? (
                      <Typography color="text.secondary">No finished matches yet.</Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {finishedRuntimeMatches.map((match) => renderManagedMatchCard(match))}
                      </Stack>
                    )}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Activity Hub
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Follow active friendlies and tournaments your team is engaging in.
          </Typography>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25 }}>
                  Friendlies We Have
                </Typography>
                <Stack spacing={1.1}>
                  {engagedFriendlies.length === 0 && (
                    <Typography color="text.secondary">No friendlies for your team yet.</Typography>
                  )}
                  {engagedFriendlies.slice(0, 6).map((friendly) => (
                    <Card key={friendly.id} variant="outlined">
                      <CardContent sx={{ py: 1.25 }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {friendly.requesterTeam} vs {friendly.recipientTeam}
                          </Typography>
                          <Chip label={friendly.status} size="small" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {friendly.preferredDate} at {friendly.preferredTime} · {friendly.location}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25 }}>
                  Tournaments We Have
                </Typography>
                <Stack spacing={1.1}>
                  {engagedTournaments.length === 0 && (
                    <Typography color="text.secondary">No tournaments for your team yet.</Typography>
                  )}
                  {engagedTournaments.slice(0, 6).map((item) => (
                    <Card key={item.id} variant="outlined">
                      <CardContent sx={{ py: 1.25 }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.name}
                          </Typography>
                          <Chip label={item.status} size="small" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {item.sport} · {item.format}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.period} · {item.venue}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </CardContent>
      </Card>

    </Stack>
  )
}
