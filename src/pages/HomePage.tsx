import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import { useAppData } from '../context/AppContext'
import { api } from '../lib/api'
import { useOutletContext } from 'react-router-dom'
import { MatchEngagementPanel } from '../components/MatchEngagementPanel'
import { useAutoHide } from '../lib/useAutoHide'
import { getMatchRuntimeStatus } from '../lib/matchStatus'

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


const sports = ['All sports', 'Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table']
const statuses = ['Scheduled','Playing', 'Finished', ]

export function HomePage() {
  const { matches, updateMatch, removeMatch } = useAppData()
  const { loggedInTeam, loggedInAccountId, loggedInUser, loggedInRole } = useOutletContext<AuthOutletContext>()
  const canModerateMatches = ['admin', 'superadmin'].includes((loggedInRole ?? '').trim().toLowerCase())
  const [selectedSport, setSelectedSport] = useState('All sports')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [showAnnounceForm, setShowAnnounceForm] = useState(false)
  const [teamLogos, setTeamLogos] = useState<Record<string, string | undefined>>({})
  const [teamOptions, setTeamOptions] = useState<string[]>([])
  const [groundOptions, setGroundOptions] = useState<string[]>([])
  const [announceMessage, setAnnounceMessage] = useState('')
  const [engagementMessage, setEngagementMessage] = useState('')
  useAutoHide(announceMessage, () => setAnnounceMessage(''))
  useAutoHide(engagementMessage, () => setEngagementMessage(''))

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

  const handleLike = async (matchId: string): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to like matches.')
      return false
    }

    try {
      const updatedMatch = await api.likeMatch(matchId, token)
      updateMatch(updatedMatch)
      setEngagementMessage('Match liked!')
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to like match.')
      return false
    }
  }

  const handleComment = async (matchId: string, comment: string): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to comment.')
      return false
    }

    try {
      const updatedMatch = await api.commentOnMatch(matchId, comment, token)
      updateMatch(updatedMatch)
      setEngagementMessage('Comment added!')
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to add comment.')
      return false
    }
  }

  const handleCommentLike = async (matchId: string, commentId: string): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to like comments.')
      return false
    }

    try {
      const updatedMatch = await api.likeMatchComment(matchId, commentId, token)
      updateMatch(updatedMatch)
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to like comment.')
      return false
    }
  }

  const handleCommentReply = async (matchId: string, commentId: string, replyText: string): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to reply.')
      return false
    }

    try {
      const updatedMatch = await api.replyToMatchComment(matchId, commentId, replyText, token)
      updateMatch(updatedMatch)
      setEngagementMessage('Reply added!')
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to add reply.')
      return false
    }
  }

  const handleRate = async (matchId: string, rating: number): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to rate matches.')
      return false
    }

    try {
      const updatedMatch = await api.rateMatch(matchId, rating, token)
      updateMatch(updatedMatch)
      setEngagementMessage('Match rated!')
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to rate match.')
      return false
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to delete matches.')
      return
    }

    if (!window.confirm('Delete this match? This cannot be undone.')) {
      return
    }

    try {
      await api.deleteMatch(matchId, token)
      removeMatch(matchId)
      setEngagementMessage('Match deleted.')
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to delete match.')
    }
  }

  const filteredMatches = matches.filter((match) => {
    const sportMatch = selectedSport === 'All sports' || match.sport === selectedSport
    const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes, match.homeScore, match.awayScore)

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
    <Stack spacing={3.25} sx={{ width: '100%' }}>
  
      {engagementMessage && (
        <Alert severity="info" onClose={() => setEngagementMessage('')}>
          {engagementMessage}
        </Alert>
      )}

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

      <Stack
        direction="row"
        aria-label="Sport filters"
        sx={{
          width: '100%',
          position: 'relative',
          zIndex: 1,
          display: { xs: 'grid', sm: 'flex' },
          gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))' },
          columnGap: { xs: 0.7, sm: 0.9 },
          rowGap: { xs: 1.6, sm: 0.9 },
          flexWrap: 'wrap',
        }}
      >
        {sports.map((sport) => (
          <Button
            key={sport}
            type="button"
            onClick={() => setSelectedSport(sport)}
            aria-pressed={sport === selectedSport}
            variant="contained"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minWidth: 0,
              borderRadius: 999,
              px: { xs: 0.5, sm: 1.4 },
              py: 0.55,
              fontSize: { xs: '0.62rem', sm: '0.75rem' },
              cursor: 'pointer',
              color: sport === selectedSport ? '#07111f' : '#e7ebf3',
              backgroundColor: sport === selectedSport ? '#4ce3a3' : '#2d3545',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: sport === selectedSport ? '#4ce3a3' : '#3a4558',
                boxShadow: 'none',
              },
            }}
          >
            {sport}
          </Button>
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

      <Box sx={{ display: 'grid', gap: 1.2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {filteredMatches.map((match) => {
          const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes, match.homeScore, match.awayScore)
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
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                    {canModerateMatches && (
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Delete ${match.homeTeam} vs ${match.awayTeam}`}
                        onClick={() => void handleDeleteMatch(match.id)}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
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

              <MatchEngagementPanel
                match={match}
                canInteract={Boolean(loggedInUser && loggedInAccountId)}
                onLike={handleLike}
                onComment={handleComment}
                onCommentLike={handleCommentLike}
                onCommentReply={handleCommentReply}
                onRate={handleRate}
              />
            </CardContent>
          </Card>
          )
        })}
      </Box>
    </Stack>
  )
}
