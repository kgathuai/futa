import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material'
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined'
import { useAppData } from '../context/AppContext'
import { api } from '../lib/api'
import { useOutletContext } from 'react-router-dom'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInAccountId: string | null
  loggedInTeam: string | null
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

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

const sports = ['All sports', 'Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table']
const statuses = ['All', 'Scheduled', 'Finished', 'League', 'Cup', 'Friendly', 'Tournament']

export function HomePage() {
  const { matches } = useAppData()
  const { loggedInTeam } = useOutletContext<AuthOutletContext>()
  const [selectedSport, setSelectedSport] = useState('All sports')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [showAnnounceForm, setShowAnnounceForm] = useState(false)
  const [teamLogos, setTeamLogos] = useState<Record<string, string | undefined>>({})
  const [teamOptions, setTeamOptions] = useState<string[]>([])
  const [groundOptions, setGroundOptions] = useState<string[]>([])
  const [announceMessage, setAnnounceMessage] = useState('')

  const [awayTeam, setAwayTeam] = useState('')
  const [venue, setVenue] = useState('')
  const [kickoff, setKickoff] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('90')
  const [category, setCategory] = useState<'League' | 'Friendly' | 'Cup'>('Friendly')
  const [sport, setSport] = useState<'Football' | 'Handball' | 'Volleyball' | 'Basketball' | 'Rugby' | 'Tennis' | 'Pool Table'>('Football')
  const [comment, setComment] = useState('')
  const canCreateHere = false

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await api.getTeams()
        const nextLogos: Record<string, string | undefined> = {}
        for (const team of response.teams) {
          nextLogos[team.name] = team.logoUrl
        }
        setTeamLogos(nextLogos)
        setTeamOptions(response.teams.map((team) => team.name))
      } catch {
        setTeamLogos({})
        setTeamOptions([])
      }
    }

    const loadGrounds = async () => {
      try {
        const response = await api.getGrounds()
        setGroundOptions(response.grounds)
      } catch {
        setGroundOptions([])
      }
    }

    void loadTeams()
    void loadGrounds()
  }, [])

  const getTeamLogo = useMemo(() => {
    return (teamName: string) => teamLogos[teamName]
  }, [teamLogos])

  const filteredMatches = matches.filter((match) => {
    const sportMatch = selectedSport === 'All sports' || match.sport === selectedSport
    const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes)

    if (selectedStatus === 'All') {
      return sportMatch
    }

    if (selectedStatus === 'Scheduled') {
      return sportMatch && runtimeStatus === 'scheduled'
    }

    if (selectedStatus === 'Finished') {
      return sportMatch && runtimeStatus === 'finished'
    }

    if (selectedStatus === 'Tournament') {
      return false
    }

    return sportMatch && match.category === selectedStatus
  })

  return (
    <Stack spacing={3.25} sx={{ maxWidth: 920 }}>
  
      {canCreateHere && showAnnounceForm && (
        <Card variant="outlined">
          <CardContent>
            <Box
              component="form"
              sx={{ display: 'grid', gap: 1.5 }}
              onSubmit={async (event) => {
                event.preventDefault()
                const token = api.getToken()
                if (!token) {
                  setAnnounceMessage('Please log in first.')
                  return
                }

                if (!loggedInTeam) {
                  setAnnounceMessage('Your account has no team set.')
                  return
                }

                const parsedDuration = Number(durationMinutes)
                if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
                  setAnnounceMessage('Enter a valid match duration in minutes.')
                  return
                }

                try {
                  await api.createMatch(
                    {
                      awayTeam,
                      venue,
                      kickoff: new Date(kickoff).toISOString(),
                      durationMinutes: parsedDuration,
                      category,
                      sport,
                      comment: comment.trim() || undefined,
                    },
                    token,
                  )

                  setAwayTeam('')
                  setVenue('')
                  setKickoff('')
                  setDurationMinutes('90')
                  setCategory('Friendly')
                  setSport('Football')
                  setComment('')
                  setAnnounceMessage('Match created successfully.')
                  window.location.reload()
                } catch (error) {
                  setAnnounceMessage(error instanceof Error ? error.message : 'Failed to create match.')
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Announce a new match
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Home team: {loggedInTeam || 'Not set'}
              </Typography>

              <TextField
                select
                label="Away team"
                value={awayTeam}
                onChange={(event) => setAwayTeam(event.target.value)}
                required
              >
                {teamOptions
                  .filter((teamOption) => teamOption !== loggedInTeam)
                  .map((teamOption) => (
                    <MenuItem key={teamOption} value={teamOption}>
                      {teamOption}
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
                {groundOptions.map((ground) => (
                  <MenuItem key={ground} value={ground}>
                    {ground}
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
                label="Match duration (minutes)"
                type="number"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                required
                slotProps={{ htmlInput: { min: 1 } }}
              />

              <TextField select label="Category" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} required>
                <MenuItem value="League">League</MenuItem>
                <MenuItem value="Friendly">Friendly</MenuItem>
                <MenuItem value="Cup">Cup</MenuItem>
              </TextField>

              <TextField select label="Sport" value={sport} onChange={(event) => setSport(event.target.value as typeof sport)} required>
                <MenuItem value="Football">Football</MenuItem>
                <MenuItem value="Handball">Handball</MenuItem>
                <MenuItem value="Volleyball">Volleyball</MenuItem>
                <MenuItem value="Basketball">Basketball</MenuItem>
                <MenuItem value="Rugby">Rugby</MenuItem>
                <MenuItem value="Tennis">Tennis</MenuItem>
                <MenuItem value="Pool Table">Pool Table</MenuItem>
              </TextField>

              <TextField
                label="Comment (optional)"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                multiline
                rows={2}
              />

              {announceMessage && <Alert severity="info">{announceMessage}</Alert>}

              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  Create Match
                </Button>
                <Button variant="outlined" onClick={() => setShowAnnounceForm(false)}>
                  Close
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      <Stack direction="row" spacing={0.9} aria-label="Sport filters" sx={{ flexWrap: 'wrap' }}>
        {sports.map((sport) => (
          <Chip
            key={sport}
            label={sport}
            clickable
            size="small"
            color={sport === selectedSport ? 'primary' : 'default'}
            onClick={() => setSelectedSport(sport)}
            sx={
              sport === selectedSport
                ? { color: '#07111f', fontWeight: 700, px: 0.2 }
                : { borderColor: 'rgba(159,176,201,0.2)', color: 'text.secondary', px: 0.2 }
            }
            variant={sport === selectedSport ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={0.9} aria-label="Match filters" sx={{ flexWrap: 'wrap' }}>
        {statuses.map((status) => (
          <Chip
            key={status}
            label={status}
            clickable
            size="small"
            color={status === selectedStatus ? 'primary' : 'default'}
            onClick={() => setSelectedStatus(status)}
            sx={
              status === selectedStatus
                ? { color: '#07111f', fontWeight: 700, px: 0.2 }
                : { borderColor: 'rgba(159,176,201,0.2)', color: 'text.secondary', px: 0.2 }
            }
            variant={status === selectedStatus ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      <Box sx={{ display: 'grid', gap: 1.8, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {filteredMatches.map((match) => {
          const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes)
          const firstCommentText = match.comments.find((entry) => entry.text.trim().length > 0)?.text
          return (
            <Card key={match.id} variant="outlined" sx={{ borderRadius: 2.3 }}>
              <CardContent sx={{ p: 2.3, '&:last-child': { pb: 2.3 } }}>
                <Stack direction="row" sx={{ mb: 1.5, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography
                    variant="overline"
                    sx={{ color: '#50607b', letterSpacing: '0.13em', fontWeight: 700 }}
                  >
                    {match.sport} · {match.category}
                  </Typography>
                  <Chip
                    label={runtimeStatus}
                    size="small"
                    color={runtimeStatus === 'finished' ? 'primary' : 'default'}
                    sx={
                      runtimeStatus === 'finished'
                        ? { color: '#07111f', fontWeight: 700 }
                        : { bgcolor: 'rgba(159,176,201,0.12)', color: '#aeb8ca' }
                    }
                  />
                </Stack>

                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                    {getTeamLogo(match.homeTeam) ? (
                      <Box
                        component="img"
                        src={getTeamLogo(match.homeTeam)}
                        alt={`${match.homeTeam} logo`}
                        sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(159,176,201,0.28)' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(76,227,163,0.12)',
                        color: 'primary.main',
                        fontSize: 14,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {match.homeTeam.charAt(0).toUpperCase()}
                    </Box>
                  )}
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.08rem' }}>
                    {match.homeTeam}
                  </Typography>
                </Stack>
                <Typography sx={{ color: 'primary.main', fontWeight: 800, fontSize: '1.8rem', px: 1.2 }}>
                  {runtimeStatus === 'finished' ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : 'vs'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.08rem', textAlign: 'right' }}>
                    {match.awayTeam}
                  </Typography>
                  {getTeamLogo(match.awayTeam) ? (
                    <Box
                      component="img"
                      src={getTeamLogo(match.awayTeam)}
                      alt={`${match.awayTeam} logo`}
                      sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(159,176,201,0.28)' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(76,227,163,0.12)',
                        color: 'primary.main',
                        fontSize: 14,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {match.awayTeam.charAt(0).toUpperCase()}
                    </Box>
                  )}
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1.2} sx={{ mt: 1.2, color: '#7f8da4', alignItems: 'center' }}>
                <Typography variant="body2">{formatDateTime(match.kickoff)}</Typography>
                <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
                  <FmdGoodOutlinedIcon sx={{ fontSize: 14 }} />
                  <Typography variant="body2">{match.venue}</Typography>
                </Stack>
                {match.durationMinutes ? (
                  <Typography variant="body2">• {match.durationMinutes} min</Typography>
                ) : null}
              </Stack>

              {firstCommentText ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.9 }}>
                  {firstCommentText}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={2.2} sx={{ mt: 1.2, color: 'text.secondary' }}>
                <Typography variant="body2">👍 {match.engagement.likes} likes</Typography>
                <Typography variant="body2">💬 {match.engagement.comments} comments</Typography>
                <Typography variant="body2">
                  ⭐ {match.engagement.rating.toFixed(1)} ({match.engagement.ratingCount})
                </Typography>
              </Stack>
            </CardContent>
          </Card>
          )
        })}
      </Box>
    </Stack>
  )
}
