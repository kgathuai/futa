import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useAppData } from '../context/AppContext'
import { api } from '../lib/api'
import { useOutletContext } from 'react-router-dom'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInAccountId: string | null
  loggedInTeam: string | null
}

export function FriendliesPage() {
  const { friendlies } = useAppData()
  const { loggedInUser, loggedInRole, loggedInAccountId, loggedInTeam } = useOutletContext<AuthOutletContext>()

  const [teamName, setTeamName] = useState('')
  const [contact, setContact] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [teamOptions, setTeamOptions] = useState<{ name: string; logoUrl?: string }[]>([])
  const [groundOptions, setGroundOptions] = useState<string[]>([])
  const [optionLoadError, setOptionLoadError] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const canCreateHere = false

  useEffect(() => {
    const loadFriendlyOptions = async () => {
      try {
        const [teamResponse, groundResponse] = await Promise.all([api.getTeams(), api.getGrounds()])
        setTeamOptions(teamResponse.teams)
        setGroundOptions(groundResponse.grounds)
      } catch {
        setOptionLoadError('Failed to load teams and grounds from backend.')
      }
    }

    void loadFriendlyOptions()
  }, [])

  const handleAccept = async (id: string) => {
    const token = api.getToken()
    if (!token) {
      setRequestMessage('Please log in to accept friendly requests.')
      return
    }

    try {
      await api.acceptFriendlyRequest(id, token)
      window.location.reload()
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : 'Failed to accept friendly request.')
    }
  }

  const handleDecline = async (id: string) => {
    const token = api.getToken()
    if (!token) {
      setRequestMessage('Please log in to decline friendly requests.')
      return
    }

    try {
      await api.declineFriendlyRequest(id, token)
      window.location.reload()
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : 'Failed to decline friendly request.')
    }
  }

  const visibleFriendlies = loggedInAccountId
    ? friendlies.filter(
      (friendly) =>
        friendly.requesterAccountId === loggedInAccountId || friendly.recipientAccountId === loggedInAccountId,
    )
    : friendlies.filter((friendly) => friendly.status === 'pending')

  return (
    <Stack spacing={3}>

      {loggedInUser && (
        <Alert severity="success">
          Signed in as {loggedInUser}
          {loggedInTeam ? ` · ${loggedInTeam}` : ''}
          {loggedInRole ? ` · ${loggedInRole}` : ''}
        </Alert>
      )}

      {canCreateHere && showRequestForm && (
        <Card variant="outlined">
          <CardContent>
            <Box
              component="form"
              sx={{ display: 'grid', gap: 1.5 }}
              onSubmit={async (event) => {
                event.preventDefault()
                const token = api.getToken()
                if (!token) {
                  setRequestMessage('Please log in before sending a friendly request.')
                  return
                }

                try {
                  await api.createFriendlyRequest({
                    teamName,
                    contact,
                    preferredDate,
                    preferredTime,
                    location,
                    note,
                  }, token)
                  setTeamName('')
                  setContact('')
                  setPreferredDate('')
                  setPreferredTime('')
                  setLocation('')
                  setNote('')
                  setShowRequestForm(false)
                  window.location.reload()
                } catch (error) {
                  setRequestMessage(error instanceof Error ? error.message : 'Failed to create friendly request.')
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Request a Friendly Match
              </Typography>
              <TextField
                select
                label="I want friendly with"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                helperText={teamOptions.length === 0 ? 'No teams available yet. Create teams first.' : undefined}
                required
              >
                {teamOptions.map((teamOption) => (
                  <MenuItem key={teamOption.name} value={teamOption.name} sx={{ gap: 1.2 }}>
                    {teamOption.logoUrl ? (
                      <Box
                        component="img"
                        src={teamOption.logoUrl}
                        alt={`${teamOption.name} logo`}
                        sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'rgba(76,227,163,0.16)',
                          color: 'primary.main',
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {teamOption.name.charAt(0).toUpperCase()}
                      </Box>
                    )}
                    {teamOption.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Contact details"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="Phone / Email"
                required
              />
              <TextField
                label="Preferred date"
                type="date"
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Preferred time"
                type="time"
                value={preferredTime}
                onChange={(event) => setPreferredTime(event.target.value)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                label="Ground"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                helperText={groundOptions.length === 0 ? 'No grounds available yet. Add team grounds or match venues first.' : undefined}
                required
              >
                {groundOptions.map((groundOption) => (
                  <MenuItem key={groundOption} value={groundOption}>
                    {groundOption}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Notes"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                multiline
                rows={3}
                required
              />
              {optionLoadError && <Typography color="error.main">{optionLoadError}</Typography>}
              {requestMessage && <Typography color="text.secondary">{requestMessage}</Typography>}
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  Send Request
                </Button>
                <Button type="button" variant="outlined" onClick={() => setShowRequestForm(false)}>
                  Cancel
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            {loggedInAccountId ? 'All friendlies' : 'Open requests'}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            {loggedInAccountId ? 'All friendlies for your team' : 'Teams looking for friendlies'}
          </Typography>

          <Stack spacing={1.5}>
            {visibleFriendlies.length === 0 && (
              <Typography color="text.secondary">
                {loggedInAccountId
                  ? 'No friendlies yet for your team.'
                  : 'No open friendly requests yet.'}
              </Typography>
            )}
            {visibleFriendlies.map((request) => (
              <Card key={request.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" sx={{ mb: 1, justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {request.requesterTeam} vs {request.recipientTeam}
                    </Typography>
                    <Chip
                      label={request.status}
                      color={request.status === 'accepted' ? 'primary' : 'default'}
                      size="small"
                      sx={request.status === 'accepted' ? { color: '#07111f' } : undefined}
                    />
                  </Stack>
                  <Typography color="text.secondary">
                    {request.preferredDate} at {request.preferredTime}
                  </Typography>
                  <Typography>{request.location}</Typography>
                  <Typography color="text.secondary">{request.contact}</Typography>
                  <Typography sx={{ mb: 1.5 }}>{request.note}</Typography>
                  {request.recipientAccountId === loggedInAccountId && request.status === 'pending' ? (
                    <Stack direction="row" spacing={1}>
                      <Button type="button" onClick={() => void handleAccept(request.id)}>
                        Accept
                      </Button>
                      <Button type="button" variant="outlined" onClick={() => void handleDecline(request.id)}>
                        Decline
                      </Button>
                    </Stack>
                  ) : (
                    <Chip label={request.status} size="small" />
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
