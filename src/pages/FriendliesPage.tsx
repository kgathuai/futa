import { useEffect, useMemo, useState } from 'react'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import EventIcon from '@mui/icons-material/Event'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { useAppData } from '../context/AppContext'
import { api } from '../lib/api'
import { useOutletContext } from 'react-router-dom'
import { useAutoHide } from '../lib/useAutoHide'

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
  const [referee, setReferee] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [teamOptions, setTeamOptions] = useState<{ name: string; logoUrl?: string }[]>([])
  const [groundOptions, setGroundOptions] = useState<string[]>([])
  const [optionLoadError, setOptionLoadError] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [showSignedIn, setShowSignedIn] = useState(true)
  useAutoHide(requestMessage, () => setRequestMessage(''))
  useAutoHide(loggedInUser ?? '', () => setShowSignedIn(false), 5000)
  const [statusFilter, setStatusFilter] = useState<'all' | 'accepted' | 'pending' | 'declined'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedFriendlyForDetails, setSelectedFriendlyForDetails] = useState<string | null>(null)
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null)
  const [statusEditId, setStatusEditId] = useState<string | null>(null)
  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canCreateHere =
    Boolean(loggedInUser) &&
    (normalizedRole === 'tm' ||
      normalizedRole === 'coach' ||
      normalizedRole === 'captain' ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin')
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

  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'accepted' | 'declined') => {
    const token = api.getToken()
    if (!token) {
      setRequestMessage('Please log in to update status.')
      return
    }

    try {
      await api.updateFriendlyRequestStatus(id, newStatus, token)
      setStatusMenuAnchor(null)
      setStatusEditId(null)
      window.location.reload()
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : 'Failed to update status.')
      setStatusMenuAnchor(null)
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

      {loggedInUser && showSignedIn && (
        <Alert severity="success" onClose={() => setShowSignedIn(false)}>
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
                    referee: referee.trim() || undefined,
                  }, token)
                  setTeamName('')
                  setContact('')
                  setPreferredDate('')
                  setPreferredTime('')
                  setLocation('')
                  setNote('')
                  setReferee('')
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
              <TextField
                label="Referee (optional)"
                value={referee}
                onChange={(event) => setReferee(event.target.value)}
                placeholder="Referee name"
                helperText="Enter the name of the referee officiating the match."
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
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', md: '1.075rem' } }}>
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
            const requesterLogo = teamOptions.find((team) => team.name === request.requesterTeam)?.logoUrl
            const recipientLogo = teamOptions.find((team) => team.name === request.recipientTeam)?.logoUrl

            return (
              <Card
                key={request.id}
                variant="outlined"
                sx={{
                  borderRadius: { xs: 1.5, md: 2.2 },
                  borderColor: request.status === 'accepted' ? 'rgba(123,183,58,0.5)' : 'rgba(159,176,201,0.18)',
                  bgcolor: 'rgba(17,19,31,0.94)',
                  overflow: 'hidden',
                }}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0, px: { xs: 1.5, md: 2.8 }, py: { xs: 1.3, md: 2 }, gap: 1, bgcolor: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(159,176,201,0.12)' }}>
                    <Stack direction="row" spacing={{ xs: 0.65, md: 1 }} sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
                      <Avatar src={requesterLogo} alt={`${request.requesterTeam} logo`} sx={{ width: { xs: 30, md: 36 }, height: { xs: 30, md: 36 }, bgcolor: 'rgba(76,227,163,0.16)', color: '#4ce3a3', fontSize: '0.78rem', fontWeight: 800 }}>
                        {request.requesterTeam.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.9rem', md: '1rem' }, overflowWrap: 'anywhere' }}>
                        {request.requesterTeam}
                      </Typography>
                      <Typography sx={{ color: '#9da7be', fontWeight: 700, fontSize: { xs: '0.7rem', md: '0.925rem' } }}>vs</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.9rem', md: '1rem' }, overflowWrap: 'anywhere' }}>
                        {request.recipientTeam}
                      </Typography>
                      <Avatar src={recipientLogo} alt={`${request.recipientTeam} logo`} sx={{ width: { xs: 30, md: 36 }, height: { xs: 30, md: 36 }, bgcolor: 'rgba(250,204,21,0.16)', color: '#ffdf76', fontSize: '0.78rem', fontWeight: 800 }}>
                        {request.recipientTeam.charAt(0).toUpperCase()}
                      </Avatar>
                      <Chip
                        label={request.status.toUpperCase()}
                        size="small"
                        sx={{
                          color: tone.fg,
                          borderColor: tone.border,
                          bgcolor: tone.bg,
                          '& .MuiChip-label': { fontWeight: 800, fontSize: { xs: '0.62rem', md: '0.75rem' } },
                        }}
                        variant="outlined"
                      />
                    </Stack>

                    <Button variant="outlined" size="small" sx={{ minWidth: { xs: 0, md: 102 }, px: { xs: 1, md: 1.5 }, fontWeight: 700, flexShrink: 0 }} onClick={() => setSelectedFriendlyForDetails(request.id)}>
                      Details
                    </Button>
                  </Stack>

                  <Box sx={{ display: 'grid', gap: { xs: 1.1, md: 1.2 }, px: { xs: 1.5, md: 2.8 }, py: { xs: 1.5, md: 2 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(6, 1fr)' } }}>
                    <Box>
                      <Typography sx={{ color: '#6f7890', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>DATE & TIME</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600, fontSize: { xs: '0.78rem', md: '0.9rem' }, overflowWrap: 'anywhere' }}>{formatFriendlyDateTime(request.preferredDate, request.preferredTime)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#6f7890', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>VENUE</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600, fontSize: { xs: '0.78rem', md: '0.9rem' }, overflowWrap: 'anywhere' }}>{request.location}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#6f7890', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>CONTACT</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600, fontSize: { xs: '0.78rem', md: '0.9rem' }, overflowWrap: 'anywhere' }}>{request.contact}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#6f7890', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>REQUESTED BY</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600, fontSize: { xs: '0.78rem', md: '0.9rem' }, overflowWrap: 'anywhere' }}>{request.requesterName}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#6f7890', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>REFEREE</Typography>
                      <Typography sx={{ color: request.referee ? '#a9b3c8' : '#555e72', fontWeight: 600, fontStyle: request.referee ? 'normal' : 'italic', fontSize: { xs: '0.78rem', md: '0.9rem' }, overflowWrap: 'anywhere' }}>
                        {request.referee || 'Not assigned'}
                      </Typography>
                    </Box>
                    <Stack sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'center', display: { xs: 'none', md: 'flex' } }}>
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
                bgcolor: currentPage === page ? '#4ce3a3' : 'transparent',
                color: currentPage === page ? '#07111f' : '#a7afc2',
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

      <Dialog open={Boolean(selectedFriendlyForDetails && friendlies.find((f) => f.id === selectedFriendlyForDetails))} onClose={() => setSelectedFriendlyForDetails(null)} maxWidth="sm" fullWidth>
        {(() => {
          const selectedFriendly = friendlies.find((f) => f.id === selectedFriendlyForDetails)
          const canRespond = selectedFriendly && selectedFriendly.recipientAccountId === loggedInAccountId && selectedFriendly.status === 'pending'
          return (
            <>
              <DialogTitle sx={{ pb: 0, pt: 2.5, textAlign: 'center' }}>
                <Typography sx={{ color: '#7f88a0', fontSize: '0.7rem', letterSpacing: '0.12em', fontWeight: 700, mb: 1 }}>
                  MATCH CHALLENGE / DETAILS
                </Typography>
              </DialogTitle>
              <DialogContent sx={{ pt: 2.5 }}>
                <Stack spacing={2.5}>
                  {/* STATUS & DATE & TIME ROW */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                    {/* STATUS */}
                    <Box>
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 0.8 }}>
                        STATUS
                      </Typography>
                      <Chip
                        label={selectedFriendly?.status.toUpperCase()}
                        onClick={(e) => {
                          setStatusEditId(selectedFriendly?.id || null)
                          setStatusMenuAnchor(e.currentTarget)
                        }}
                        sx={{
                          color: statusStyle(selectedFriendly?.status as 'pending' | 'accepted' | 'declined').fg,
                          borderColor: statusStyle(selectedFriendly?.status as 'pending' | 'accepted' | 'declined').border,
                          bgcolor: statusStyle(selectedFriendly?.status as 'pending' | 'accepted' | 'declined').bg,
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8,
                          },
                        }}
                        variant="outlined"
                      />
                    </Box>
                    {/* DATE & TIME */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
                        <EventIcon sx={{ fontSize: '1rem', color: '#7f88a0' }} />
                        <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700 }}>
                          DATE & TIME
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>
                        {selectedFriendly && formatFriendlyDateTime(selectedFriendly.preferredDate, selectedFriendly.preferredTime)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* GROUND / VENUE */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
                      <LocationOnIcon sx={{ fontSize: '1rem', color: '#7f88a0' }} />
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700 }}>
                        GROUND / VENUE
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>{selectedFriendly?.location}</Typography>
                    <Typography sx={{ color: '#999', fontSize: '0.85rem', mt: 0.3 }}>City Sports Complex, Court 3' to add depth</Typography>
                  </Box>

                  {/* ASSIGNED REFEREE */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
                      <EmojiEventsIcon sx={{ fontSize: '1rem', color: '#7f88a0' }} />
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700 }}>
                        ASSIGNED REFEREE
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, border: '1px solid #2a3a52', borderRadius: 1, bgcolor: 'rgba(76, 227, 163, 0.05)' }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: '#4ce3a3', fontSize: '1rem' }}>
                        {selectedFriendly?.referee ? selectedFriendly.referee.charAt(0).toUpperCase() : '?'}
                      </Avatar>
                      <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>
                        {selectedFriendly?.referee || 'Not assigned'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* CONTACT PERSON & CONTACT DETAILS ROW */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                    {/* CONTACT PERSON */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
                        <PersonIcon sx={{ fontSize: '1rem', color: '#7f88a0' }} />
                        <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700 }}>
                          CONTACT PERSON
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>{selectedFriendly?.requesterName}</Typography>
                    </Box>
                    {/* CONTACT DETAILS */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
                        <PhoneIcon sx={{ fontSize: '1rem', color: '#7f88a0' }} />
                        <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700 }}>
                          CONTACT DETAILS
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>{selectedFriendly?.contact}</Typography>
                    </Box>
                  </Box>

                  {/* NOTES / MESSAGE */}
                  <Box>
                    <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 0.8 }}>
                      NOTES / MESSAGE
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        border: '1px solid #2a3a52',
                        borderRadius: 1,
                        bgcolor: 'rgba(76, 227, 163, 0.05)',
                        minHeight: 80,
                      }}
                    >
                      <Typography sx={{ fontWeight: 500, fontSize: '1rem', whiteSpace: 'pre-wrap', color: '#e0e0e0' }}>
                        {selectedFriendly?.note || '(Add more details if needed...)'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* REQUESTING TEAM VS RECEIVING TEAM */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: 2,
                      alignItems: 'center',
                      p: 2.5,
                      border: '1px solid #2a3a52',
                      borderRadius: 1,
                      bgcolor: 'rgba(76, 227, 163, 0.02)',
                    }}
                  >
                    {/* REQUESTING TEAM */}
                    <Box>
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 1.2 }}>
                        REQUESTING TEAM
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: '#4ce3a3', fontWeight: 700, fontSize: '1.1rem', color: '#07111f' }} />
                        <Box
                          sx={{
                            px: 1.5,
                            py: 0.8,
                            bgcolor: 'rgba(76, 227, 163, 0.15)',
                            border: '1px solid rgba(76, 227, 163, 0.3)',
                            borderRadius: 1,
                            flex: 1,
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#4ce3a3' }}>
                            {selectedFriendly?.requesterTeam}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    {/* VS */}
                    <Typography sx={{ color: '#7f88a0', fontWeight: 700, fontSize: '0.9rem' }}>VS</Typography>
                    {/* RECEIVING TEAM */}
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 1.2 }}>
                        RECEIVING TEAM
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <Box
                          sx={{
                            px: 1.5,
                            py: 0.8,
                            bgcolor: 'rgba(255, 122, 92, 0.15)',
                            border: '1px solid rgba(255, 122, 92, 0.3)',
                            borderRadius: 1,
                            flex: 1,
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#ff7a5c' }}>
                            {selectedFriendly?.recipientTeam}
                          </Typography>
                        </Box>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: '#ff7a5c', fontWeight: 700, fontSize: '1.1rem', color: '#07111f' }} />
                      </Box>
                    </Box>
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => setSelectedFriendlyForDetails(null)}>
                  Close
                </Button>
                {canRespond && (
                  <>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={async () => {
                        if (selectedFriendly) {
                          await handleDecline(selectedFriendly.id)
                          setSelectedFriendlyForDetails(null)
                        }
                      }}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="contained"
                      onClick={async () => {
                        if (selectedFriendly) {
                          await handleAccept(selectedFriendly.id)
                          setSelectedFriendlyForDetails(null)
                        }
                      }}
                    >
                      Accept
                    </Button>
                  </>
                )}
              </DialogActions>
              <Menu
                anchorEl={statusMenuAnchor}
                open={Boolean(statusMenuAnchor && statusEditId)}
                onClose={() => setStatusMenuAnchor(null)}
              >
                <MenuItem
                  onClick={() => handleUpdateStatus(statusEditId || '', 'pending')}
                  selected={selectedFriendly?.status === 'pending'}
                >
                  Pending
                </MenuItem>
                <MenuItem
                  onClick={() => handleUpdateStatus(statusEditId || '', 'accepted')}
                  selected={selectedFriendly?.status === 'accepted'}
                >
                  Accepted
                </MenuItem>
                <MenuItem
                  onClick={() => handleUpdateStatus(statusEditId || '', 'declined')}
                  selected={selectedFriendly?.status === 'declined'}
                >
                  Declined
                </MenuItem>
              </Menu>
            </>
          )
        })()}
      </Dialog>
    </Stack>
  )
}
