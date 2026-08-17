import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useOutletContext } from 'react-router-dom'
import { api } from '../lib/api'
import type { TournamentItem, TournamentStatus } from '../types'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInTeam: string | null
}

const sports = ['All sports', 'Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table']

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

export function TournamentsPage() {
  const { loggedInUser, loggedInRole, loggedInTeam } = useOutletContext<AuthOutletContext>()
  const [selectedSport, setSelectedSport] = useState('All sports')
  const [showNewForm, setShowNewForm] = useState(false)
  const [tournaments, setTournaments] = useState<TournamentItem[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(false)

  const [name, setName] = useState('')
  const [sport, setSport] = useState('Football')
  const [format, setFormat] = useState('Knockout')
  const [venue, setVenue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<TournamentStatus>('upcoming')
  const canCreateHere = false
  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canRegisterTeam = Boolean(
    loggedInUser &&
      loggedInTeam &&
      (normalizedRole === 'captain' || normalizedRole === 'tm' || normalizedRole === 'coach'),
  )

  const filteredTournaments = tournaments.filter((t) => selectedSport === 'All sports' || t.sport === selectedSport)
  const selectedTournament = selectedTournamentId
    ? tournaments.find((item) => item.id === selectedTournamentId) ?? null
    : null
  const selectedTournamentTeams = selectedTournament?.registeredTeams ?? []

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

  useEffect(() => {
    void loadTournaments()
  }, [])

  const handleCreateTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const safeName = name.trim()
    const safeVenue = venue.trim()
    if (!safeName || !safeVenue || !startDate || !endDate) {
      setMessage('Please complete all required tournament fields.')
      return
    }

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setMessage('End date must be on or after start date.')
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
          period: formatPeriod(startDate, endDate),
          venue: safeVenue,
          status,
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
    setStartDate('')
    setEndDate('')
    setStatus('upcoming')
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
                label="Start date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label="End date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
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

      <Stack direction="row" spacing={1} aria-label="Sport filters" sx={{ flexWrap: 'wrap' }}>
        {sports.map((sport) => (
          <Chip
            key={sport}
            label={sport}
            clickable
            color={sport === selectedSport ? 'primary' : 'default'}
            onClick={() => setSelectedSport(sport)}
            sx={sport === selectedSport ? { color: '#07111f', fontWeight: 700 } : undefined}
          />
        ))}
      </Stack>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {isLoadingTournaments && (
          <Typography color="text.secondary">Loading tournaments...</Typography>
        )}
        {filteredTournaments.length === 0 && (
          <Typography color="text.secondary">No tournaments yet. Created tournaments will appear here.</Typography>
        )}
        {filteredTournaments.map((item) => (
          <Card
            variant="outlined"
            key={item.id}
            onClick={() => setSelectedTournamentId(item.id)}
            sx={{ cursor: 'pointer' }}
          >
            <CardContent>
              <Stack direction="row" sx={{ mb: 1.2, justifyContent: 'space-between' }}>
                <Chip
                  label={`${item.sport} · ${item.format}`}
                  size="small"
                />
                <Chip label={item.status} size="small" />
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {item.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {item.sport} · {item.format}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.period} · {item.venue}
              </Typography>
              <Typography variant="body2" color="primary" sx={{ mt: 1.25, fontWeight: 600 }}>
                View registered teams
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog
        open={Boolean(selectedTournament)}
        onClose={() => setSelectedTournamentId(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedTournament?.name ?? 'Tournament'} teams
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Registered teams for this tournament.
          </Typography>

          {loggedInTeam && selectedTournamentTeams.includes(loggedInTeam) && (
            <Alert severity="success" sx={{ mb: 1.25 }}>
              {loggedInTeam} is already registered.
            </Alert>
          )}

          {selectedTournamentTeams.length === 0 ? (
            <Typography color="text.secondary">No teams have registered yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {selectedTournamentTeams.map((teamName) => (
                <Card key={teamName} variant="outlined">
                  <CardContent sx={{ py: 1.2, '&:last-child': { pb: 1.2 } }}>
                    <Typography sx={{ fontWeight: 600 }}>{teamName}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => void handleRegisterTeam()}
            disabled={!canRegisterTeam || !loggedInTeam || selectedTournamentTeams.includes(loggedInTeam)}
          >
            Register My Team
          </Button>
          <Button onClick={() => setSelectedTournamentId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
