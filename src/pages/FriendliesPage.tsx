import { useEffect, useMemo, useState } from 'react'
import { Alert, Autocomplete, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import EventIcon from '@mui/icons-material/Event'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SportsSoccerOutlinedIcon from '@mui/icons-material/SportsSoccerOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import { useAppData } from '../context/AppContext'
import { api } from '../lib/api'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { useAutoHide } from '../lib/useAutoHide'
import type { FriendlyRequest, MatchAnnouncement } from '../types'
import { KENYAN_PHONE_HINT, validateTeamContact } from '../lib/phone'
import { DEFAULT_RACE_TO, RACE_TO_HINT, isRaceSport, isValidRaceTo } from '../lib/matchFormat'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInAccountId: string | null
  loggedInTeam: string | null
  loggedInSports?: string[]
}

export function FriendliesPage() {
  const { friendlies } = useAppData()
  const navigate = useNavigate()
  const { loggedInUser, loggedInRole, loggedInAccountId, loggedInTeam, loggedInSports } = useOutletContext<AuthOutletContext>()

  const [teamName, setTeamName] = useState('')
  const [contact, setContact] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [intraSquad, setIntraSquad] = useState(false)
  const [onlyMySports, setOnlyMySports] = useState(false)
  const [friendlySport, setFriendlySport] = useState('Football')
  const [intraDuration, setIntraDuration] = useState(90)
  const [raceTo, setRaceTo] = useState(DEFAULT_RACE_TO)
  const [poolPlayers, setPoolPlayers] = useState<string[]>([])
  const [referee, setReferee] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [teamOptions, setTeamOptions] = useState<{ name: string; logoUrl?: string }[]>([])
  const [groundOptions, setGroundOptions] = useState<string[]>([])
  const [refereeOptions, setRefereeOptions] = useState<{ id: string; name: string }[]>([])
  const [optionLoadError, setOptionLoadError] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [showSignedIn, setShowSignedIn] = useState(true)
  useAutoHide(requestMessage, () => setRequestMessage(''))
  useAutoHide(loggedInUser ?? '', () => setShowSignedIn(false))
  const [statusFilter, setStatusFilter] = useState<'all' | 'accepted' | 'pending' | 'declined'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedFriendlyForDetails, setSelectedFriendlyForDetails] = useState<string | null>(null)
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null)
  const [statusEditId, setStatusEditId] = useState<string | null>(null)
  const [presetMessage, setPresetMessage] = useState('')
  useAutoHide(presetMessage, () => setPresetMessage(''))
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canCreateHere =
    Boolean(loggedInUser) &&
    (normalizedRole === 'tm' ||
      normalizedRole === 'coach' ||
      normalizedRole === 'captain' ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin')
  const pageSize = 3

  const inviteLinkFor = (request: FriendlyRequest) =>
    request.inviteToken ? `${window.location.origin}/friendlies/invite/${request.inviteToken}` : ''

  const canShareInvite = (request: FriendlyRequest) =>
    Boolean(request.inviteToken && request.requesterAccountId === loggedInAccountId)

  const copyInviteLink = (request: FriendlyRequest) => {
    const link = inviteLinkFor(request)
    if (!link) {
      return
    }
    if (!navigator.clipboard) {
      setPresetMessage(`Invite link: ${link}`)
      return
    }
    void navigator.clipboard
      .writeText(link)
      .then(() => setPresetMessage(`Invite link copied — send it to ${request.recipientTeam}.`))
      .catch(() => setPresetMessage(`Invite link: ${link}`))
  }

  // "Challenge this team" links from the team directory arrive as
  // /friendlies?team=<name>&request=1 — prefill the form and open it.
  useEffect(() => {
    const requestedTeam = searchParams.get('team')?.trim() ?? ''
    const wantsForm = searchParams.get('request') === '1'
    if (!requestedTeam && !wantsForm) {
      return
    }

    // Wait for the session restore before deciding — otherwise a signed-in
    // manager can be told to sign in, and the form never opens.
    if (!loggedInUser && api.getToken()) {
      return
    }

    if (requestedTeam) {
      setTeamName(requestedTeam)
    }
    if (canCreateHere) {
      setShowRequestForm(true)
    } else {
      setPresetMessage(
        loggedInUser
          ? requestedTeam
            ? `Only a TM, coach, captain or admin can request a friendly against ${requestedTeam}. Ask your team manager to send it.`
            : 'Only a TM, coach, captain or admin can request a friendly.'
          : requestedTeam
            ? `Sign in with your team account to challenge ${requestedTeam}.`
            : 'Sign in with your team account to request a friendly — it only takes a minute.',
      )
    }
    setSearchParams({}, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [searchParams, setSearchParams, canCreateHere, loggedInUser])

  useEffect(() => {
    const loadFriendlyOptions = async () => {
      try {
        const [teamResponse, groundResponse, refereeResponse] = await Promise.all([
          api.getTeams(),
          api.getGrounds(),
          api.getReferees(),
        ])
        setTeamOptions(teamResponse.teams)
        setGroundOptions(groundResponse.grounds)
        setRefereeOptions(refereeResponse.referees)
      } catch {
        setOptionLoadError('Failed to load teams and grounds from backend.')
      }
    }

    void loadFriendlyOptions()
  }, [])

  // Registered Pool Table players to pick from when challenging someone.
  useEffect(() => {
    if (friendlySport !== 'Pool Table') {
      return
    }
    let active = true
    void api
      .getPlayersBySport('Pool Table')
      .then((response) => {
        if (!active) {
          return
        }
        const names = response.players
          .map((player) => player.name.trim())
          .filter((name) => name && name.toLowerCase() !== (loggedInUser ?? '').trim().toLowerCase())
        setPoolPlayers([...new Set(names)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [friendlySport, loggedInUser])

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

  const mySports = loggedInSports ?? []
  const isPoolFriendly = friendlySport === 'Pool Table'
  const matchesMySports = (sport?: string) =>
    !onlyMySports || mySports.length === 0 || (sport ? mySports.includes(sport) : true)

  const visibleFriendlies = (loggedInAccountId
    ? friendlies.filter(
      (friendly) =>
        friendly.requesterAccountId === loggedInAccountId || friendly.recipientAccountId === loggedInAccountId,
    )
    : friendlies.filter((friendly) => friendly.status === 'pending')
  ).filter((friendly) => matchesMySports(friendly.sport))

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

      {presetMessage && (
        <Alert severity="info" onClose={() => setPresetMessage('')}>
          {presetMessage}
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

                if (isRaceSport(friendlySport) && !isValidRaceTo(raceTo)) {
                  setRequestMessage('Enter an odd number of racks (1, 3, 5 … 15).')
                  return
                }

                if (intraSquad) {
                  if (!loggedInTeam) {
                    setRequestMessage('Set your team before booking a sisi kwa sisi match.')
                    return
                  }
                  if (!preferredDate || !preferredTime || !location) {
                    setRequestMessage('Pick the date, time and venue.')
                    return
                  }
                  if (new Date(`${preferredDate}T${preferredTime}`).getTime() <= Date.now()) {
                    setRequestMessage('Pick a date and time in the future.')
                    return
                  }
                  try {
                    await api.createMatch(
                      {
                        awayTeam: `${loggedInTeam} B`,
                        venue: location,
                        kickoff: new Date(`${preferredDate}T${preferredTime}`).toISOString(),
                        // Pool is a race to a set number of racks; the minutes
                        // value only blocks the ground for scheduling.
                        durationMinutes: isRaceSport(friendlySport) ? 90 : intraDuration,
                        raceTo: isRaceSport(friendlySport) ? raceTo : undefined,
                        category: 'Friendly',
                        sport: friendlySport as MatchAnnouncement['sport'],
                        comment: note.trim() || 'Sisi kwa sisi',
                        referee: referee.trim() || undefined,
                        intraSquad: true,
                      },
                      token,
                    )
                    setShowRequestForm(false)
                    setPreferredDate('')
                    setPreferredTime('')
                    setReferee('')
                    setNote('')
                    navigate('/')
      window.scrollTo({ top: 0, behavior: 'smooth' })
                  } catch (error) {
                    setRequestMessage(error instanceof Error ? error.message : 'Could not create the match.')
                  }
                  return
                }

                if (new Date(`${preferredDate}T${preferredTime || '00:00'}`).getTime() <= Date.now()) {
                  setRequestMessage('Pick a date and time in the future.')
                  return
                }

                if (isPoolFriendly && !teamName.trim()) {
                  setRequestMessage('Enter the name of the pool player you want to challenge.')
                  return
                }

                const contactCheck = validateTeamContact(contact)
                if (!contactCheck.ok) {
                  setRequestMessage(contactCheck.error ?? 'Enter a valid contact.')
                  return
                }

                try {
                  const created = await api.createFriendlyRequest({
                    teamName,
                    contact: contactCheck.value,
                    preferredDate,
                    preferredTime,
                    location,
                    note: note.trim() || (isPoolFriendly ? 'Pool challenge' : note),
                    sport: friendlySport,
                    raceTo: isRaceSport(friendlySport) ? raceTo : undefined,
                    opponentType: isPoolFriendly ? 'player' : undefined,
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
                  if (created?.invitePath) {
                    // Unregistered opponent: hand over a shareable invite link.
                    setInviteLink(`${window.location.origin}${created.invitePath}`)
                  } else {
                    navigate('/')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                } catch (error) {
                  setRequestMessage(error instanceof Error ? error.message : 'Failed to create friendly request.')
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Request a Friendly Match
              </Typography>
              <Autocomplete
                freeSolo
                options={teamOptions.map((teamOption) => teamOption.name)}
                value={teamName || null}
                onChange={(_event, value) => setTeamName(typeof value === 'string' ? value : value ?? '')}
                onInputChange={(_event, value) => setTeamName(value)}
                sx={{ display: intraSquad || isPoolFriendly ? 'none' : undefined }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="I want friendly with"
                    placeholder="Search teams, or type an unregistered team"
                    helperText="Not registered? Type the name and we'll create a shareable invite link."
                    required={!intraSquad && !isPoolFriendly}
                  />
                )}
              />
              {!isPoolFriendly && (
                <Button
                  type="button"
                  variant={intraSquad ? 'contained' : 'outlined'}
                  onClick={() => setIntraSquad((prev) => !prev)}
                  sx={{ alignSelf: 'flex-start', fontSize: '0.74rem' }}
                >
                  🤝 Sisi kwa sisi (Team A vs Team B)
                </Button>
              )}

              {isPoolFriendly && !intraSquad && (
                <Autocomplete
                  freeSolo
                  options={poolPlayers}
                  value={teamName || null}
                  onChange={(_event, value) => setTeamName(typeof value === 'string' ? value : value ?? '')}
                  onInputChange={(_event, value) => setTeamName(value)}
                  noOptionsText="No Pool Table players registered yet — ask them to sign up first"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Opponent player name"
                      placeholder="Search registered players"
                      helperText="The registered player you want to challenge — not your own name."
                      required
                    />
                  )}
                />
              )}

              <TextField
                select
                label="Sport"
                value={friendlySport}
                onChange={(event) => {
                  const nextSport = event.target.value
                  setFriendlySport(nextSport)
                  if (nextSport === 'Pool Table') {
                    setIntraSquad(false)
                  }
                }}
                helperText={intraSquad ? undefined : 'The friendly will be played in this sport.'}
              >
                {['Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Paddle Tennis', 'Table Tennis', 'Pool Table', 'Darts', 'Golf', 'Chess', 'Fifa'].map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>

              {isRaceSport(friendlySport) ? (
                <TextField
                  label="Race to (racks)"
                  type="number"
                  value={raceTo === 0 ? '' : raceTo}
                  onChange={(event) => setRaceTo(event.target.value === '' ? 0 : Number(event.target.value))}
                  slotProps={{ htmlInput: { min: 1, max: 15, step: 2, inputMode: 'numeric' } }}
                  helperText={RACE_TO_HINT}
                />
              ) : intraSquad ? (
                <TextField
                  label="Match duration (min)"
                  type="number"
                  value={intraDuration}
                  onChange={(event) => setIntraDuration(Number(event.target.value))}
                  slotProps={{ htmlInput: { min: 20, max: 240, step: 5 } }}
                />
              ) : null}

              {!intraSquad && (
              <TextField
                label="Contact details"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="0712 345 678 or name@email.com"
                helperText={KENYAN_PHONE_HINT}
                error={Boolean(contact) && !validateTeamContact(contact).ok}
                required
              />
              )}
              <TextField
                label="Preferred date"
                type="date"
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
                required
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: new Date().toISOString().slice(0, 10) },
                }}
              />
              <TextField
                label="Preferred time"
                type="time"
                value={preferredTime}
                onChange={(event) => setPreferredTime(event.target.value)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
              {friendlySport === 'Fifa' ? (
                <TextField
                  select
                  label="Venue"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  helperText="Fifa matches are played online or in person."
                  required
                >
                  <MenuItem value="Online">Online</MenuItem>
                  <MenuItem value="Offline">Offline</MenuItem>
                </TextField>
              ) : isPoolFriendly ? (
                <TextField
                  label="Venue"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="e.g. Cue Lounge, Westlands"
                  required
                />
              ) : (
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
              )}
              {!isPoolFriendly && (
                <TextField
                  label="Notes"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  multiline
                  rows={3}
                  required
                />
              )}
              <TextField
                select
                label="Referee"
                value={referee}
                onChange={(event) => setReferee(event.target.value)}
                helperText={
                  refereeOptions.length > 0
                    ? 'Only registered referees can be assigned — or leave it at “No preference”.'
                    : 'No referees registered yet — leave “No preference” and an organiser can assign one later.'
                }
              >
                <MenuItem value="">No preference</MenuItem>
                {refereeOptions.map((option) => (
                  <MenuItem key={option.id} value={option.name}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexWrap: 'wrap',
            gap: 1.2,
          }}
        >
          <Box sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: '#7f8799', letterSpacing: '0.06em', fontWeight: 700, fontSize: '0.6rem', lineHeight: 1.6 }}>
              Match Schedule
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1rem' }, lineHeight: 1.2 }}>
              All Friendlies
            </Typography>
            <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mt: 0.35, maxWidth: 620 }}>
              Book a fixture, invite an opponent and confirm from here — friendlies are the easiest way to get a
              game against teams in your area.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {mySports.length > 0 && (
              <Chip
                size="small"
                label={onlyMySports ? 'My sports only' : 'My sports'}
                color={onlyMySports ? 'primary' : 'default'}
                variant={onlyMySports ? 'filled' : 'outlined'}
                onClick={() => setOnlyMySports((prev) => !prev)}
              />
            )}
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'accepted' | 'pending' | 'declined')
                setCurrentPage(1)
              }}
              sx={{
                minWidth: 104,
                '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', fontSize: '0.78rem' },
              }}
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
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2.2,
                borderStyle: 'dashed',
                borderColor: 'rgba(76,227,163,0.35)',
                bgcolor: 'rgba(76,227,163,0.04)',
              }}
            >
              <CardContent sx={{ py: { xs: 3.5, md: 5 }, px: 2.5, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    mx: 'auto',
                    mb: 1.6,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'rgba(76,227,163,0.12)',
                    border: '1px solid rgba(76,227,163,0.35)',
                    color: 'primary.main',
                  }}
                >
                  <SportsSoccerOutlinedIcon sx={{ fontSize: '1.7rem' }} />
                </Box>

                <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, mb: 0.6 }}>
                  {loggedInAccountId ? 'Be the first to book a friendly' : 'No open friendly requests — yet'}
                </Typography>

                <Typography
                  sx={{ color: 'text.secondary', fontSize: { xs: '0.78rem', md: '0.84rem' }, maxWidth: 460, mx: 'auto', mb: 2 }}
                >
                  {loggedInAccountId
                    ? 'Got a free weekend? Pick an opponent, a ground and a kickoff — they get a request, you both confirm here, and the whole community sees the fixture.'
                    : 'This is where teams post challenges and find opponents. Sign in with your team account and put out the first call — someone is always looking for a game.'}
                </Typography>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ justifyContent: 'center', alignItems: 'center' }}
                >
                  {loggedInAccountId ? (
                    <Button
                      variant="contained"
                      disabled={!canCreateHere}
                      onClick={() => setShowRequestForm(true)}
                      startIcon={<SportsSoccerOutlinedIcon sx={{ fontSize: '1rem' }} />}
                      sx={{ fontSize: '0.78rem' }}
                    >
                      Schedule a friendly
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={() => {
                        const trigger = document.querySelector<HTMLButtonElement>('[aria-label="Account"]')
                        trigger?.click()
                      }}
                      sx={{ fontSize: '0.78rem' }}
                    >
                      Sign in to post a request
                    </Button>
                  )}
                  <Button
                    component={Link}
                    to="/team"
                    variant="text"
                    startIcon={<GroupsOutlinedIcon sx={{ fontSize: '1rem' }} />}
                    sx={{ fontSize: '0.78rem' }}
                  >
                    Browse teams
                  </Button>
                </Stack>

                {loggedInAccountId && !canCreateHere && (
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 1.4 }}>
                    Only TM, Coach, captain or an admin can schedule a friendly.
                  </Typography>
                )}
              </CardContent>
            </Card>
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
                  bgcolor: 'background.paper',
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
                      {request.raceTo ? (
                        <Chip
                          label={`RACE TO ${request.raceTo}`}
                          size="small"
                          sx={{
                            color: '#8fd3ff',
                            borderColor: 'rgba(143,211,255,0.4)',
                            bgcolor: 'rgba(143,211,255,0.1)',
                            '& .MuiChip-label': { fontWeight: 800, fontSize: { xs: '0.62rem', md: '0.75rem' } },
                          }}
                          variant="outlined"
                        />
                      ) : null}
                    </Stack>

                    {canShareInvite(request) && (
                      <IconButton
                        size="small"
                        aria-label={`Copy invite link for ${request.recipientTeam}`}
                        onClick={() => copyInviteLink(request)}
                        sx={{ flexShrink: 0 }}
                      >
                        <LinkRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
                    <Button variant="outlined" size="small" sx={{ minWidth: { xs: 0, md: 102 }, px: { xs: 1, md: 1.5 }, fontWeight: 700, flexShrink: 0 }} onClick={() => setSelectedFriendlyForDetails(request.id)}>
                      Details
                    </Button>
                  </Stack>

                  <Box sx={{ display: 'grid', gap: { xs: 1.1, md: 1.2 }, px: { xs: 1.5, md: 2.8 }, py: { xs: 1.5, md: 2 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(6, 1fr)' } }}>
                    <Box>
                      <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>DATE & TIME</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600, fontSize: { xs: '0.78rem', md: '0.9rem' }, overflowWrap: 'anywhere' }}>{formatFriendlyDateTime(request.preferredDate, request.preferredTime)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>VENUE</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600, fontSize: { xs: '0.78rem', md: '0.9rem' }, overflowWrap: 'anywhere' }}>{request.location}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>CONTACT</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600, fontSize: { xs: '0.78rem', md: '0.9rem' }, overflowWrap: 'anywhere' }}>{request.contact}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>REQUESTED BY</Typography>
                      <Typography sx={{ color: '#a9b3c8', fontWeight: 600, fontSize: { xs: '0.78rem', md: '0.9rem' }, overflowWrap: 'anywhere' }}>{request.requesterName}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.58rem', md: '0.65rem' }, letterSpacing: '0.08em' }}>REFEREE</Typography>
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

        {sortedFriendlies.length > 0 && (
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
        )}
      </Stack>

      <Dialog
        open={Boolean(inviteLink)}
        onClose={() => {
          setInviteLink(null)
          setInviteCopied(false)
          navigate('/')
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Share this invite link</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              This opponent isn&apos;t registered yet. Send them this link — they can create an account and accept
              the friendly from it.
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={inviteLink ?? ''}
              slotProps={{ htmlInput: { readOnly: true } }}
            />
            {inviteCopied && (
              <Typography variant="caption" color="primary.main">
                Link copied to your clipboard.
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Button
                variant="contained"
                onClick={() => {
                  if (!inviteLink) {
                    return
                  }
                  if (!navigator.clipboard) {
                    setInviteCopied(false)
                    return
                  }
                  void navigator.clipboard
                    .writeText(inviteLink)
                    .then(() => setInviteCopied(true))
                    .catch(() => setInviteCopied(false))
                }}
              >
                {inviteCopied ? 'Copied ✓' : 'Copy link'}
              </Button>
              <Button
                variant="outlined"
                component="a"
                href={
                  inviteLink
                    ? `https://wa.me/?text=${encodeURIComponent(`Friendly invite: ${inviteLink}`)}`
                    : undefined
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setInviteLink(null)
              setInviteCopied(false)
              navigate('/')
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

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

                  {selectedFriendly?.raceTo ? (
                    <Box>
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 0.8 }}>
                        FORMAT
                      </Typography>
                      <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>
                        Race to {selectedFriendly.raceTo} racks — no clock.
                      </Typography>
                    </Box>
                  ) : null}

                  {selectedFriendly && canShareInvite(selectedFriendly) ? (
                    <Box>
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 0.8 }}>
                        INVITE LINK
                      </Typography>
                      <Stack spacing={1}>
                        <TextField
                          fullWidth
                          size="small"
                          value={inviteLinkFor(selectedFriendly)}
                          slotProps={{ htmlInput: { readOnly: true } }}
                        />
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                          <Button size="small" variant="contained" onClick={() => copyInviteLink(selectedFriendly)}>
                            Copy link
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            component="a"
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `Friendly invite (${selectedFriendly.requesterTeam} vs ${selectedFriendly.recipientTeam}): ${inviteLinkFor(selectedFriendly)}`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            WhatsApp
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  ) : null}

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
