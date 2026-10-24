import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { Link, Navigate, useOutletContext } from 'react-router-dom'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import { useAppData } from '../context/AppContext'
import { api } from '../lib/api'
import type { FriendlyRequest, MatchAnnouncement, TeamProfile, TournamentItem, TournamentStatus } from '../types'
import { useAutoHide } from '../lib/useAutoHide'
import { getTournamentStatus } from '../lib/tournamentStatus'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInAccountId: string | null
  loggedInTeam: string | null
}

type CreateFormKey = 'match' | 'friendly' | 'team' | 'result' | 'tournament' | 'manage'

const sports: MatchAnnouncement['sport'][] = ['Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table']
const bookingsPageSize = 5
const refereeNames = ['M. Reyes', 'S. Okafor', 'D. Whitman', 'L. Tanaka', 'P. Mensah', 'A. Carter', 'R. Singh']

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

export function TeamDashboardPage() {
  const { loggedInUser, loggedInRole, loggedInAccountId, loggedInTeam } = useOutletContext<AuthOutletContext>()
  const { team, createTeam, addResultReport, friendlies } = useAppData()

  const [myMatches, setMyMatches] = useState<MatchAnnouncement[]>([])
  const [loadingMyMatches, setLoadingMyMatches] = useState(false)

  const [teamOptions, setTeamOptions] = useState<{ name: string; logoUrl?: string }[]>([])
  const [groundOptions, setGroundOptions] = useState<string[]>([])

  const [globalMessage, setGlobalMessage] = useState('')
  const [globalError, setGlobalError] = useState('')
  useAutoHide(globalMessage, () => setGlobalMessage(''))
  useAutoHide(globalError, () => setGlobalError(''))
  const [showSignedIn, setShowSignedIn] = useState(true)
  useAutoHide(loggedInUser ?? '', () => setShowSignedIn(false), 5000)
  const [openCreateForm, setOpenCreateForm] = useState<CreateFormKey | null>(null)

  const [awayTeam, setAwayTeam] = useState('')
  const [venue, setVenue] = useState('')
  const [kickoff, setKickoff] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(90)
  const [category, setCategory] = useState<MatchAnnouncement['category']>('League')
  const [sport, setSport] = useState<MatchAnnouncement['sport']>('Football')
  const [comment, setComment] = useState('')

  const [friendlyTeamName, setFriendlyTeamName] = useState('')
  const [friendlyContact, setFriendlyContact] = useState('')
  const [friendlyPreferredDate, setFriendlyPreferredDate] = useState('')
  const [friendlyPreferredTime, setFriendlyPreferredTime] = useState('')
  const [friendlyLocation, setFriendlyLocation] = useState('')
  const [friendlyReferee, setFriendlyReferee] = useState('')
  const [friendlyNote, setFriendlyNote] = useState('')

  const [teamName, setTeamName] = useState(team.name)
  const [manager, setManager] = useState(team.manager)
  const [county, setCounty] = useState(team.county)
  const [homeGround, setHomeGround] = useState(team.homeGround)
  const [level, setLevel] = useState<TeamProfile['level']>(team.level)
  const [bio, setBio] = useState(team.bio)
  const [logoUrl, setLogoUrl] = useState(team.logoUrl ?? '')
  const [isDragOver, setIsDragOver] = useState(false)

  const [resultHomeTeam, setResultHomeTeam] = useState('')
  const [resultAwayTeam, setResultAwayTeam] = useState('')
  const [resultHomeScore, setResultHomeScore] = useState<number>(0)
  const [resultAwayScore, setResultAwayScore] = useState<number>(0)
  const [resultVenue, setResultVenue] = useState('')
  const [resultPlayedOn, setResultPlayedOn] = useState('')
  const [resultReportedBy, setResultReportedBy] = useState('')

  const [tournaments, setTournaments] = useState<TournamentItem[]>([])
  const [statusClock, setStatusClock] = useState(Date.now())
  const [dashboardFriendlies, setDashboardFriendlies] = useState<FriendlyRequest[]>([])
  const [tournamentName, setTournamentName] = useState('')
  const [tournamentSport, setTournamentSport] = useState<MatchAnnouncement['sport']>('Football')
  const [tournamentFormat, setTournamentFormat] = useState('Knockout')
  const [tournamentVenue, setTournamentVenue] = useState('')
  const [tournamentStartDate, setTournamentStartDate] = useState('')
  const [tournamentEndDate, setTournamentEndDate] = useState('')
  const [tournamentStatus, setTournamentStatus] = useState<TournamentStatus>('upcoming')
  const [selectedBookingStatusFilter, setSelectedBookingStatusFilter] = useState<'all' | 'accepted' | 'pending' | 'declined'>('all')
  const [bookingSortDirection, setBookingSortDirection] = useState<'desc' | 'asc'>('desc')
  const [currentBookingPage, setCurrentBookingPage] = useState(1)
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<string | null>(null)
  const [showMatchHistory, setShowMatchHistory] = useState(false)

  const [editingKickoffByMatchId, setEditingKickoffByMatchId] = useState<Record<string, string>>({})
  const [editingHomeScoreByMatchId, setEditingHomeScoreByMatchId] = useState<Record<string, number>>({})
  const [editingAwayScoreByMatchId, setEditingAwayScoreByMatchId] = useState<Record<string, number>>({})

  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const isManagementRole =
    normalizedRole === 'tm' ||
    normalizedRole === 'coach' ||
    normalizedRole === 'captain' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'superadmin'
  const canAccessDashboard = Boolean(loggedInUser && isManagementRole)
  const canCreateTeam = Boolean(loggedInUser && isManagementRole)
  const canCreateMatches = canCreateTeam

  const teamNames = useMemo(() => teamOptions.map((option) => option.name), [teamOptions])
  const engagedFriendlies = useMemo(() => {
    const matchesAccount = (friendly: FriendlyRequest) => {
      if (!loggedInAccountId) {
        return false
      }

      return (
        String(friendly.requesterAccountId) === String(loggedInAccountId) ||
        String(friendly.recipientAccountId) === String(loggedInAccountId)
      )
    }

    if (loggedInAccountId) {
      return dashboardFriendlies.filter((friendly) => matchesAccount(friendly))
    }

    if (loggedInTeam) {
      return dashboardFriendlies.filter(
        (friendly) =>
          friendly.requesterTeam === loggedInTeam || friendly.recipientTeam === loggedInTeam,
      )
    }

    return []
  }, [dashboardFriendlies, loggedInAccountId, loggedInTeam])
  const filteredBookingFriendlies = useMemo(() => {
    if (selectedBookingStatusFilter === 'all') {
      return engagedFriendlies
    }

    return engagedFriendlies.filter((friendly) => friendly.status === selectedBookingStatusFilter)
  }, [engagedFriendlies, selectedBookingStatusFilter])
  const sortedBookingFriendlies = useMemo(() => {
    const list = [...filteredBookingFriendlies]
    list.sort((a, b) => {
      const dateA = new Date(`${a.preferredDate}T${a.preferredTime || '00:00'}`).getTime()
      const dateB = new Date(`${b.preferredDate}T${b.preferredTime || '00:00'}`).getTime()
      return bookingSortDirection === 'asc' ? dateA - dateB : dateB - dateA
    })
    return list
  }, [bookingSortDirection, filteredBookingFriendlies])
  const bookingTotalPages = Math.max(1, Math.ceil(sortedBookingFriendlies.length / bookingsPageSize))
  const pagedBookingFriendlies = useMemo(() => {
    const start = (currentBookingPage - 1) * bookingsPageSize
    return sortedBookingFriendlies.slice(start, start + bookingsPageSize)
  }, [currentBookingPage, sortedBookingFriendlies])
  const bookingRangeStart = sortedBookingFriendlies.length === 0 ? 0 : (currentBookingPage - 1) * bookingsPageSize + 1
  const bookingRangeEnd = Math.min(currentBookingPage * bookingsPageSize, sortedBookingFriendlies.length)
  const featuredFriendly = sortedBookingFriendlies[0]
  const acceptedBookingsCount = sortedBookingFriendlies.filter((item) => item.status === 'accepted').length
  const declinedBookingsCount = sortedBookingFriendlies.filter((item) => item.status === 'declined').length
  const playedBookingsCount = acceptedBookingsCount + declinedBookingsCount
  const bookingsWinRate = playedBookingsCount === 0 ? 0 : Math.round((acceptedBookingsCount / playedBookingsCount) * 100)
  const scheduledRuntimeMatches = useMemo(
    () => myMatches.filter((match) => getMatchRuntimeStatus(match.kickoff, match.durationMinutes) === 'scheduled'),
    [myMatches],
  )
  const playingRuntimeMatches = useMemo(
    () => myMatches.filter((match) => getMatchRuntimeStatus(match.kickoff, match.durationMinutes) === 'playing'),
    [myMatches],
  )
  const finishedRuntimeMatches = useMemo(
    () => myMatches.filter((match) => getMatchRuntimeStatus(match.kickoff, match.durationMinutes) === 'finished'),
    [myMatches],
  )
  const engagedTournaments = useMemo(() => {
    if (!loggedInTeam) {
      return []
    }

    return tournaments.map((tournament) => ({
      ...tournament,
      status: getTournamentStatus(tournament, statusClock),
    })).filter(
      (tournament) =>
        tournament.ownerTeam === loggedInTeam ||
        tournament.registeredTeams.includes(loggedInTeam),
    )
  }, [loggedInTeam, statusClock, tournaments])

  useEffect(() => {
    const timer = window.setInterval(() => setStatusClock(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setTeamName(team.name)
    setManager(team.manager)
    setCounty(team.county)
    setHomeGround(team.homeGround)
    setLevel(team.level)
    setBio(team.bio)
    setLogoUrl(team.logoUrl ?? '')
  }, [team])

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [teamResponse, groundResponse] = await Promise.all([api.getTeams(), api.getGrounds()])
        setTeamOptions(teamResponse.teams)
        setGroundOptions(groundResponse.grounds)
      } catch {
        setGlobalError('Failed to load teams and grounds from backend.')
      }
    }

    void loadOptions()
  }, [])

  const loadMyMatches = async () => {
    const token = api.getToken()
    if (!token) {
      return
    }

    setLoadingMyMatches(true)
    try {
      const matches = await api.getMyMatches(token)
      setMyMatches(matches)
      setEditingKickoffByMatchId(
        Object.fromEntries(matches.map((match) => [match.id, match.kickoff.slice(0, 16)])),
      )
      setEditingHomeScoreByMatchId(
        Object.fromEntries(matches.map((match) => [match.id, match.homeScore ?? 0])),
      )
      setEditingAwayScoreByMatchId(
        Object.fromEntries(matches.map((match) => [match.id, match.awayScore ?? 0])),
      )
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to load your matches.')
    } finally {
      setLoadingMyMatches(false)
    }
  }

  useEffect(() => {
    void loadMyMatches()
  }, [])

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const response = await api.getTournaments()
        setTournaments(response)
      } catch {
        // Keep dashboard usable even when tournaments API is unavailable.
      }
    }

    void loadTournaments()
  }, [])

  useEffect(() => {
    setDashboardFriendlies(friendlies)
  }, [friendlies])

  useEffect(() => {
    setCurrentBookingPage((prev) => Math.min(prev, bookingTotalPages))
  }, [bookingTotalPages])

  if (!canAccessDashboard) {
    return <Navigate to="/" replace />
  }

  const handleCreateMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canCreateMatches) {
      setGlobalError('Only TM, Coach, or captain can create matches.')
      return
    }

    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in before creating a match.')
      return
    }

    try {
      await api.createMatch(
        {
          awayTeam,
          venue,
          kickoff: new Date(kickoff).toISOString(),
          durationMinutes,
          category,
          sport,
          comment,
        },
        token,
      )
      setAwayTeam('')
      setVenue('')
      setKickoff('')
      setDurationMinutes(90)
      setCategory('League')
      setSport('Football')
      setComment('')
      setOpenCreateForm(null)
      setGlobalError('')
      setGlobalMessage('Match created successfully.')
      await loadMyMatches()
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to create match.')
    }
  }

  const handleCreateFriendly = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canCreateMatches) {
      setGlobalError('Only TM, Coach, or captain can send friendly requests.')
      return
    }

    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in before sending a friendly request.')
      return
    }

    try {
      await api.createFriendlyRequest(
        {
          teamName: friendlyTeamName,
          contact: friendlyContact,
          preferredDate: friendlyPreferredDate,
          preferredTime: friendlyPreferredTime,
          location: friendlyLocation,
          note: friendlyNote,
          referee: friendlyReferee,
        },
        token,
      )
      setFriendlyTeamName('')
      setFriendlyContact('')
      setFriendlyPreferredDate('')
      setFriendlyPreferredTime('')
      setFriendlyLocation('')
      setFriendlyReferee('')
      setFriendlyNote('')
      setOpenCreateForm(null)
      setGlobalError('')
      setGlobalMessage('Friendly request sent.')
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to create friendly request.')
    }
  }

  const handleLogoFile = (file: File | null) => {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setGlobalError('Please upload an image file for the team logo.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canCreateTeam) {
      setGlobalError('Only TM, Coach, or captain can create a team.')
      return
    }

    try {
      await createTeam({
        name: teamName,
        manager,
        county,
        homeGround,
        level,
        bio,
        logoUrl: logoUrl.trim() || undefined,
      })
      setOpenCreateForm(null)
      setGlobalError('')
      setGlobalMessage('Team saved successfully.')
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to save team.')
    }
  }

  const handleCreateResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await addResultReport({
        homeTeam: resultHomeTeam,
        awayTeam: resultAwayTeam,
        homeScore: resultHomeScore,
        awayScore: resultAwayScore,
        venue: resultVenue,
        playedOn: resultPlayedOn,
        reportedBy: resultReportedBy,
      })
      setResultHomeTeam('')
      setResultAwayTeam('')
      setResultHomeScore(0)
      setResultAwayScore(0)
      setResultVenue('')
      setResultPlayedOn('')
      setResultReportedBy('')
      setOpenCreateForm(null)
      setGlobalError('')
      setGlobalMessage('Result submitted successfully.')
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to submit result.')
    }
  }

  const handleCreateTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const safeName = tournamentName.trim()
    const safeVenue = tournamentVenue.trim()

    if (!safeName || !safeVenue || !tournamentStartDate || !tournamentEndDate) {
      setGlobalError('Please complete all required tournament fields.')
      return
    }

    if (new Date(tournamentEndDate).getTime() < new Date(tournamentStartDate).getTime()) {
      setGlobalError('End date must be on or after start date.')
      return
    }

    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in before creating a tournament.')
      return
    }

    const createdTournament: TournamentItem = {
      id: `temp-${Date.now()}`,
      sport: tournamentSport,
      format: tournamentFormat.trim(),
      name: safeName,
      period: formatPeriod(tournamentStartDate, tournamentEndDate),
      venue: safeVenue,
      status: tournamentStatus,
      ownerTeam: loggedInTeam ?? '',
      registeredTeams: loggedInTeam ? [loggedInTeam] : [],
    }

    try {
      const savedTournament = await api.createTournament(
        {
          sport: createdTournament.sport,
          format: createdTournament.format,
          name: createdTournament.name,
          period: createdTournament.period,
          startDate: tournamentStartDate,
          endDate: tournamentEndDate,
          venue: createdTournament.venue,
          status: createdTournament.status,
          registeredTeams: createdTournament.registeredTeams,
        },
        token,
      )
      setTournaments((prev) => [savedTournament, ...prev])
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to create tournament.')
      return
    }

    setTournamentName('')
    setTournamentSport('Football')
    setTournamentFormat('Knockout')
    setTournamentVenue('')
    setTournamentStartDate('')
    setTournamentEndDate('')
    setTournamentStatus('upcoming')
    setOpenCreateForm(null)
    setGlobalError('')
    setGlobalMessage('Tournament created successfully.')
  }

  const handleKickoffUpdate = async (matchId: string) => {
    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in to update kickoff.')
      return
    }

    const kickoffValue = editingKickoffByMatchId[matchId]
    if (!kickoffValue) {
      setGlobalError('Kickoff is required.')
      return
    }

    try {
      await api.updateMatchKickoff(matchId, new Date(kickoffValue).toISOString(), token)
      setGlobalError('')
      setGlobalMessage('Kickoff updated.')
      await loadMyMatches()
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to update kickoff.')
    }
  }

  const handleScoreUpdate = async (matchId: string) => {
    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in to update score.')
      return
    }

    try {
      await api.updateMatchScore(
        matchId,
        editingHomeScoreByMatchId[matchId] ?? 0,
        editingAwayScoreByMatchId[matchId] ?? 0,
        token,
      )
      setGlobalError('')
      setGlobalMessage('Score updated.')
      await loadMyMatches()
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to update score.')
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in to delete a match.')
      return
    }

    try {
      await api.deleteMatch(matchId, token)
      setGlobalError('')
      setGlobalMessage('Match deleted.')
      await loadMyMatches()
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to delete match.')
    }
  }

  const handleAcceptFriendlyFromHub = async (requestId: string) => {
    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in to accept friendly requests.')
      return
    }

    try {
      await api.acceptFriendlyRequest(requestId, token)
      setDashboardFriendlies((prev) =>
        prev.map((friendly) =>
          friendly.id === requestId
            ? { ...friendly, status: 'accepted', respondedAt: new Date().toISOString() }
            : friendly,
        ),
      )
      setGlobalError('')
      setGlobalMessage('Friendly accepted and match scheduled.')
      await loadMyMatches()
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to accept friendly request.')
    }
  }

  const handleDeclineFriendlyFromHub = async (requestId: string) => {
    const token = api.getToken()
    if (!token) {
      setGlobalError('Please log in to decline friendly requests.')
      return
    }

    try {
      await api.declineFriendlyRequest(requestId, token)
      setDashboardFriendlies((prev) =>
        prev.map((friendly) =>
          friendly.id === requestId
            ? { ...friendly, status: 'declined', respondedAt: new Date().toISOString() }
            : friendly,
        ),
      )
      setGlobalError('')
      setGlobalMessage('Friendly request declined.')
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to decline friendly request.')
    }
  }

  const toggleCreateForm = (key: CreateFormKey) => {
    if ((key === 'match' || key === 'friendly' || key === 'manage') && !canCreateMatches) {
      setGlobalError('Only TM, Coach, or captain can access match management tools.')
      return
    }

    setOpenCreateForm((prev) => (prev === key ? null : key))
  }

  const renderManagedMatchCard = (match: MatchAnnouncement) => {
    const kickoffTime = new Date(match.kickoff)
    const hasStarted = Number.isFinite(kickoffTime.getTime()) && kickoffTime.getTime() <= Date.now()
    const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes)
    const canEditMatch = Boolean(loggedInTeam && match.createdByTeam === loggedInTeam)
    const hasScore = match.homeScore !== undefined && match.awayScore !== undefined

    const getStatusChipColor = (status: string) => {
      if (status === 'finished') return { bg: 'rgba(96,165,64,0.2)', text: '#60a540', border: 'rgba(96,165,64,0.5)' }
      if (status === 'playing') return { bg: 'rgba(255,152,0,0.2)', text: '#ff9800', border: 'rgba(255,152,0,0.5)' }
      return { bg: 'rgba(100,120,160,0.2)', text: '#6478a0', border: 'rgba(100,120,160,0.5)' }
    }

    const statusColors = getStatusChipColor(runtimeStatus)

    return (
      <Card
        key={match.id}
        variant="outlined"
        sx={{
          borderRadius: 2.2,
          borderColor: 'rgba(159,176,201,0.16)',
          bgcolor: 'rgba(13,22,40,0.7)',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            {/* Match Header: Teams and Score */}
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                <Box sx={{ fontSize: '1.2rem' }}>⚽</Box>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {match.homeTeam}
                  </Typography>
                  <Typography sx={{ color: '#8f9ab4', fontSize: '0.85rem', fontWeight: 500 }}>vs</Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {match.awayTeam}
                  </Typography>
                </Stack>
              </Stack>

              {hasScore && (
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#adff0f', minWidth: 'fit-content' }}>
                  {match.homeScore} - {match.awayScore}
                </Typography>
              )}

              <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={runtimeStatus.toUpperCase()}
                  size="small"
                  sx={{
                    bgcolor: statusColors.bg,
                    color: statusColors.text,
                    border: `1px solid ${statusColors.border}`,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 24,
                  }}
                />
                <Box sx={{ color: '#8f9ab4', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem' }}>›</span>
                </Box>
              </Stack>
            </Stack>

            {/* Match Details: Date, Time, Category */}
            <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', fontSize: '0.85rem', color: '#8f9ab4' }}>
              <Typography sx={{ fontSize: '0.85rem', color: '#8f9ab4' }}>
                {new Date(match.kickoff).toLocaleString()}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: '#6f7a8f', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                {match.category}
              </Typography>
            </Stack>

            {/* Venue */}
            <Typography sx={{ fontSize: '0.8rem', color: '#a0a8c0' }}>
              📍 {match.venue}
            </Typography>

            {/* Edit Section (only for team that created the match) */}
            {canEditMatch && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(137,151,178,0.1)' }}>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: 'flex-end' }}>
                    <TextField
                      label="Kickoff"
                      type="datetime-local"
                      size="small"
                      value={editingKickoffByMatchId[match.id] ?? ''}
                      onChange={(event) =>
                        setEditingKickoffByMatchId((prev) => ({
                          ...prev,
                          [match.id]: event.target.value,
                        }))
                      }
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={{ flex: 1, minWidth: '150px' }}
                    />
                    <Button variant="outlined" size="small" onClick={() => void handleKickoffUpdate(match.id)}>
                      Update
                    </Button>
                  </Stack>

                  {hasStarted && (
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: 'flex-end' }}>
                      <TextField
                        label="Home Score"
                        type="number"
                        size="small"
                        value={editingHomeScoreByMatchId[match.id] ?? 0}
                        onChange={(event) =>
                          setEditingHomeScoreByMatchId((prev) => ({
                            ...prev,
                            [match.id]: Number(event.target.value),
                          }))
                        }
                        slotProps={{ htmlInput: { min: 0 } }}
                        sx={{ minWidth: '100px' }}
                      />
                      <TextField
                        label="Away Score"
                        type="number"
                        size="small"
                        value={editingAwayScoreByMatchId[match.id] ?? 0}
                        onChange={(event) =>
                          setEditingAwayScoreByMatchId((prev) => ({
                            ...prev,
                            [match.id]: Number(event.target.value),
                          }))
                        }
                        slotProps={{ htmlInput: { min: 0 } }}
                        sx={{ minWidth: '100px' }}
                      />
                      <Button variant="outlined" size="small" onClick={() => void handleScoreUpdate(match.id)}>
                        Update Score
                      </Button>
                    </Stack>
                  )}

                  {!hasStarted && (
                    <Typography variant="body2" sx={{ color: '#8f9ab4', fontSize: '0.75rem', fontStyle: 'italic' }}>
                      ℹ️ Scores can only be updated after match starts
                    </Typography>
                  )}

                  <Button color="error" variant="outlined" size="small" onClick={() => void handleDeleteMatch(match.id)}>
                    Delete Match
                  </Button>
                </Stack>
              </Box>
            )}

            {!canEditMatch && (
              <Typography sx={{ fontSize: '0.8rem', color: '#8f9ab4', fontStyle: 'italic', mt: 1 }}>
                💡 Only team managers can edit this match
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const getBookingMatchId = (requestId: string) => {
    const hash = requestId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return `#M-${2000 + (hash % 8000)}`
  }

  const getBookingReferee = (requestId: string) => {
    const hash = requestId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return refereeNames[hash % refereeNames.length]
  }

  const getBookingStatusLabel = (status: 'pending' | 'accepted' | 'declined') => {
    if (status === 'accepted') {
      return 'Accepted'
    }
    if (status === 'declined') {
      return 'Cancelled'
    }
    return 'Pending'
  }

  const getBookingStatusColors = (status: 'pending' | 'accepted' | 'declined') => {
    if (status === 'accepted') {
      return { text: '#20d7a0', border: 'rgba(32,215,160,0.42)', bg: 'rgba(32,215,160,0.12)' }
    }
    if (status === 'declined') {
      return { text: '#ff6b75', border: 'rgba(255,107,117,0.42)', bg: 'rgba(255,107,117,0.12)' }
    }
    return { text: '#ffc44d', border: 'rgba(255,196,77,0.42)', bg: 'rgba(255,196,77,0.12)' }
  }

  const formatBookingDateTime = (preferredDate: string, preferredTime: string) => {
    const parsed = new Date(`${preferredDate}T${preferredTime || '00:00'}`)
    if (!Number.isFinite(parsed.getTime())) {
      return `${preferredDate} · ${preferredTime}`
    }

    return parsed.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <Stack spacing={3}>
    

      {!loggedInUser && <Alert severity="info">Log in to use dashboard creation tools.</Alert>}

      {loggedInUser && showSignedIn && (
        <Alert severity="success" onClose={() => setShowSignedIn(false)}>
          Signed in as {loggedInUser}
          {loggedInTeam ? ` · ${loggedInTeam}` : ''}
          {loggedInRole ? ` · ${loggedInRole}` : ''}
        </Alert>
      )}

      {globalError && <Alert severity="error">{globalError}</Alert>}
      {globalMessage && <Alert severity="success">{globalMessage}</Alert>}

      {openCreateForm === null ? (
        <Card
          variant="outlined"
          sx={{
            position: 'sticky',
            top: 12,
            zIndex: 5,
            backdropFilter: 'blur(6px)',
            bgcolor: 'rgba(16, 24, 40, 0.8)',
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 1,
              }}
            >
              {canCreateMatches && (
                <Button variant="contained" onClick={() => toggleCreateForm('match')}>
                  Create Match
                </Button>
              )}
              {canCreateMatches && (
                <Button variant="contained" onClick={() => toggleCreateForm('friendly')}>
                  Request Friendly
                </Button>
              )}
              <Button variant="contained" onClick={() => toggleCreateForm('team')}>
                Create or Update Team
              </Button>
              <Button variant="contained" onClick={() => toggleCreateForm('result')}>
                Submit Result
              </Button>
              <Button variant="contained" onClick={() => toggleCreateForm('tournament')}>
                Create Tournament
              </Button>
              {canCreateMatches && (
                <Button variant="contained" onClick={() => toggleCreateForm('manage')}>
                  Manage My Matches
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Card
            variant="outlined"
            sx={{
              width: '100%',
              maxWidth: openCreateForm === 'match' ? 980 : 620,
              borderColor: 'rgba(137,151,178,0.18)',
              bgcolor: 'rgba(10,12,20,0.95)',
            }}
          >
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {openCreateForm === 'match' && 'Create New Match'}
                  {openCreateForm === 'friendly' && 'Request Friendly'}
                  {openCreateForm === 'team' && 'Create or Update Team'}
                  {openCreateForm === 'result' && 'Submit Result'}
                  {openCreateForm === 'tournament' && 'Create Tournament'}
                  {openCreateForm === 'manage' && 'Manage My Matches'}
                </Typography>
                <Button variant="text" onClick={() => setOpenCreateForm(null)} sx={{ color: '#a8b0c4', textTransform: 'none' }}>
                  ← Back to all forms
                </Button>
              </Stack>

              {openCreateForm === 'match' && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 280px' },
                    gap: 2,
                    alignItems: 'start',
                  }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      borderColor: 'rgba(137,151,178,0.2)',
                      background: 'linear-gradient(180deg, rgba(22,24,35,0.96) 0%, rgba(19,21,31,0.96) 100%)',
                    }}
                  >
                    <CardContent>
                      <Box
                        component="form"
                        onSubmit={handleCreateMatch}
                        sx={{
                          border: '1px dashed rgba(188,198,220,0.46)',
                          borderRadius: 2,
                          p: 1.2,
                          display: 'grid',
                          gap: 1.2,
                        }}
                      >
                        <TextField
                          select
                          label="Away Team *"
                          placeholder="Select team..."
                          value={awayTeam}
                          onChange={(event) => setAwayTeam(event.target.value)}
                          required
                        >
                          {teamOptions
                            .filter((option) => option.name !== loggedInTeam)
                            .map((option) => (
                              <MenuItem key={option.name} value={option.name}>
                                {option.name}
                              </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                          select
                          label="Venue *"
                          placeholder="Select location..."
                          value={venue}
                          onChange={(event) => setVenue(event.target.value)}
                          required
                        >
                          {groundOptions.map((groundOption) => (
                            <MenuItem key={groundOption} value={groundOption}>
                              {groundOption}
                            </MenuItem>
                          ))}
                        </TextField>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2 }}>
                          <TextField
                            label="Kickoff *"
                            type="datetime-local"
                            value={kickoff}
                            onChange={(event) => setKickoff(event.target.value)}
                            required
                            slotProps={{ inputLabel: { shrink: true } }}
                          />
                          <TextField
                            label="Duration (Min) *"
                            type="number"
                            value={durationMinutes}
                            onChange={(event) => setDurationMinutes(Number(event.target.value))}
                            slotProps={{ htmlInput: { min: 1 } }}
                            required
                          />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2 }}>
                          <TextField
                            select
                            label="Category *"
                            value={category}
                            onChange={(event) => setCategory(event.target.value as MatchAnnouncement['category'])}
                            required
                          >
                            <MenuItem value="League">League</MenuItem>
                            <MenuItem value="Friendly">Friendly</MenuItem>
                            <MenuItem value="Cup">Cup</MenuItem>
                          </TextField>
                          <TextField
                            select
                            label="Sport *"
                            value={sport}
                            onChange={(event) => setSport(event.target.value as MatchAnnouncement['sport'])}
                            required
                          >
                            {sports.map((sportItem) => (
                              <MenuItem key={sportItem} value={sportItem}>
                                {sportItem}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Box>

                        <TextField
                          label="Additional Comments"
                          placeholder="Special instructions for the match..."
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          multiline
                          rows={4}
                        />

                        <Button
                          type="submit"
                          variant="contained"
                          disabled={!loggedInUser}
                          sx={{
                            mt: 0.4,
                            borderRadius: 1.6,
                            py: 1.1,
                            fontWeight: 900,
                            fontSize: '1.02rem',
                            color: '#102000',
                            bgcolor: '#a8ff04',
                            '&:hover': { bgcolor: '#98e700' },
                          }}
                        >
                          ⊕ Create match
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>

                  <Stack spacing={1.6}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2.4,
                        borderColor: 'rgba(137,151,178,0.2)',
                        bgcolor: 'rgba(28,30,44,0.92)',
                      }}
                    >
                      <CardContent>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.28rem', mb: 0.6 }}>Match Summary</Typography>
                        <Typography sx={{ color: '#9da6bb', fontSize: '0.9rem', mb: 1.2 }}>
                          Fill out the form to generate a new match card. Once created, teams receive an automated notification.
                        </Typography>

                        <Box sx={{ borderRadius: 2, bgcolor: 'rgba(17,19,30,0.8)', p: 1.2, border: '1px solid rgba(137,151,178,0.16)' }}>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ color: '#dce3f7', fontWeight: 700, fontSize: '0.86rem' }}>{loggedInTeam || 'Home team'}</Typography>
                            <Typography sx={{ color: '#6f7792', fontWeight: 800, fontSize: '0.76rem' }}>VS</Typography>
                            <Typography sx={{ color: '#dce3f7', fontWeight: 700, fontSize: '0.86rem', textAlign: 'right' }}>{awayTeam || 'Away team'}</Typography>
                          </Stack>
                          <Typography sx={{ color: '#77809a', fontSize: '0.75rem', mt: 1 }}>
                            {venue || 'Venue'}
                          </Typography>
                          <Typography sx={{ color: '#77809a', fontSize: '0.75rem', mt: 0.3 }}>
                            {kickoff ? new Date(kickoff).toLocaleString() : 'Kickoff'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>

                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2.4,
                        borderColor: 'rgba(126,214,56,0.42)',
                        bgcolor: 'rgba(20,37,16,0.85)',
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.7 }}>
                          <Box sx={{ width: 26, height: 26, borderRadius: 1, bgcolor: 'rgba(168,255,4,0.24)', display: 'grid', placeItems: 'center', color: '#a8ff04' }}>
                            <LightbulbOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                          </Box>
                          <Typography sx={{ fontWeight: 800 }}>Pro Tip</Typography>
                        </Stack>
                        <Typography sx={{ color: '#9dc08d', fontSize: '0.82rem' }}>
                          Selecting a verified venue helps attach ground coordinates and facilities to the match invitation.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                </Box>
              )}

              {openCreateForm === 'friendly' && (
                <Box component="form" onSubmit={handleCreateFriendly} sx={{ display: 'grid', gap: 1.25 }}>
                  <TextField
                    select
                    label="Team"
                    value={friendlyTeamName}
                    onChange={(event) => setFriendlyTeamName(event.target.value)}
                    required
                  >
                    {teamOptions
                      .filter((option) => option.name !== loggedInTeam)
                      .map((option) => (
                        <MenuItem key={option.name} value={option.name}>
                          {option.name}
                        </MenuItem>
                      ))}
                  </TextField>
                  <TextField
                    label="Contact"
                    value={friendlyContact}
                    onChange={(event) => setFriendlyContact(event.target.value)}
                    placeholder="Phone / Email"
                    required
                  />
                  <TextField
                    label="Preferred date"
                    type="date"
                    value={friendlyPreferredDate}
                    onChange={(event) => setFriendlyPreferredDate(event.target.value)}
                    required
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="Preferred time"
                    type="time"
                    value={friendlyPreferredTime}
                    onChange={(event) => setFriendlyPreferredTime(event.target.value)}
                    required
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    select
                    label="Ground"
                    value={friendlyLocation}
                    onChange={(event) => setFriendlyLocation(event.target.value)}
                    required
                  >
                    {groundOptions.map((groundOption) => (
                      <MenuItem key={groundOption} value={groundOption}>
                        {groundOption}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Referee"
                    value={friendlyReferee}
                    onChange={(event) => setFriendlyReferee(event.target.value)}
                    required
                  >
                    {refereeNames.map((refereeName) => (
                      <MenuItem key={refereeName} value={refereeName}>
                        {refereeName}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Note"
                    value={friendlyNote}
                    onChange={(event) => setFriendlyNote(event.target.value)}
                    multiline
                    rows={2}
                    required
                  />
                  <Button type="submit" variant="contained" disabled={!loggedInUser}>
                    Send request
                  </Button>
                </Box>
              )}

              {openCreateForm === 'team' && (
                <>
                  {!canCreateTeam && (
                    <Alert severity="info" sx={{ mb: 1.5 }}>
                      Only TM, Coach, or captain can create a team.
                    </Alert>
                  )}
                  <Box component="form" onSubmit={handleSaveTeam} sx={{ display: 'grid', gap: 1.25 }}>
                    <TextField label="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
                    <TextField label="Manager" value={manager} onChange={(event) => setManager(event.target.value)} required />
                    <TextField label="County" value={county} onChange={(event) => setCounty(event.target.value)} required />
                    <TextField label="Home ground" value={homeGround} onChange={(event) => setHomeGround(event.target.value)} required />
                    <TextField select label="Level" value={level} onChange={(event) => setLevel(event.target.value as TeamProfile['level'])} required>
                      <MenuItem value="Junior">Junior</MenuItem>
                      <MenuItem value="Amateur">Amateur</MenuItem>
                      <MenuItem value="Semi-Pro">Semi-Pro</MenuItem>
                    </TextField>
                    <TextField
                      label="Team logo file (optional)"
                      type="file"
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { accept: 'image/*' } }}
                      onChange={(event) => {
                        const input = event.target as HTMLInputElement
                        handleLogoFile(input.files?.[0] ?? null)
                      }}
                      helperText="Upload an image to use as the team logo."
                    />
                    <Box
                      onDragOver={(event) => {
                        event.preventDefault()
                        setIsDragOver(true)
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(event) => {
                        event.preventDefault()
                        setIsDragOver(false)
                        handleLogoFile(event.dataTransfer.files[0] ?? null)
                      }}
                      sx={{
                        border: '1px dashed',
                        borderColor: isDragOver ? 'primary.main' : 'rgba(159,176,201,0.38)',
                        borderRadius: 2,
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDragOver ? 'rgba(76,227,163,0.08)' : 'transparent',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Or drag and drop the logo image here
                      </Typography>
                    </Box>
                    <TextField
                      label="Team logo URL (optional)"
                      type="url"
                      value={logoUrl}
                      onChange={(event) => setLogoUrl(event.target.value)}
                    />
                    <TextField label="Bio" value={bio} onChange={(event) => setBio(event.target.value)} multiline rows={3} required />
                    <Button type="submit" variant="contained" disabled={!canCreateTeam}>
                      Save team
                    </Button>
                  </Box>
                </>
              )}

              {openCreateForm === 'result' && (
                <Box component="form" onSubmit={handleCreateResult} sx={{ display: 'grid', gap: 1.25 }}>
                  <TextField select label="Home team" value={resultHomeTeam} onChange={(event) => setResultHomeTeam(event.target.value)} required>
                    {teamNames.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField select label="Away team" value={resultAwayTeam} onChange={(event) => setResultAwayTeam(event.target.value)} required>
                    {teamNames.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Stack direction="row" spacing={1.25}>
                    <TextField label="Home score" type="number" value={resultHomeScore} onChange={(event) => setResultHomeScore(Number(event.target.value))} slotProps={{ htmlInput: { min: 0 } }} required fullWidth />
                    <TextField label="Away score" type="number" value={resultAwayScore} onChange={(event) => setResultAwayScore(Number(event.target.value))} slotProps={{ htmlInput: { min: 0 } }} required fullWidth />
                  </Stack>
                  <TextField label="Venue" value={resultVenue} onChange={(event) => setResultVenue(event.target.value)} required />
                  <TextField label="Played on" type="date" value={resultPlayedOn} onChange={(event) => setResultPlayedOn(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
                  <TextField label="Reported by" value={resultReportedBy} onChange={(event) => setResultReportedBy(event.target.value)} required />
                  <Button type="submit" variant="contained">
                    Submit result
                  </Button>
                </Box>
              )}

              {openCreateForm === 'tournament' && (
                <>
                  <Box component="form" onSubmit={handleCreateTournament} sx={{ display: 'grid', gap: 1.25 }}>
                    <TextField label="Tournament name" value={tournamentName} onChange={(event) => setTournamentName(event.target.value)} required />
                    <TextField select label="Sport" value={tournamentSport} onChange={(event) => setTournamentSport(event.target.value as MatchAnnouncement['sport'])} required>
                      {sports.map((sportItem) => (
                        <MenuItem key={sportItem} value={sportItem}>
                          {sportItem}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField select label="Format" value={tournamentFormat} onChange={(event) => setTournamentFormat(event.target.value)} required>
                      {['Knockout', 'League', 'Group+Knockout', 'Round Robin'].map((formatItem) => (
                        <MenuItem key={formatItem} value={formatItem}>
                          {formatItem}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField label="Venue" value={tournamentVenue} onChange={(event) => setTournamentVenue(event.target.value)} required />
                    <Stack direction="row" spacing={1.25}>
                      <TextField
                        label="Start date"
                        type="date"
                        value={tournamentStartDate}
                        onChange={(event) => setTournamentStartDate(event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        required
                        fullWidth
                      />
                      <TextField
                        label="End date"
                        type="date"
                        value={tournamentEndDate}
                        onChange={(event) => setTournamentEndDate(event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        required
                        fullWidth
                      />
                    </Stack>
                    <TextField select label="Status" value={tournamentStatus} onChange={(event) => setTournamentStatus(event.target.value as TournamentStatus)} required>
                      <MenuItem value="upcoming">upcoming</MenuItem>
                      <MenuItem value="registration open">registration open</MenuItem>
                      <MenuItem value="ongoing">ongoing</MenuItem>
                    </TextField>
                    <Button type="submit" variant="contained">
                      Create tournament
                    </Button>
                  </Box>

                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {tournaments.slice(0, 3).map((item) => (
                      <Stack key={item.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">
                          {item.name} · {item.period}
                        </Typography>
                        <Chip label={item.status} size="small" />
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}

              {openCreateForm === 'manage' && (
                <>
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'center', mb: 2.5 }}>
                    <Button variant="outlined" onClick={() => void loadMyMatches()} disabled={loadingMyMatches || !loggedInAccountId}>
                      Refresh
                    </Button>
                  </Stack>

                  {!loggedInAccountId && (
                    <Typography color="text.secondary">Log in to manage your team matches.</Typography>
                  )}

                  {loggedInAccountId && myMatches.length === 0 && !loadingMyMatches && (
                    <Typography color="text.secondary">No matches found for your team.</Typography>
                  )}

                  <Stack spacing={3}>
                    {/* SCHEDULED MATCHES SECTION */}
                    <Stack spacing={1.5}>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          color: '#adff0f',
                          textTransform: 'uppercase',
                        }}
                      >
                        • SCHEDULED MATCHES
                      </Typography>
                      {scheduledRuntimeMatches.length === 0 ? (
                        <Card
                          variant="outlined"
                          sx={{
                            borderColor: 'rgba(137,151,178,0.12)',
                            bgcolor: 'rgba(13,22,40,0.6)',
                            borderRadius: 2,
                          }}
                        >
                          <CardContent sx={{ py: 3.5, textAlign: 'center' }}>
                            <Typography color="text.secondary">No scheduled matches right now.</Typography>
                          </CardContent>
                        </Card>
                      ) : (
                        <Stack spacing={1.5}>
                          {scheduledRuntimeMatches.map((match) => renderManagedMatchCard(match))}
                        </Stack>
                      )}
                    </Stack>

                    {/* PLAYING NOW SECTION */}
                    <Stack spacing={1.5}>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          color: '#adff0f',
                          textTransform: 'uppercase',
                        }}
                      >
                        • PLAYING NOW
                      </Typography>
                      {playingRuntimeMatches.length === 0 ? (
                        <Card
                          variant="outlined"
                          sx={{
                            borderColor: 'rgba(137,151,178,0.12)',
                            bgcolor: 'rgba(13,22,40,0.6)',
                            borderRadius: 2,
                          }}
                        >
                          <CardContent sx={{ py: 3.5, textAlign: 'center' }}>
                            <Typography color="text.secondary">No matches playing right now.</Typography>
                          </CardContent>
                        </Card>
                      ) : (
                        <Stack spacing={1.5}>
                          {playingRuntimeMatches.map((match) => renderManagedMatchCard(match))}
                        </Stack>
                      )}
                    </Stack>

                    {/* FINISHED MATCHES SECTION */}
                    <Stack spacing={1.5}>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          color: '#adff0f',
                          textTransform: 'uppercase',
                        }}
                      >
                        • FINISHED MATCHES
                      </Typography>
                      {finishedRuntimeMatches.length === 0 ? (
                        <Card
                          variant="outlined"
                          sx={{
                            borderColor: 'rgba(137,151,178,0.12)',
                            bgcolor: 'rgba(13,22,40,0.6)',
                            borderRadius: 2,
                          }}
                        >
                          <CardContent sx={{ py: 3.5, textAlign: 'center' }}>
                            <Typography color="text.secondary">No finished matches yet.</Typography>
                          </CardContent>
                        </Card>
                      ) : (
                        <Stack spacing={1.5}>
                          {finishedRuntimeMatches.map((match) => renderManagedMatchCard(match))}
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {openCreateForm === null && (
      <Stack spacing={1.6}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: '#7f88a0', fontSize: '0.78rem', letterSpacing: '0.02em' }}>
              Booking · Week of Aug 15 - 22, 2026
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.15, fontSize: { xs: '1.15rem', md: '2.1rem' } }}>
              Match Booking
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CalendarMonthOutlinedIcon sx={{ fontSize: '0.95rem' }} />}
              sx={{ textTransform: 'none', borderColor: 'rgba(159,176,201,0.2)', color: '#9ea7bf', bgcolor: 'rgba(25,28,44,0.95)' }}
            >
              Aug 15, 2026 - Aug 22, 2026
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<IosShareOutlinedIcon sx={{ fontSize: '0.95rem' }} />}
              sx={{ textTransform: 'none', borderColor: 'rgba(159,176,201,0.2)', color: '#d7deef', bgcolor: 'rgba(25,28,44,0.95)' }}
            >
              Export
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '2.05fr 1fr' } }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.2,
              borderColor: 'rgba(159,176,201,0.16)',
              bgcolor: 'rgba(13,16,28,0.92)',
              overflow: 'hidden',
              minHeight: 290,
            }}
          >
            {featuredFriendly ? (
              <>
                <Box
                  sx={{
                    px: 2,
                    py: 1.6,
                    background:
                      'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 7px)',
                    borderBottom: '1px solid rgba(159,176,201,0.12)',
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1.5 }}>
                    <Chip
                      size="small"
                      label={`● ${getBookingStatusLabel(featuredFriendly.status)}`}
                      variant="outlined"
                      sx={{
                        color: getBookingStatusColors(featuredFriendly.status).text,
                        borderColor: getBookingStatusColors(featuredFriendly.status).border,
                        bgcolor: getBookingStatusColors(featuredFriendly.status).bg,
                        '& .MuiChip-label': { fontWeight: 700, fontSize: '0.72rem' },
                      }}
                    />
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                      alignItems: 'center',
                      gap: 1.6,
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{ width: 44, height: 44, bgcolor: 'rgba(65,90,255,0.32)', color: '#b9c5ff', fontWeight: 800 }}>
                        {featuredFriendly.requesterTeam.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: '#8f98af', fontSize: { xs: '0.58rem', md: '0.68rem' }, letterSpacing: '0.08em' }}>HOME</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.45rem', md: '1.85rem' }, lineHeight: 1.05, overflowWrap: 'anywhere' }}>{featuredFriendly.requesterTeam}</Typography>
                      </Box>
                    </Stack>

                    <Box
                      sx={{
                        px: { xs: 1, sm: 1.2 },
                        py: { xs: 0.75, sm: 0.9 },
                        borderRadius: 1.4,
                        bgcolor: '#a3ff00',
                        color: '#0f1a00',
                        fontWeight: 900,
                        fontSize: { xs: '0.75rem', sm: '0.95rem' },
                        letterSpacing: '0.04em',
                      }}
                    >
                      VS
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                        <Typography sx={{ color: '#8f98af', fontSize: { xs: '0.58rem', md: '0.68rem' }, letterSpacing: '0.08em' }}>AWAY</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.45rem', md: '1.85rem' }, lineHeight: 1.05, overflowWrap: 'anywhere' }}>{featuredFriendly.recipientTeam}</Typography>
                      </Box>
                      <Avatar sx={{ width: 44, height: 44, bgcolor: 'rgba(250,204,21,0.2)', color: '#ffdf76', fontWeight: 800 }}>
                        {featuredFriendly.recipientTeam.charAt(0).toUpperCase()}
                      </Avatar>
                    </Stack>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                    borderTop: '1px solid rgba(159,176,201,0.08)',
                  }}
                >
                  {[
                    { label: 'Date', value: formatBookingDateTime(featuredFriendly.preferredDate, featuredFriendly.preferredTime) },
                    { label: 'Category', value: 'two team' },
                    { label: 'Contact', value: featuredFriendly.contact },
                    { label: 'Phone', value: featuredFriendly.contact },
                  ].map((item) => (
                    <Box
                      key={`team-dashboard-featured-${item.label}`}
                      sx={{
                        px: 2,
                        py: 1.3,
                        borderRight: { md: '1px solid rgba(159,176,201,0.08)' },
                        '&:last-child': { borderRight: 'none' },
                      }}
                    >
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.72rem' }}>{item.label}</Typography>
                      <Typography sx={{ fontWeight: 700 }}>{item.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <CardContent>
                <Typography color="text.secondary">No bookings available yet.</Typography>
              </CardContent>
            )}
          </Card>

          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.2,
              borderColor: 'rgba(159,176,201,0.16)',
              bgcolor: 'rgba(13,16,28,0.92)',
              minHeight: 290,
            }}
          >
            <CardContent sx={{ height: '100%' }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'rgba(163,255,0,0.12)',
                    color: '#a3ff00',
                  }}
                >
                  <StarRoundedIcon sx={{ fontSize: '0.92rem' }} />
                </Box>
                <Typography sx={{ color: '#8f98af', fontSize: '0.76rem' }}>All-time</Typography>
              </Stack>

              <Typography sx={{ color: '#7f88a0', fontSize: '0.82rem' }}>Head to Head Statistics</Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', md: '1.65rem' }, mt: 0.3 }}>{playedBookingsCount} Games Played</Typography>

              <Box sx={{ display: 'grid', placeItems: 'center', my: 1.8 }}>
                <Box
                  sx={{
                    width: 118,
                    height: 118,
                    borderRadius: '50%',
                    background: `conic-gradient(#a3ff00 ${bookingsWinRate}%, rgba(89,97,126,0.35) 0)`,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Box sx={{ width: 86, height: 86, borderRadius: '50%', bgcolor: 'rgba(13,16,28,0.95)', display: 'grid', placeItems: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#a3ff00' }}>{bookingsWinRate}%</Typography>
                  </Box>
                </Box>
              </Box>

              <Stack spacing={0.8} sx={{ mt: 1.2 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography sx={{ color: '#9ba4bb', fontSize: '0.82rem' }}>● {loggedInTeam ?? 'Home Team'} Wins</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{acceptedBookingsCount}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography sx={{ color: '#9ba4bb', fontSize: '0.82rem' }}>● Opponent Wins</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{declinedBookingsCount}</Typography>
                </Stack>
              </Stack>

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1.6, textTransform: 'none', borderColor: 'rgba(159,176,201,0.2)' }}
                onClick={() => setShowMatchHistory(true)}
              >
                View Match History
              </Button>
            </CardContent>
          </Card>
        </Box>

        <Card
          variant="outlined"
          sx={{
            borderRadius: 2.2,
            borderColor: 'rgba(159,176,201,0.16)',
            bgcolor: 'rgba(13,16,28,0.92)',
          }}
        >
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
              <Typography sx={{ fontWeight: 700 }}>Active Tournament Passes</Typography>
              <Typography
                component={Link}
                to="/tournaments"
                state={{ showTournamentList: true }}
                sx={{
                  color: '#8f98af',
                  fontSize: '0.82rem',
                  textDecoration: 'none',
                  '&:hover': { color: '#d9e1f2' },
                }}
              >
                Manage all
              </Typography>
            </Stack>

            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              {engagedTournaments.length === 0 && (
                <Typography sx={{ color: '#8f98af', fontSize: '0.86rem', px: 0.2, py: 0.8 }}>
                  No active tournaments for your team yet.
                </Typography>
              )}

              {engagedTournaments.slice(0, 3).map((tournament, index) => {
                const statusText =
                  tournament.status === 'finished'
                    ? `Finished · ${tournament.period}`
                    : tournament.status === 'ongoing'
                    ? `Active now · ${tournament.period}`
                    : tournament.status === 'registration open'
                      ? `Registration open · ${tournament.period}`
                      : `Starts ${tournament.period}`
                const PassIcon = index % 3 === 0
                  ? WorkspacePremiumOutlinedIcon
                  : index % 3 === 1
                    ? EmojiEventsOutlinedIcon
                    : MilitaryTechOutlinedIcon

                return (
                  <Box
                    key={tournament.id}
                    component={Link}
                    to="/tournaments"
                    state={{ openTournamentId: tournament.id }}
                    sx={{
                      border: '1px solid rgba(159,176,201,0.14)',
                      borderRadius: 1.4,
                      px: 1.2,
                      py: 0.9,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      background:
                        'linear-gradient(130deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
                      transition: 'border-color 0.2s ease, transform 0.2s ease',
                      '&:hover': {
                        borderColor: 'rgba(163,255,0,0.45)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'rgba(163,255,0,0.12)',
                          color: '#a3ff00',
                        }}
                      >
                        <PassIcon sx={{ fontSize: '0.9rem' }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{tournament.name}</Typography>
                        <Typography sx={{ color: '#8f98af', fontSize: '0.72rem' }}>{statusText}</Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ width: 40, height: 24, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)' }} />
                  </Box>
                )
              })}
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            borderRadius: 2.2,
            borderColor: 'rgba(159,176,201,0.16)',
            bgcolor: 'rgba(13,16,28,0.92)',
          }}
        >
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
              <Typography sx={{ fontWeight: 700 }}>Available Referees</Typography>
              <Typography sx={{ color: '#8f98af', fontSize: '0.82rem' }}>
                {refereeNames.length} Registered
              </Typography>
            </Stack>

            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              {refereeNames.map((refereeName) => (
                <Box
                  key={refereeName}
                  sx={{
                    border: '1px solid rgba(159,176,201,0.14)',
                    borderRadius: 1.4,
                    px: 1.2,
                    py: 0.9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    background:
                      'linear-gradient(130deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
                    transition: 'border-color 0.2s ease, transform 0.2s ease',
                    '&:hover': {
                      borderColor: 'rgba(163,255,0,0.45)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'rgba(163,255,0,0.12)',
                        color: '#a3ff00',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                      }}
                    >
                      {refereeName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{refereeName}</Typography>
                      <Typography sx={{ color: '#8f98af', fontSize: '0.68rem' }}>Referee</Typography>
                    </Box>
                  </Stack>
                  <Typography sx={{ color: '#8f98af', fontSize: '0.7rem' }}>→</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            borderRadius: 2.2,
            borderColor: 'rgba(159,176,201,0.16)',
            bgcolor: 'rgba(13,16,28,0.92)',
            overflow: 'hidden',
          }}
        >
          <CardContent>
            <Typography sx={{ color: '#7f88a0', fontSize: '0.95rem', mb: 0.6 }}>
              Season 2026-27 · Premier Division
            </Typography>

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.8, gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', md: '1.9rem' } }}>
                {sortedBookingFriendlies.length} Active Bookings
              </Typography>

              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  size="small"
                  value={selectedBookingStatusFilter}
                  onChange={(event) => {
                    setSelectedBookingStatusFilter(event.target.value as 'all' | 'accepted' | 'pending' | 'declined')
                    setCurrentBookingPage(1)
                  }}
                  sx={{
                    minWidth: 152,
                    '& .MuiOutlinedInput-root': { bgcolor: 'rgba(25,28,44,0.95)' },
                    '& .MuiInputBase-input': { fontSize: '0.86rem' },
                  }}
                  slotProps={{
                    select: {
                      startAdornment: <FilterAltOutlinedIcon sx={{ mr: 0.8, fontSize: '0.95rem', color: 'text.secondary' }} />,
                    },
                  }}
                >
                  <MenuItem value="all">Filter by Field</MenuItem>
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="declined">Cancelled</MenuItem>
                </TextField>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setBookingSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                    setCurrentBookingPage(1)
                  }}
                  startIcon={<SwapVertOutlinedIcon sx={{ fontSize: '0.95rem' }} />}
                  sx={{
                    borderColor: 'rgba(159,176,201,0.2)',
                    color: 'text.secondary',
                    bgcolor: 'rgba(25,28,44,0.95)',
                    textTransform: 'none',
                    fontSize: '0.86rem',
                  }}
                >
                  Sort by Date
                </Button>
              </Stack>
            </Stack>

            <Box sx={{ borderTop: '1px solid rgba(159,176,201,0.12)', borderBottom: '1px solid rgba(159,176,201,0.12)' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '130px minmax(220px, 2.2fr) minmax(160px, 1.4fr) minmax(140px, 1.1fr) minmax(180px, 1.2fr) minmax(140px, 1fr) 80px',
                  alignItems: 'center',
                  px: 1.8,
                  py: 1.25,
                  columnGap: 1,
                  minWidth: 980,
                  color: '#9ea7bf',
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}>Match ID</Typography>
                <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}>Opponents</Typography>
                <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}>Referee</Typography>
                <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}>Pitch</Typography>
                <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}>Date & Time</Typography>
                <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}>Status</Typography>
                <Typography variant="caption" sx={{ color: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}>Action</Typography>
              </Box>

              <Box sx={{ overflowX: 'auto' }}>
                {pagedBookingFriendlies.length === 0 && (
                  <Typography color="text.secondary" sx={{ px: 1.8, py: 2.5 }}>
                    No booking records match this filter.
                  </Typography>
                )}

                {pagedBookingFriendlies.map((friendly) => {
                  const statusTheme = getBookingStatusColors(friendly.status)
                  const referee = getBookingReferee(friendly.id)

                  return (
                    <Box
                      key={friendly.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '130px minmax(220px, 2.2fr) minmax(160px, 1.4fr) minmax(140px, 1.1fr) minmax(180px, 1.2fr) minmax(140px, 1fr) 80px',
                        alignItems: 'center',
                        px: 1.8,
                        py: 1.15,
                        columnGap: 1,
                        minWidth: 980,
                        borderTop: '1px solid rgba(159,176,201,0.12)',
                      }}
                    >
                      <Typography sx={{ color: '#8f98af', fontSize: '0.82rem', letterSpacing: '0.05em' }}>
                        {getBookingMatchId(friendly.id)}
                      </Typography>

                      <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>
                        {friendly.requesterTeam} <Typography component="span" sx={{ color: '#8f98af', fontWeight: 500 }}>vs</Typography> {friendly.recipientTeam}
                      </Typography>

                      <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.68rem', bgcolor: 'rgba(159,176,201,0.22)' }}>
                          {referee.charAt(0)}
                        </Avatar>
                        <Typography sx={{ fontSize: '0.96rem' }}>{referee}</Typography>
                      </Stack>

                      <Typography sx={{ fontSize: '0.96rem', color: '#a5aec4' }}>
                        {friendly.location}
                      </Typography>

                      <Typography sx={{ fontSize: '0.96rem' }}>
                        {formatBookingDateTime(friendly.preferredDate, friendly.preferredTime)}
                      </Typography>

                      <Chip
                        size="small"
                        label={`● ${getBookingStatusLabel(friendly.status)}`}
                        sx={{
                          width: 'fit-content',
                          color: statusTheme.text,
                          borderColor: statusTheme.border,
                          bgcolor: statusTheme.bg,
                          '& .MuiChip-label': { fontWeight: 700, fontSize: '0.78rem' },
                        }}
                        variant="outlined"
                      />

                      {String(friendly.recipientAccountId) === String(loggedInAccountId) && friendly.status === 'pending' ? (
                        <Stack direction="row" spacing={0.5}>
                          <Button size="small" sx={{ minWidth: 0, px: 0.7 }} onClick={() => void handleAcceptFriendlyFromHub(friendly.id)}>
                            A
                          </Button>
                          <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 0.7 }} onClick={() => void handleDeclineFriendlyFromHub(friendly.id)}>
                            D
                          </Button>
                        </Stack>
                      ) : (
                        <IconButton size="small" sx={{ color: '#a7afc2' }} onClick={() => setSelectedBookingForDetails(friendly.id)}>
                          <EditOutlinedIcon sx={{ fontSize: '0.96rem' }} />
                        </IconButton>
                      )}
                    </Box>
                  )
                })}
              </Box>
            </Box>

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.6, gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ color: '#8f98af', fontSize: '0.95rem' }}>
                Showing {bookingRangeStart}-{bookingRangeEnd} of {sortedBookingFriendlies.length} bookings
              </Typography>

              <Stack direction="row" spacing={0.6}>
                <IconButton
                  size="small"
                  disabled={currentBookingPage <= 1}
                  onClick={() => setCurrentBookingPage((prev) => Math.max(1, prev - 1))}
                  sx={{
                    border: '1px solid rgba(159,176,201,0.2)',
                    borderRadius: 1,
                    color: '#9ea7bf',
                    width: 32,
                    height: 32,
                  }}
                >
                  <ChevronLeftRoundedIcon fontSize="small" />
                </IconButton>

                {Array.from({ length: bookingTotalPages }, (_, index) => index + 1).map((page) => (
                  <Button
                    key={`team-dashboard-bookings-page-${page}`}
                    size="small"
                    onClick={() => setCurrentBookingPage(page)}
                    sx={{
                      minWidth: 32,
                      height: 32,
                      px: 0,
                      borderRadius: 1,
                      color: currentBookingPage === page ? '#142600' : '#9ea7bf',
                      bgcolor: currentBookingPage === page ? '#a3ff00' : 'transparent',
                      border: '1px solid rgba(159,176,201,0.2)',
                      fontWeight: 700,
                    }}
                  >
                    {page}
                  </Button>
                ))}

                <IconButton
                  size="small"
                  disabled={currentBookingPage >= bookingTotalPages}
                  onClick={() => setCurrentBookingPage((prev) => Math.min(bookingTotalPages, prev + 1))}
                  sx={{
                    border: '1px solid rgba(159,176,201,0.2)',
                    borderRadius: 1,
                    color: '#9ea7bf',
                    width: 32,
                    height: 32,
                  }}
                >
                  <ChevronRightRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Booking Details Dialog */}
        <Dialog open={Boolean(selectedBookingForDetails && dashboardFriendlies.find((f) => f.id === selectedBookingForDetails))} onClose={() => setSelectedBookingForDetails(null)} maxWidth="sm" fullWidth>
          {(() => {
            const selectedBooking = dashboardFriendlies.find((f) => f.id === selectedBookingForDetails)
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
                          label={selectedBooking?.status.toUpperCase()}
                          sx={{
                            color: getBookingStatusColors(selectedBooking?.status as 'pending' | 'accepted' | 'declined').text,
                            borderColor: getBookingStatusColors(selectedBooking?.status as 'pending' | 'accepted' | 'declined').border,
                            bgcolor: getBookingStatusColors(selectedBooking?.status as 'pending' | 'accepted' | 'declined').bg,
                          }}
                          variant="outlined"
                        />
                      </Box>
                      {/* DATE & TIME */}
                      <Box>
                        <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 0.8 }}>
                          DATE & TIME
                        </Typography>
                        <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>
                          {selectedBooking && formatBookingDateTime(selectedBooking.preferredDate, selectedBooking.preferredTime)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* GROUND / VENUE */}
                    <Box>
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 0.8 }}>
                        GROUND / VENUE
                      </Typography>
                      <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>{selectedBooking?.location}</Typography>
                    </Box>

                    {/* REFEREE */}
                    <Box>
                      <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 0.8 }}>
                        ASSIGNED REFEREE
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, border: '1px solid #2a3a52', borderRadius: 1, bgcolor: 'rgba(76, 227, 163, 0.05)' }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: '#4ce3a3', fontSize: '1rem' }}>
                          {selectedBooking?.referee ? selectedBooking.referee.charAt(0).toUpperCase() : '?'}
                        </Avatar>
                        <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>
                          {selectedBooking?.referee || 'Not assigned'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* CONTACT PERSON & CONTACT DETAILS ROW */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                      {/* CONTACT PERSON */}
                      <Box>
                        <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 0.8 }}>
                          CONTACT PERSON
                        </Typography>
                        <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>{selectedBooking?.requesterName}</Typography>
                      </Box>
                      {/* CONTACT DETAILS */}
                      <Box>
                        <Typography sx={{ color: '#7f88a0', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 700, mb: 0.8 }}>
                          CONTACT DETAILS
                        </Typography>
                        <Typography sx={{ fontWeight: 500, fontSize: '1rem' }}>{selectedBooking?.contact}</Typography>
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
                          {selectedBooking?.note || '(Add more details if needed...)'}
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
                              {selectedBooking?.requesterTeam}
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
                              {selectedBooking?.recipientTeam}
                            </Typography>
                          </Box>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: '#ff7a5c', fontWeight: 700, fontSize: '1.1rem', color: '#07111f' }} />
                        </Box>
                      </Box>
                    </Box>
                  </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={() => setSelectedBookingForDetails(null)}>
                    Close
                  </Button>
                </DialogActions>
              </>
            )
          })()}
        </Dialog>

        {/* Match History Dialog */}
        <Dialog open={showMatchHistory} onClose={() => setShowMatchHistory(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.3rem' }}>Match History</Typography>
            <Typography sx={{ color: '#7f88a0', fontSize: '0.85rem', mt: 0.5 }}>
              Head to Head - {loggedInTeam ?? 'Your Team'} vs Opponents
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 1.5 }}>
            {sortedBookingFriendlies.length === 0 ? (
              <Typography sx={{ color: '#8f98af', py: 2, textAlign: 'center' }}>
                No match history available.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {sortedBookingFriendlies.map((match) => {
                  const statusTheme = getBookingStatusColors(match.status)
                  return (
                    <Box
                      key={match.id}
                      sx={{
                        p: 1.5,
                        border: '1px solid rgba(159,176,201,0.2)',
                        borderRadius: 1.2,
                        bgcolor: 'rgba(159,176,201,0.04)',
                      }}
                    >
                      <Stack spacing={1}>
                        {/* Teams */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            {match.requesterTeam}
                          </Typography>
                          <Chip
                            size="small"
                            label={`● ${getBookingStatusLabel(match.status)}`}
                            sx={{
                              color: statusTheme.text,
                              borderColor: statusTheme.border,
                              bgcolor: statusTheme.bg,
                              '& .MuiChip-label': { fontWeight: 700, fontSize: '0.75rem' },
                            }}
                            variant="outlined"
                          />
                          <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            {match.recipientTeam}
                          </Typography>
                        </Box>

                        {/* Date & Location */}
                        <Stack direction="row" spacing={1} sx={{ fontSize: '0.85rem', color: '#8f98af' }}>
                          <Typography>📅 {formatBookingDateTime(match.preferredDate, match.preferredTime)}</Typography>
                          <Typography>📍 {match.location}</Typography>
                        </Stack>

                        {/* Referee */}
                        <Typography sx={{ fontSize: '0.85rem', color: '#8f98af' }}>
                          🏆 Referee: {getBookingReferee(match.id)}
                        </Typography>
                      </Stack>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button variant="outlined" onClick={() => setShowMatchHistory(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
      )}

    </Stack>
  )
}
