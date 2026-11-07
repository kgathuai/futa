import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { api } from '../lib/api'
import type { MatchAnnouncement } from '../types'

export interface MatchFormProps {
  homeTeam: string | null
  teamOptions: string[]
  groundOptions: string[]
  refereeOptions: Array<{ id: string; name: string }>
  onCreated?: (match: MatchAnnouncement) => void
  submitLabel?: string
  compact?: boolean
}

/**
 * Shared "create a match" form used by the home page and the team dashboard.
 * Handles sisi kwa sisi (same club, Team A vs Team B), registered referees,
 * venue, kickoff, duration, category and sport.
 */
export function MatchForm({
  homeTeam,
  teamOptions,
  groundOptions,
  refereeOptions,
  onCreated,
  submitLabel = 'Create match',
  compact = false,
}: MatchFormProps) {
  const [awayTeam, setAwayTeam] = useState('')
  const [intraSquad, setIntraSquad] = useState(false)
  const [venue, setVenue] = useState('')
  const [kickoff, setKickoff] = useState('')
  const [duration, setDuration] = useState('90')
  const [referee, setReferee] = useState('')
  const [category, setCategory] = useState<'League' | 'Friendly' | 'Cup'>('Friendly')
  const [sport, setSport] = useState('Football')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const token = api.getToken()
    if (!token) {
      setError('Please log in before creating a match.')
      return
    }
    if (!homeTeam) {
      setError('Set your team before creating a match.')
      return
    }
    if (!intraSquad && !awayTeam) {
      setError('Choose the opposing team.')
      return
    }
    const parsedDuration = Number(duration)
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setError('Enter a valid match duration in minutes.')
      return
    }
    if (!venue || !kickoff) {
      setError('Pick a venue and kickoff time.')
      return
    }
    if (new Date(kickoff).getTime() <= Date.now()) {
      setError('Pick a kickoff time in the future.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await api.createMatch(
        {
          awayTeam: intraSquad ? `${homeTeam} B` : awayTeam,
          venue,
          kickoff: new Date(kickoff).toISOString(),
          durationMinutes: parsedDuration,
          category,
          sport: sport as MatchAnnouncement['sport'],
          comment: comment.trim() || undefined,
          referee: referee || undefined,
          intraSquad,
        },
        token,
      )

      setMessage('Match created.')
      setAwayTeam('')
      setIntraSquad(false)
      setVenue('')
      setKickoff('')
      setDuration('90')
      setReferee('')
      setCategory('Friendly')
      setSport('Football')
      setComment('')
      onCreated?.(created)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Failed to create match.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'grid',
        gap: compact ? 1 : 1.4,
        border: compact ? '1px dashed rgba(188,198,220,0.46)' : undefined,
        borderRadius: compact ? 2 : undefined,
        p: compact ? 1.2 : 0,
      }}
    >
      <Button
        type="button"
        variant={intraSquad ? 'contained' : 'outlined'}
        onClick={() => setIntraSquad((prev) => !prev)}
        sx={{ alignSelf: 'flex-start', fontSize: '0.74rem' }}
      >
        🤝 Sisi kwa sisi (Team A vs Team B)
      </Button>

      {intraSquad ? (
        <Typography variant="body2" color="text.secondary">
          Playing your own squad: {homeTeam || 'your team'} A vs {homeTeam || 'your team'} B — no opponent needed.
        </Typography>
      ) : (
        <TextField
          select
          label="Away team"
          value={awayTeam}
          onChange={(event) => setAwayTeam(event.target.value)}
          required
        >
          {teamOptions
            .filter((name) => name !== homeTeam)
            .map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
        </TextField>
      )}

      <TextField
        select
        label="Referee"
        value={referee}
        onChange={(event) => setReferee(event.target.value)}
        helperText="Registered referees only — or leave it at “No preference”."
      >
        <MenuItem value="">No preference</MenuItem>
        {refereeOptions.map((option) => (
          <MenuItem key={option.id} value={option.name}>
            {option.name}
          </MenuItem>
        ))}
      </TextField>

      {sport === 'Fifa' ? (
        <TextField select label="Venue" value={venue} onChange={(event) => setVenue(event.target.value)} required>
          <MenuItem value="Online">Online</MenuItem>
          <MenuItem value="Offline">Offline</MenuItem>
        </TextField>
      ) : (
        <TextField select label="Venue" value={venue} onChange={(event) => setVenue(event.target.value)} required>
          {groundOptions.map((ground) => (
            <MenuItem key={ground} value={ground}>
              {ground}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
        <TextField
          label="Kickoff"
          type="datetime-local"
          value={kickoff}
          onChange={(event) => setKickoff(event.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: new Date().toISOString().slice(0, 16) },
          }}
          required
          fullWidth
        />
        <TextField
          label="Duration (min)"
          type="number"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          slotProps={{ htmlInput: { min: 20, max: 240, step: 5 } }}
          required
          fullWidth
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
        <TextField
          select
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value as 'League' | 'Friendly' | 'Cup')}
          required
          fullWidth
        >
          <MenuItem value="Friendly">Friendly</MenuItem>
          <MenuItem value="League">League</MenuItem>
          <MenuItem value="Cup">Cup</MenuItem>
        </TextField>
        <TextField
          select
          label="Sport"
          value={sport}
          onChange={(event) => setSport(event.target.value)}
          required
          fullWidth
        >
          {['Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Paddle Tennis', 'Table Tennis', 'Pool Table', 'Darts', 'Golf', 'Chess', 'Fifa'].map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <TextField
        label="Comment (optional)"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        multiline
        rows={2}
      />

      {error && (
        <Alert severity="error" sx={{ fontSize: '0.76rem', py: 0.3 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ fontSize: '0.76rem', py: 0.3 }}>
          {message}
        </Alert>
      )}

      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : submitLabel}
      </Button>
    </Box>
  )
}
