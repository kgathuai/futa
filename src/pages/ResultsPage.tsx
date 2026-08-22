import { useState } from 'react'
import { Box, Card, CardContent, Chip, Stack, TextField, Typography, Button } from '@mui/material'
import { useAppData } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

export function ResultsPage() {
  const navigate = useNavigate()
  const { results, addResultReport } = useAppData()

  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [venue, setVenue] = useState('')
  const [playedOn, setPlayedOn] = useState('')
  const [reportedBy, setReportedBy] = useState('')
  const canCreateHere = false

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Results
        </Typography>
        <Typography color="text.secondary">Submit final scores and match reports.</Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' } }}>
        <Card variant="outlined">
          <CardContent>
            {canCreateHere ? (
            <Box
              component="form"
              sx={{ display: 'grid', gap: 1.5 }}
              onSubmit={(event) => {
                event.preventDefault()
                addResultReport({
                  homeTeam,
                  awayTeam,
                  homeScore: typeof homeScore === 'number' ? homeScore : parseInt(String(homeScore), 10),
                  awayScore: typeof awayScore === 'number' ? awayScore : parseInt(String(awayScore), 10),
                  venue,
                  playedOn,
                  reportedBy,
                })
                setHomeTeam('')
                setAwayTeam('')
                setHomeScore(0)
                setAwayScore(0)
                setVenue('')
                setPlayedOn('')
                setReportedBy('')
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Submit a result
              </Typography>

              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
                <TextField label="Home team" value={homeTeam} onChange={(event) => setHomeTeam(event.target.value)} required />
                <TextField label="Away team" value={awayTeam} onChange={(event) => setAwayTeam(event.target.value)} required />
              </Box>

              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
                <TextField
                  label="Home score"
                  type="number"
                  slotProps={{ htmlInput: { min: 0 } }}
                  value={homeScore}
                  onChange={(event) => setHomeScore(Number(event.target.value))}
                  required
                />
                <TextField
                  label="Away score"
                  type="number"
                  slotProps={{ htmlInput: { min: 0 } }}
                  value={awayScore}
                  onChange={(event) => setAwayScore(Number(event.target.value))}
                  required
                />
              </Box>

              <TextField label="Venue" value={venue} onChange={(event) => setVenue(event.target.value)} required />
              <TextField
                label="Date played"
                type="date"
                value={playedOn}
                onChange={(event) => setPlayedOn(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />
              <TextField label="Reported by" value={reportedBy} onChange={(event) => setReportedBy(event.target.value)} required />

              <Button type="submit" variant="contained">
                Submit Result
              </Button>
            </Box>
            ) : (
              <Stack spacing={1.5}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Submit a result
                </Typography>
                <Typography color="text.secondary">
                  Result creation has moved to Dashboard.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/team-dashboard')}>
                  Create on Dashboard
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Latest results
            </Typography>
            
            <Stack spacing={1.5}>
              {results.map((result) => (
                <Card key={result.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" sx={{ mb: 1.2, justifyContent: 'space-between' }}>
                      <Chip label={result.playedOn} size="small" />
                      <Chip label="finished" size="small" color="primary" sx={{ color: '#07111f' }} />
                    </Stack>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {result.homeTeam} {result.homeScore} - {result.awayScore} {result.awayTeam}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                      {result.venue}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Reported by {result.reportedBy}
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
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  )
}
