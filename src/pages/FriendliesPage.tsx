import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'accepted' | 'pending' | 'declined'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const canCreateHere = false
  const pageSize = 3

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

  const filteredFriendlies = useMemo(() => {
    if (statusFilter === 'all') {
      return visibleFriendlies
    }

    return visibleFriendlies.filter((friendly) => friendly.status === statusFilter)
  }, [statusFilter, visibleFriendlies])

  const sortedFriendlies = useMemo(() => {
    const next = [...filteredFriendlies]
    next.sort((a, b) => {
      const aTime = new Date(`${a.preferredDate}T${a.preferredTime || '00:00'}`).getTime()
      const bTime = new Date(`${b.preferredDate}T${b.preferredTime || '00:00'}`).getTime()
      return bTime - aTime
    })
    return next
  }, [filteredFriendlies])

  const totalPages = Math.max(1, Math.ceil(sortedFriendlies.length / pageSize))
  const pagedFriendlies = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedFriendlies.slice(start, start + pageSize)
  }, [currentPage, sortedFriendlies])

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const formatFriendlyDateTime = (friendlyDate: string, friendlyTime: string) => {
    const parsed = new Date(`${friendlyDate}T${friendlyTime || '00:00'}`)
    if (!Number.isFinite(parsed.getTime())) {
      return `${friendlyDate} at ${friendlyTime}`
    }

    return `${parsed.toISOString().slice(0, 10)} at ${friendlyTime || '00:00'}`
  }

  const statusStyle = (value: 'accepted' | 'pending' | 'declined') => {
    if (value === 'accepted') {
      return { fg: '#2ed598', bg: 'rgba(46,213,152,0.12)', border: 'rgba(46,213,152,0.3)' }
    }
    if (value === 'declined') {
      return { fg: '#f16f77', bg: 'rgba(241,111,119,0.12)', border: 'rgba(241,111,119,0.3)' }
    }
    return { fg: '#f4b84f', bg: 'rgba(244,184,79,0.12)', border: 'rgba(244,184,79,0.32)' }
  }

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

      <Stack spacing={2.2}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.2 }}>
          <Box>
            <Typography variant="overline" sx={{ color: '#7f8799', letterSpacing: '0.08em', fontWeight: 700 }}>
              Match Schedule
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.15rem' } }}>
              All Friendlies
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'accepted' | 'pending' | 'declined')
                setCurrentPage(1)
              }}
              sx={{ minWidth: 112, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(26,30,45,0.95)' } }}
            >
              <MenuItem value="all">Filter</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="declined">Declined</MenuItem>
            </TextField>
            <Button
              variant="contained"
              disabled={!canCreateHere}
              onClick={() => setShowRequestForm(true)}
              sx={{ bgcolor: '#adff0f', color: '#122000', fontWeight: 800, '&:hover': { bgcolor: '#97e600' } }}
            >
              + Schedule Friendly
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={2}>
          {pagedFriendlies.length === 0 && (
            <Typography color="text.secondary">
              {loggedInAccountId ? 'No friendlies yet for your team.' : 'No open friendly requests yet.'}
            </Typography>
          )}

          {pagedFriendlies.map((request) => {
            const tone = statusStyle(request.status)
            const canRespond = request.recipientAccountId === loggedInAccountId && request.status === 'pending'

            return (
              <Card
                key={request.id}
                variant="outlined"
                sx={{
                  borderRadius: 2.2,
                  borderColor: request.status === 'accepted' ? 'rgba(123,183,58,0.5)' : 'rgba(159,176,201,0.18)',
                  bgcolor: 'rgba(17,19,31,0.94)',
                }}
              >
                <CardContent sx={{ px: { xs: 2, md: 2.8 }, py: { xs: 1.7, md: 2 } }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.45rem', md: '2rem' } }}>
                        {request.requesterTeam}
                      </Typography>
                      <Typography sx={{ color: '#9da7be', fontWeight: 700, fontSize: { xs: '1.25rem', md: '1.85rem' } }}>vs</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.45rem', md: '2rem' } }}>
                        {request.recipientTeam}
                      </Typography>
                      <Chip
                        label={request.status.toUpperCase()}
                        size="small"
                        sx={{
                          color: tone.fg,
                          borderColor: tone.border,
                          bgcolor: tone.bg,
                          '& .MuiChip-label': { fontWeight: 800 },
                        }}
                        variant="outlined"
                      />
                    </Stack>

                    <Button variant="outlined" sx={{ minWidth: 102, fontWeight: 700 }}>
                      Details
                    </Button>
                  </Stack>

                  <Box sx={{ display: 'grid', gap: 1.2, gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' } }}>
                    <Box>
                      <Typography sx={{ color: '#6f7890', fontSize: '0.7rem', letterSpacing: '0.08em' }}>DATE & TIME</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600 }}>{formatFriendlyDateTime(request.preferredDate, request.preferredTime)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#6f7890', fontSize: '0.7rem', letterSpacing: '0.08em' }}>CATEGORY</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600 }}>{request.location}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#6f7890', fontSize: '0.7rem', letterSpacing: '0.08em' }}>PHONE</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600 }}>{request.contact}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#6f7890', fontSize: '0.7rem', letterSpacing: '0.08em' }}>CONTACT</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600 }}>{request.requesterName}</Typography>
                    </Box>
                    <Stack sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'center' }}>
                      {canRespond ? (
                        <Stack direction="row" spacing={0.8}>
                          <Button size="small" variant="contained" onClick={() => void handleAccept(request.id)}>
                            Approve
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => void handleDecline(request.id)}>
                            Decline
                          </Button>
                        </Stack>
                      ) : (
                        <Chip label={request.status.toUpperCase()} size="small" sx={{ '& .MuiChip-label': { fontWeight: 700 } }} />
                      )}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Stack>

        <Stack direction="row" spacing={0.8} sx={{ justifyContent: 'center', alignItems: 'center', mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            sx={{ minWidth: 36, px: 0 }}
          >
            <ChevronLeftRoundedIcon fontSize="small" />
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={`friendlies-page-${page}`}
              size="small"
              onClick={() => setCurrentPage(page)}
              sx={{
                minWidth: 36,
                fontWeight: 800,
                bgcolor: currentPage === page ? '#adff0f' : 'transparent',
                color: currentPage === page ? '#112000' : '#a7afc2',
                border: '1px solid rgba(159,176,201,0.18)',
              }}
            >
              {page}
            </Button>
          ))}

          <Button
            size="small"
            variant="outlined"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            sx={{ minWidth: 36, px: 0 }}
          >
            <ChevronRightRoundedIcon fontSize="small" />
          </Button>
        </Stack>
      </Stack>
    </Stack>
  )
}
