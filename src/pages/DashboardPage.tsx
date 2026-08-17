import { useState } from 'react'
import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { useAppData } from '../context/AppContext'

const formatKickoff = (value: string) =>
  new Date(value).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatPlayedOn = (value: string) =>
  new Date(value).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

const getMatchRuntimeStatus = (kickoff: string, durationMinutes?: number): 'scheduled' | 'playing' | 'finished' => {
  const kickoffTime = new Date(kickoff)
  if (!Number.isFinite(kickoffTime.getTime())) {
    return 'scheduled'
  }

  const now = Date.now()
  const kickoffMs = kickoffTime.getTime()
  const durationMs = (durationMinutes ?? 90) * 60 * 1000
  const endMs = kickoffMs + durationMs

  if (now < kickoffMs) {
    return 'scheduled'
  }

  if (now < endMs) {
    return 'playing'
  }

  return 'finished'
}

const getLiveClockLabel = (kickoff: string, status: 'scheduled' | 'playing' | 'finished') => {
  if (status === 'finished') {
    return 'FT'
  }

  if (status === 'scheduled') {
    return 'NS'
  }

  const kickoffTime = new Date(kickoff)
  if (!Number.isFinite(kickoffTime.getTime())) {
    return "0'"
  }

  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - kickoffTime.getTime()) / 60000))
  return `${elapsedMinutes}'`
}

const sports = ['All sports', 'Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table']
const nextUpStateFilters: Array<'scheduled' | 'playing' | 'finished'> = ['scheduled', 'playing', 'finished']

export function DashboardPage() {
  const { matches, friendlies, results } = useAppData()
  const [selectedSport, setSelectedSport] = useState('All sports')
  const [selectedNextUpState, setSelectedNextUpState] = useState<'scheduled' | 'playing' | 'finished'>('scheduled')

  const featuredMatches = matches
    .filter((m) => selectedSport === 'All sports' || m.sport === selectedSport)
    .filter((m) => getMatchRuntimeStatus(m.kickoff, m.durationMinutes) === selectedNextUpState)
    .slice(0, selectedNextUpState === 'playing' ? 4 : 3)
  const featuredResults = results.slice(0, 2)

  return (
    <Stack spacing={3}>
      <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(159,176,201,0.18)' }}>
        <CardContent>
          {/* <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.14em' }}>
            sport guru
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
            Everything happening in and around sport this week.
          </Typography> */}
          <Stack direction="row" spacing={1} aria-label="Sport filters" sx={{ mb: 2, flexWrap: 'wrap' }}>
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
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {matches.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upcoming
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {results.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Results in
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {friendlies.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Open friendlies
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </CardContent>
      </Card>

    

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} aria-label="Next up state filters">
        {nextUpStateFilters.map((state) => (
          <Chip
            key={state}
            label={state}
            clickable
            size="small"
            color={state === selectedNextUpState ? 'primary' : 'default'}
            onClick={() => setSelectedNextUpState(state)}
            sx={state === selectedNextUpState ? { color: '#07111f', fontWeight: 700 } : undefined}
          />
        ))}
      </Stack>

      {selectedNextUpState === 'playing' ? (
        <Card
          variant="outlined"
          sx={{
            bgcolor: 'rgba(18, 24, 39, 0.9)',
            borderColor: 'rgba(118, 128, 150, 0.3)',
            borderRadius: 4,
            backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 40%)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: '0.14em', fontWeight: 700, display: 'block', mb: 1.2 }}
            >
              Multi-match view
            </Typography>

            {featuredMatches.length === 0 ? (
              <Typography color="text.secondary">No playing matches for this sport right now.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {featuredMatches.map((match) => {
                  const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes)
                  const clockLabel = getLiveClockLabel(match.kickoff, runtimeStatus)

                  return (
                    <Box
                      key={match.id}
                      sx={{
                        px: { xs: 1.4, md: 2 },
                        py: 1.5,
                        borderRadius: 2.5,
                        border: '1px solid rgba(130, 144, 171, 0.22)',
                        bgcolor: 'rgba(25, 31, 47, 0.65)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 64 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: runtimeStatus === 'finished' ? 'rgba(150,159,176,0.6)' : '#C7FF1B',
                            boxShadow:
                              runtimeStatus === 'finished' ? 'none' : '0 0 10px rgba(199,255,27,0.65)',
                          }}
                        />
                        <Typography variant="h6" sx={{ fontSize: '1.05rem', color: '#9ea8bd', fontWeight: 500 }}>
                          {clockLabel}
                        </Typography>
                      </Stack>

                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 800,
                          letterSpacing: '0.03em',
                          color: '#E8EDF7',
                          textAlign: 'center',
                          flexGrow: 1,
                        }}
                      >
                        {match.homeTeam.slice(0, 3).toUpperCase()}&nbsp;&nbsp;{match.homeScore ?? 0} - {match.awayScore ?? 0}&nbsp;&nbsp;
                        {match.awayTeam.slice(0, 3).toUpperCase()}
                      </Typography>

                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          bgcolor: 'rgba(255,255,255,0.06)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#7f8aa4',
                          flexShrink: 0,
                        }}
                      >
                        <ChevronRightRoundedIcon />
                      </Box>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {featuredMatches.length === 0 && (
            <Typography color="text.secondary">No {selectedNextUpState} matches for this sport right now.</Typography>
          )}
          {featuredMatches.map((match) => {
            const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes)

            return (
              <Card key={match.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" sx={{ mb: 1.2, justifyContent: 'space-between' }}>
                    <Chip label={match.category} size="small" />
                    <Chip
                      label={runtimeStatus}
                      size="small"
                      color={runtimeStatus === 'finished' ? 'primary' : 'default'}
                      sx={runtimeStatus === 'finished' ? { color: '#07111f' } : undefined}
                    />
                  </Stack>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {match.homeTeam} vs {match.awayTeam}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
                    {formatKickoff(match.kickoff)} · {match.venue}
                  </Typography>
                  <Stack spacing={0.5}>
                    {match.comments.map((comment) => (
                      <Typography key={comment} variant="body2" color="text.secondary">
                        {comment}
                      </Typography>
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 1.2, color: 'text.secondary', flexWrap: 'wrap' }}>
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
      )}

      <Divider />

      <Box>
        <Typography variant="overline" color="text.secondary">
          Latest results
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Recently reported scores
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {featuredResults.map((result) => (
          <Card key={result.id} variant="outlined">
            <CardContent>
              <Stack direction="row" sx={{ mb: 1.2, justifyContent: 'space-between' }}>
                <Chip label="League" size="small" />
                <Chip label="finished" size="small" color="primary" sx={{ color: '#07111f' }} />
              </Stack>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {result.homeTeam} {result.homeScore} - {result.awayScore} {result.awayTeam}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {formatPlayedOn(result.playedOn)} · {result.venue}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 1.2, color: 'text.secondary', flexWrap: 'wrap' }}>
                <Typography variant="body2">👍 {result.engagement.likes} likes</Typography>
                <Typography variant="body2">💬 {result.engagement.comments} comments</Typography>
                <Typography variant="body2">
                  ⭐ {result.engagement.rating.toFixed(1)} ({result.engagement.ratingCount})
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Tournaments
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Upcoming tournaments
          </Typography>
        </Box>
        <Button component={Link} to="/tournaments" variant="text">
          All tournaments
        </Button>
      </Stack> */}

      <Card variant="outlined">
        <CardContent>
          <Typography color="text.secondary">No tournaments published yet.</Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}
