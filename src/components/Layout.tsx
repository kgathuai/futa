import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Badge,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Divider,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded'
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import SportsSoccerOutlinedIcon from '@mui/icons-material/SportsSoccerOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api, subscribeToApiLoading } from '../lib/api'
import type { FriendlyRequest, NotificationItem } from '../types'
import { useAppData } from '../context/AppContext'
import { LoadingBar } from './LoadingBar'
import { TopToast } from './TopToast'
import type { ToastMessage } from './TopToast'
import { KENYA_COUNTIES } from '../lib/kenyaCounties'
import { useI18n } from '../lib/i18n'
import { useColorMode } from '../theme/ColorModeProvider'
import type { TranslationKey } from '../lib/i18n'
import { computeTeamStats } from '../lib/teamStats'
import { fileToAvatarDataUrl } from '../lib/avatar'
import { hasRecordedScore } from '../lib/matchStatus'

const sports = ['Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table']

const links: Array<{ to: string; key: TranslationKey }> = [
  { to: '/', key: 'home' },
  { to: '/friendlies', key: 'friendlies' },
  { to: '/team', key: 'teams' },
  { to: '/tournaments', key: 'tournaments' },
]

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInAccountId: string | null
  loggedInTeam: string | null
}

const ROLE_LABELS: Record<string, string> = {
  tm: 'Team Manager',
  coach: 'Coach',
  captain: 'Captain',
  player: 'Player',
  referee: 'Referee',
  fan: 'Fan',
  admin: 'Admin',
  superadmin: 'Superadmin',
}

const formatKickoffLabel = (value: string) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return 'Kickoff TBC'
  }
  return date.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatBookingWhen = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time || '00:00'}`)
  if (!Number.isFinite(parsed.getTime())) {
    return `${date} ${time}`.trim()
  }
  return parsed.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const roleLabel = (role: string | null | undefined) => {
  const key = (role ?? '').trim().toLowerCase()
  if (!key) {
    return 'Player'
  }
  return ROLE_LABELS[key] ?? key.toUpperCase()
}

const StatBox = ({ label, value, accent }: { label: string; value: string | number; accent?: string }) => (
  <Box
    sx={{
      borderRadius: 1.4,
      border: '1px solid rgba(159,176,201,0.16)',
      bgcolor: 'background.paper',
      px: 0.8,
      py: 0.85,
      textAlign: 'center',
      minWidth: 0,
    }}
  >
    <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', lineHeight: 1.1, color: accent ?? '#edf2f7' }}>
      {value}
    </Typography>
    <Typography
      sx={{
        fontSize: '0.56rem',
        letterSpacing: '0.08em',
        color: 'text.secondary',
        textTransform: 'uppercase',
        mt: 0.3,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </Typography>
  </Box>
)

export function Layout() {
  const location = useLocation()
  const { refreshTeam, matches, team } = useAppData()
  const currentYear = new Date().getFullYear()
  const { language, setLanguage, t } = useI18n()
  const { mode, toggleMode } = useColorMode()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login')
  const [authMessage, setAuthMessage] = useState('')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [forgotEmail, setForgotEmail] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [emailVerified, setEmailVerified] = useState(true)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const refereeNoticeShown = useRef(false)

  // Auth messages surface at the top of the screen and clear themselves.
  useEffect(() => {
    if (!authMessage) {
      return
    }
    setToast({ message: authMessage, severity: 'info' })
    const timer = window.setTimeout(() => setAuthMessage(''), 5000)
    return () => window.clearTimeout(timer)
  }, [authMessage])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [registerName, setRegisterName] = useState('')
  const [registerTeam, setRegisterTeam] = useState('')
  const [registerCounty, setRegisterCounty] = useState('')
  const [registerHomeGround, setRegisterHomeGround] = useState('')
  const [registerRole, setRegisterRole] = useState('')
  const [registerSport, setRegisterSport] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

  const [loggedInUser, setLoggedInUser] = useState<string | null>(null)
  const [loggedInRole, setLoggedInRole] = useState<string | null>(null)
  const [loggedInAccountId, setLoggedInAccountId] = useState<string | null>(null)
  const [loggedInTeam, setLoggedInTeam] = useState<string | null>(null)
  const [loggedInEmail, setLoggedInEmail] = useState('')
  const [loggedInSport, setLoggedInSport] = useState('')
  const [profileTeam, setProfileTeam] = useState('')
  const [profileCounty, setProfileCounty] = useState('')
  const [profileHomeGround, setProfileHomeGround] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('')
  const [avatarMessage, setAvatarMessage] = useState('')
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isApiLoading, setIsApiLoading] = useState(false)

  const myTeamName = (loggedInTeam ?? '').trim()
  const myTeamProfile =
    myTeamName && team.name.trim().toLowerCase() === myTeamName.toLowerCase() ? team : null
  const myTeamStats = useMemo(() => computeTeamStats(matches, myTeamName), [matches, myTeamName])
  const myTeamCounty = myTeamProfile?.county || profileCounty
  const myTeamGround = myTeamProfile?.homeGround || profileHomeGround
  const myTeamLogo = myTeamProfile?.logoUrl
  const myRoleLabel = roleLabel(loggedInRole)
  const isRefereeAccount = (loggedInRole ?? '').trim().toLowerCase() === 'referee'
  const [refereeBookings, setRefereeBookings] = useState<FriendlyRequest[]>([])
  const [followedTeams, setFollowedTeams] = useState<string[]>([])
  const [refereeActionId, setRefereeActionId] = useState('')
  const [reportBooking, setReportBooking] = useState<FriendlyRequest | null>(null)
  const [reportHomeScore, setReportHomeScore] = useState('')
  const [reportAwayScore, setReportAwayScore] = useState('')
  const [reportNotes, setReportNotes] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  // Referees get a one-off reminder that they are not tied to a team.
  useEffect(() => {
    if (!isAuthOpen) {
      refereeNoticeShown.current = false
      return
    }
    if (!isRefereeAccount || refereeNoticeShown.current) {
      return
    }
    refereeNoticeShown.current = true
    setToast({
      message: 'Referee accounts are not attached to a team. Your bookings appear above.',
      severity: 'info',
    })
  }, [isAuthOpen, isRefereeAccount])

  const upcomingMatches = useMemo(() => {
    const now = Date.now()
    const normalisedTeam = myTeamName.toLowerCase()
    return matches
      .filter((match) => {
        const involvesMe =
          !normalisedTeam ||
          match.homeTeam.trim().toLowerCase() === normalisedTeam ||
          match.awayTeam.trim().toLowerCase() === normalisedTeam
        if (!involvesMe || hasRecordedScore(match.homeScore, match.awayScore)) {
          return false
        }
        const kickoff = new Date(match.kickoff).getTime()
        if (!Number.isFinite(kickoff)) {
          return false
        }
        return kickoff + (match.durationMinutes ?? 90) * 60_000 > now
      })
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, 5)
  }, [matches, myTeamName])

  const recentActivity = notifications.slice(0, 4)

  useEffect(() => subscribeToApiLoading(setIsApiLoading), [])

  // A 401 from any authenticated request means the session token expired or was revoked.
  useEffect(() => {
    const handleUnauthorized = () => {
      api.clearToken()
      setLoggedInUser(null)
      setLoggedInRole(null)
      setLoggedInAccountId(null)
      setLoggedInTeam(null)
      setLoggedInEmail('')
      setLoggedInSport('')
      setNotifications([])
      setProfileTeam('')
      setProfileCounty('')
      setProfileHomeGround('')
      setProfileMessage('')
      setProfileAvatar('')
      setAvatarMessage('')
      setEmailVerified(true)
      setAuthView('login')
      setIsAuthOpen(true)
      setAuthMessage('Your session has expired. Please log in again.')
    }

    window.addEventListener('futa:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('futa:unauthorized', handleUnauthorized)
    }
  }, [])

  const loadNotifications = async (accountId: string | null) => {
    const token = api.getToken()
    if (!token || !accountId) {
      setNotifications([])
      return
    }

    try {
      const response = await api.getNotifications(token)
      setNotifications(response)
    } catch {
      setNotifications([])
    }
  }

  useEffect(() => {
    const restoreSession = async () => {
      const token = api.getToken()
      if (!token) {
        return
      }

      try {
        const response = await api.me(token)
        setLoggedInUser(response.user.name || response.user.email)
        setLoggedInRole(response.user.role)
        setLoggedInAccountId(response.user.id)
        setLoggedInTeam(response.user.team)
        setLoggedInEmail(response.user.email ?? '')
        setLoggedInSport(response.user.sport ?? '')
        setProfileTeam(response.user.team ?? '')
        setProfileCounty(response.user.county ?? '')
        setProfileHomeGround(response.user.homeGround ?? '')
        setProfileAvatar(response.user.avatar ?? '')
        setEmailVerified(response.user.emailVerified !== false)
        void refreshTeam()
      } catch {
        api.clearToken()
      }
    }

    void restoreSession()
  }, [refreshTeam])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const userEmail = loginEmail.trim().toLowerCase()
    const userPassword = loginPassword.trim()
    if (!userEmail || !userPassword) {
      setAuthMessage('Enter your email and password to log in.')
      return
    }

    try {
      const response = await api.login({ email: userEmail, password: userPassword })
      api.setToken(response.token)
      setLoggedInUser(response.user.name || response.user.email)
      setLoggedInRole(response.user.role)
      setLoggedInAccountId(response.user.id)
      setLoggedInTeam(response.user.team)
      setLoggedInEmail(response.user.email ?? '')
      setLoggedInSport(response.user.sport ?? '')
      setProfileTeam(response.user.team ?? '')
      setProfileCounty(response.user.county ?? '')
      setProfileHomeGround(response.user.homeGround ?? '')
      setProfileAvatar(response.user.avatar ?? '')
      setEmailVerified(response.user.emailVerified !== false)
      void refreshTeam()
      setAuthMessage(`Signed in as ${response.user.name || response.user.email} (${response.user.role}).`)
      setLoginEmail('')
      setLoginPassword('')
      setIsAuthOpen(false)
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Login failed.')
    }
  }

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const isReferee = registerRole === 'Referee'
    const safeName = registerName.trim()
    const safeTeam = isReferee ? '' : registerTeam.trim()
    const safeCounty = isReferee ? '' : registerCounty.trim()
    const safeHomeGround = isReferee ? '' : registerHomeGround.trim()
    const safeRole = registerRole.trim()
    const safeSport = registerSport.trim()
    const safeEmail = registerEmail.trim().toLowerCase()
    const safePassword = registerPassword.trim()

    if (
      !safeName ||
      !safeRole ||
      !safeSport ||
      !safeEmail ||
      !safePassword
    ) {
      setAuthMessage('Add your details to create an account.')
      return
    }

    if (safeTeam && (!safeCounty || !safeHomeGround)) {
      setAuthMessage('Add a county and home ground for your team, or leave the team blank.')
      return
    }

    try {
      await api.register({
        name: safeName,
        team: safeTeam,
        county: safeCounty,
        homeGround: safeHomeGround,
        role: safeRole,
        sport: safeSport,
        email: safeEmail,
        password: safePassword,
      })

      setAuthView('login')
      setLoginEmail(safeEmail)
      setLoginPassword('')
      setAuthMessage('Registration successful. Please log in with your new account.')
      setRegisterName('')
      setRegisterTeam('')
      setRegisterCounty('')
      setRegisterHomeGround('')
      setRegisterRole('')
      setRegisterSport('')
      setRegisterEmail('')
      setRegisterPassword('')
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Registration failed.')
    }
  }

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = forgotEmail.trim().toLowerCase()
    if (!email) {
      setAuthMessage('Enter the email address on your account.')
      return
    }

    setIsSendingReset(true)
    try {
      const response = await api.forgotPassword(email)
      setAuthMessage(
        response.deliveryConfigured
          ? response.message
          : `${response.message} (This server has no email provider configured yet.)`,
      )
      setAuthView('login')
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Could not start the reset.')
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleResendVerification = async () => {
    const token = api.getToken()
    if (!token) {
      return
    }

    setIsResendingVerification(true)
    try {
      const response = await api.resendVerification(token)
      setToast({ message: response.message, severity: 'info' })
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Could not resend the verification email.',
        severity: 'error',
      })
    } finally {
      setIsResendingVerification(false)
    }
  }

  const handleRefereeRespond = async (bookingId: string, status: 'accepted' | 'declined') => {
    const token = api.getToken()
    if (!token) {
      return
    }

    setRefereeActionId(bookingId)
    try {
      const response = await api.respondToRefereeBooking(bookingId, status, token)
      setRefereeBookings((prev) =>
        prev.map((booking) => (booking.id === bookingId ? response.booking : booking)),
      )
      setToast({
        message: status === 'accepted' ? 'Booking confirmed.' : 'Booking declined.',
        severity: status === 'accepted' ? 'success' : 'info',
      })
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Could not update that booking.',
        severity: 'error',
      })
    } finally {
      setRefereeActionId('')
    }
  }

  const handleSubmitRefereeReport = async () => {
    if (!reportBooking) {
      return
    }

    const token = api.getToken()
    if (!token) {
      return
    }

    const homeScore = Number(reportHomeScore)
    const awayScore = Number(reportAwayScore)
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || reportHomeScore === '' || reportAwayScore === '') {
      setToast({ message: 'Enter both scores.', severity: 'error' })
      return
    }

    setIsSubmittingReport(true)
    try {
      const response = await api.submitRefereeReport(
        reportBooking.id,
        { homeScore, awayScore, notes: reportNotes },
        token,
      )
      setRefereeBookings((prev) =>
        prev.map((booking) => (booking.id === reportBooking.id ? response.booking : booking)),
      )
      setToast({ message: 'Match report submitted.', severity: 'success' })
      setReportBooking(null)
      setReportHomeScore('')
      setReportAwayScore('')
      setReportNotes('')
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Could not submit that report.',
        severity: 'error',
      })
    } finally {
      setIsSubmittingReport(false)
    }
  }

  const handleLogout = async () => {
    const token = api.getToken()
    if (token) {
      try {
        await api.logout(token)
      } catch {
        // Ignore logout request failures and clear local session anyway.
      }
    }

    api.clearToken()
    setLoggedInUser(null)
    setLoggedInRole(null)
    setLoggedInAccountId(null)
    setLoggedInTeam(null)
    setLoggedInEmail('')
    setLoggedInSport('')
    setNotifications([])
    setProfileTeam('')
    setProfileCounty('')
    setProfileHomeGround('')
    setProfileMessage('')
    setProfileAvatar('')
    setAvatarMessage('')
    setEmailVerified(true)
    void refreshTeam()
    setAuthMessage('You have logged out.')
  }

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = api.getToken()
    if (!token) {
      setProfileMessage('Please log in again.')
      return
    }

    const team = profileTeam.trim()
    const county = profileCounty.trim()
    const homeGround = profileHomeGround.trim()
    if (team && (!county || !homeGround)) {
      setProfileMessage('Add a county and home ground for your team, or leave the team blank.')
      return
    }

    setIsSavingProfile(true)
    try {
      const response = await api.updateProfile(
        { team, county: team ? county : '', homeGround: team ? homeGround : '' },
        token,
      )
      setLoggedInTeam(response.user.team)
      setLoggedInEmail(response.user.email ?? '')
      setLoggedInSport(response.user.sport ?? '')
      setProfileTeam(response.user.team ?? '')
      setProfileCounty(response.user.county ?? '')
      setProfileHomeGround(response.user.homeGround ?? '')
      void refreshTeam()
      setProfileMessage('Team updated.')
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Failed to update your team.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    const token = api.getToken()
    if (!token) {
      setAvatarMessage('Please log in again.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setAvatarMessage('Choose an image file (JPG, PNG or WebP).')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setAvatarMessage('That image is too large. Pick one under 8 MB.')
      return
    }

    setIsSavingAvatar(true)
    setAvatarMessage('')
    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      const response = await api.updateProfile({ avatar: dataUrl }, token)
      setProfileAvatar(response.user.avatar ?? '')
      setAvatarMessage('Profile picture updated.')
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : 'Could not update your picture.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    const token = api.getToken()
    if (!token) {
      setAvatarMessage('Please log in again.')
      return
    }

    setIsSavingAvatar(true)
    setAvatarMessage('')
    try {
      const response = await api.updateProfile({ avatar: '' }, token)
      setProfileAvatar(response.user.avatar ?? '')
      setAvatarMessage('Profile picture removed.')
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : 'Could not remove your picture.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  useEffect(() => {
    if (!loggedInAccountId) {
      setFollowedTeams([])
      return
    }

    const token = api.getToken()
    if (!token) {
      return
    }

    let active = true
    void api
      .getFollowedTeams(token)
      .then((response) => {
        if (active) {
          setFollowedTeams(response.teams)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [loggedInAccountId, isAuthOpen])

  const handleUnfollow = async (teamName: string) => {
    const token = api.getToken()
    if (!token) {
      return
    }
    try {
      await api.unfollowTeam(teamName, token)
      setFollowedTeams((prev) => prev.filter((name) => name.toLowerCase() !== teamName.toLowerCase()))
    } catch {
      // Keep the entry if the request failed.
    }
  }

  // Referees are not attached to a team — load the friendly fixtures they officiate.
  useEffect(() => {
    if (!isRefereeAccount || !loggedInAccountId) {
      setRefereeBookings([])
      return
    }

    const token = api.getToken()
    if (!token) {
      return
    }

    let active = true
    void api
      .getRefereeBookings(token)
      .then((bookings) => {
        if (active) {
          setRefereeBookings(bookings)
        }
      })
      .catch(() => {
        if (active) {
          setRefereeBookings([])
        }
      })

    return () => {
      active = false
    }
  }, [isRefereeAccount, loggedInAccountId])

  // Re-fetch on sign-in and whenever a drawer opens so new replies show up.
  useEffect(() => {
    void loadNotifications(loggedInAccountId)
  }, [loggedInAccountId, isAuthOpen, isNotificationsOpen])

  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length
  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canAccessDashboard =
    Boolean(loggedInUser) &&
    (normalizedRole === 'coach' ||
      normalizedRole === 'tm' ||
      normalizedRole === 'captain' ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin')
  const canAccessAdmin = Boolean(loggedInUser) && normalizedRole === 'superadmin'

  const navLinks = [
    ...(canAccessDashboard ? [{ to: '/team-dashboard', key: 'dashboard' as TranslationKey }] : []),
    ...(canAccessAdmin ? [{ to: '/admin', key: 'admin' as TranslationKey }] : []),
    ...links,
  ]

  const handleNotificationRead = async (notificationId: string, alreadyRead: boolean) => {
    if (alreadyRead) {
      return
    }

    const token = api.getToken()
    if (!token) {
      return
    }

    try {
      await api.markNotificationRead(notificationId, token)
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
      )
    } catch {
      // Keep UI responsive even if marking read fails.
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <TopToast toast={toast} onClose={() => setToast(null)} />
      {isApiLoading && <LoadingBar fixed />}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: mode === 'light' ? 'rgba(11,18,32,0.12)' : 'rgba(159,176,201,0.14)',
          overflow: 'visible',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Toolbar disableGutters sx={{ height: { xs: 48, sm: 52 }, minHeight: { xs: 48, sm: 52 }, gap: { xs: 0.5, sm: 2 }, overflow: 'visible' }}>
            <Box
              component="img"
              src="/kabum.png"
              alt="Futa logo"
              sx={{
                height: { xs: 82, sm: 130, md: 170 },
                maxWidth: { xs: 92, sm: 145, md: 'none' },
                width: 'auto',
                display: 'block',
                flexShrink: 1,
                objectFit: 'contain',
                // The logo art is white; darken it so it stays readable in light mode.
                filter: mode === 'light' ? 'brightness(0.25)' : 'none',
              }}
              style={{ pointerEvents: 'none' }}
            />

            <Box sx={{ ml: 'auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: { xs: 0.2, sm: 1.25 } }}>
              <Stack direction="row" spacing={{ xs: 0.1, sm: 0.5 }} sx={{ alignItems: 'center', minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                {navLinks.map((link) => {
                  const isActive =
                    link.to === '/'
                      ? location.pathname === '/'
                      : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)
                  return (
                    <Button
                      key={link.to}
                      component={NavLink}
                      to={link.to}
                      variant={isActive ? 'contained' : 'text'}
                      color={isActive ? 'primary' : 'inherit'}
                      sx={{
                        borderRadius: 999,
                        fontSize: { xs: '0.7rem', sm: '0.92rem' },
                        px: { xs: 0.65, sm: 1.25 },
                        py: { xs: 0.42, sm: 0.58 },
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        color: isActive ? '#06101c' : 'text.secondary',
                        '&:hover': {
                          backgroundColor: isActive ? 'primary.main' : 'rgba(159,176,201,0.1)',
                        },
                      }}
                    >
                      {t(link.key)}
                    </Button>
                  )
                })}
              </Stack>

              <Button
                color="inherit"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                aria-label="Notifications"
                sx={{
                  color: 'text.secondary',
                  borderRadius: 999,
                  minWidth: 0,
                  px: { xs: 0.45, sm: 1.25 },
                  py: { xs: 0.42, sm: 0.58 },
                }}
              >
                <Badge badgeContent={unreadNotificationCount} color="primary" overlap="circular" max={99}>
                  <NotificationsNoneOutlinedIcon />
                </Badge>
              </Button>

              <Button
                color="inherit"
                onClick={() => setIsAuthOpen((prev) => !prev)}
                aria-label="Account"
                sx={{
                  color: 'text.secondary',
                  borderRadius: 999,
                  minWidth: 0,
                  px: 1.25,
                  py: 0.58,
                }}
              >
                {profileAvatar ? (
                  <Box
                    component="img"
                    src={profileAvatar}
                    alt="Account"
                    sx={{
                      width: 27,
                      height: 27,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid rgba(76,227,163,0.6)',
                    }}
                  />
                ) : (
                  <AccountCircleRoundedIcon />
                )}
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Box
        component="nav"
        aria-label="Mobile navigation"
        sx={{
          display: { xs: 'flex', sm: 'none' },
          position: 'fixed',
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 1200,
          justifyContent: 'space-around',
          alignItems: 'center',
          px: 0.5,
          pt: 0.75,
          pb: 'calc(0.75rem + env(safe-area-inset-bottom))',
          bgcolor: mode === 'light' ? '#ffffff' : 'background.paper',
          borderTop: '1px solid',
          borderColor: mode === 'light' ? 'rgba(11,18,32,0.12)' : 'rgba(255,255,255,0.14)',
          boxShadow: '0 -6px 18px rgba(0, 0, 0, 0.12)',
        }}
      >
        {navLinks.map((link) => {
          const isActive = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to)
          return (
            <Button
              key={`mobile-${link.to}`}
              component={NavLink}
              to={link.to}
              sx={{
                minWidth: 0,
                flex: 1,
                flexDirection: 'column',
                gap: 0.2,
                px: 0.25,
                py: 0.35,
                color:
                  mode === 'light'
                    ? isActive
                      ? '#0b7a56'
                      : '#0b1220'
                    : isActive
                      ? 'primary.main'
                      : 'text.secondary',
                textTransform: 'none',
                fontSize: '0.64rem',
                fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
              }}
            >
              {link.to === '/team-dashboard' ? <DashboardOutlinedIcon sx={{ fontSize: 26 }} />
                : link.to === '/admin' ? <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 26 }} />
                  : link.to === '/' ? <HomeOutlinedIcon sx={{ fontSize: 26 }} />
                    : link.to === '/friendlies' ? <SportsSoccerOutlinedIcon sx={{ fontSize: 26 }} />
                      : link.to === '/team' ? <GroupsOutlinedIcon sx={{ fontSize: 26 }} />
                        : <EmojiEventsOutlinedIcon sx={{ fontSize: 26 }} />}
              {t(link.key)}
            </Button>
          )
        })}
        <Button
          onClick={() => setIsAuthOpen((prev) => !prev)}
          aria-label="Account"
          sx={{
            minWidth: 0,
            flex: 1,
            flexDirection: 'column',
            gap: 0.2,
            px: 0.25,
            py: 0.35,
            color: mode === 'light' ? '#0b1220' : 'text.secondary',
            textTransform: 'none',
            fontSize: '0.64rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: 'action.hover', color: mode === 'light' ? '#0b7a56' : 'text.primary' },
          }}
        >
          {profileAvatar ? (
            <Box
              component="img"
              src={profileAvatar}
              alt="Account"
              sx={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid rgba(76,227,163,0.6)',
              }}
            />
          ) : (
            <AccountCircleRoundedIcon sx={{ fontSize: 26 }} />
          )}
          Account
        </Button>
      </Box>

      <Drawer anchor="right" open={isAuthOpen} onClose={() => setIsAuthOpen(false)}>
        <Box sx={{ width: { xs: '90vw', sm: 390 }, p: 2.5 }} role="presentation">
          <Stack direction="row" sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {loggedInUser ? t('account') : authView === 'login' ? t('login') : authView === 'forgot' ? 'Reset password' : t('register')}
            </Typography>
            <IconButton onClick={() => setIsAuthOpen(false)} aria-label="Close authentication drawer">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          {loggedInUser ? (
            <>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.2 }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Box
                    sx={{
                      width: 66,
                      height: 66,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(7,17,31,0.9)',
                      border: '2px solid rgba(76,227,163,0.55)',
                    }}
                  >
                    {profileAvatar ? (
                      <Box
                        component="img"
                        src={profileAvatar}
                        alt={`${loggedInUser} profile picture`}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <AccountCircleRoundedIcon sx={{ fontSize: 44, color: 'rgba(159,176,201,0.55)' }} />
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Change profile picture"
                    disabled={isSavingAvatar}
                    sx={{
                      position: 'absolute',
                      right: -4,
                      bottom: -4,
                      width: 26,
                      height: 26,
                      bgcolor: 'primary.main',
                      color: '#07111f',
                      border: '2px solid #0d1524',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    <PhotoCameraRoundedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.15 }} noWrap>
                    {loggedInUser}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                    {loggedInEmail}
                  </Typography>
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap', rowGap: 0.4 }}>
                    <Chip
                      size="small"
                      label={myRoleLabel.toUpperCase()}
                      sx={{
                        height: 19,
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        bgcolor: 'rgba(76,227,163,0.16)',
                        color: 'primary.main',
                        border: '1px solid rgba(76,227,163,0.4)',
                      }}
                    />
                    {loggedInSport && (
                      <Chip
                        size="small"
                        label={loggedInSport.toUpperCase()}
                        sx={{
                          height: 19,
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          bgcolor: 'rgba(159,176,201,0.1)',
                          color: 'text.secondary',
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              </Stack>

              <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mb: 1.2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                  {t('language').toUpperCase()}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={toggleMode}
                  aria-label="Toggle colour mode"
                  sx={{ minWidth: 0, px: 1, py: 0.1, fontSize: '0.64rem', fontWeight: 800, ml: 'auto !important' }}
                >
                  {mode === 'dark' ? '☀ Light' : '☾ Dark'}
                </Button>
                {(['en', 'sw'] as const).map((code) => (
                  <Button
                    key={code}
                    size="small"
                    variant={language === code ? 'contained' : 'outlined'}
                    onClick={() => setLanguage(code)}
                    sx={{ minWidth: 0, px: 1, py: 0.1, fontSize: '0.64rem', fontWeight: 800 }}
                  >
                    {code === 'en' ? 'EN' : 'SW'}
                  </Button>
                ))}
              </Stack>

              {!emailVerified && (
                <Alert
                  severity="warning"
                  sx={{ mb: 1.4, py: 0.3, fontSize: '0.76rem' }}
                  action={
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => void handleResendVerification()}
                      disabled={isResendingVerification}
                      sx={{ fontSize: '0.7rem' }}
                    >
                      {isResendingVerification ? 'Sending…' : 'Resend'}
                    </Button>
                  }
                >
                  Verify your email to secure your account.
                </Alert>
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />

              <Stack direction="row" spacing={1} sx={{ mb: 1.6 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isSavingAvatar}
                >
                  {isSavingAvatar ? 'Saving…' : profileAvatar ? 'Change photo' : 'Add photo'}
                </Button>
                {profileAvatar && (
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    onClick={handleRemoveAvatar}
                    disabled={isSavingAvatar}
                  >
                    Remove
                  </Button>
                )}
              </Stack>

              {avatarMessage && (
                <Alert
                  severity="info"
                  onClose={() => setAvatarMessage('')}
                  sx={{ mb: 1.6, py: 0.3, fontSize: '0.78rem' }}
                >
                  {avatarMessage}
                </Alert>
              )}

              {!isRefereeAccount && (
              <Card
                variant="outlined"
                sx={{ mb: 2, borderColor: 'rgba(76,227,163,0.26)', bgcolor: 'rgba(76,227,163,0.03)' }}
              >
                <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block', mb: 1.2 }}
                  >
                    My team
                  </Typography>

                  {myTeamName ? (
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 46,
                            height: 46,
                            borderRadius: '50%',
                            flexShrink: 0,
                            display: 'grid',
                            placeItems: 'center',
                            overflow: 'hidden',
                            bgcolor: 'rgba(7,17,31,0.9)',
                            border: '2px solid rgba(76,227,163,0.55)',
                          }}
                        >
                          {myTeamLogo ? (
                            <Box
                              component="img"
                              src={myTeamLogo}
                              alt={`${myTeamName} logo`}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: '0.95rem' }}>
                              {myTeamName.slice(0, 2).toUpperCase()}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.15 }} noWrap>
                            {myTeamName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                            {[myTeamCounty, myTeamGround].filter(Boolean).join(' • ') || 'No county or ground set'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.8 }}>
                        <StatBox label="Played" value={myTeamStats.played} />
                        <StatBox label="Wins" value={myTeamStats.wins} accent="#4ce3a3" />
                        <StatBox label="Draws" value={myTeamStats.draws} accent="#facc15" />
                        <StatBox label="Losses" value={myTeamStats.losses} accent="#ff8a94" />
                        <StatBox label="Goals for" value={myTeamStats.goalsFor} />
                        <StatBox label="Goals against" value={myTeamStats.goalsAgainst} />
                      </Box>

                      <Stack spacing={0.5}>
                        {myTeamStats.lastResult && (
                          <Typography variant="caption" color="text.secondary">
                            Last: {myTeamStats.lastResult.outcome} {myTeamStats.lastResult.score} vs{' '}
                            {myTeamStats.lastResult.opponent}
                          </Typography>
                        )}
                        {myTeamStats.topScorer && (
                          <Typography variant="caption" sx={{ color: 'text.primary' }}>
                            ⚽ Top scorer: {myTeamStats.topScorer.name} — {myTeamStats.topScorer.goals}{' '}
                            {myTeamStats.topScorer.goals === 1 ? 'goal' : 'goals'}
                          </Typography>
                        )}
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <Button
                          component={NavLink}
                          to="/team-dashboard"
                          variant="outlined"
                          size="small"
                          onClick={() => setIsAuthOpen(false)}
                          sx={{ flex: 1 }}
                        >
                          Team dashboard
                        </Button>
                        <Button
                          component={NavLink}
                          to="/archive"
                          variant="text"
                          size="small"
                          onClick={() => setIsAuthOpen(false)}
                        >
                          Archive
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Alert severity="info" sx={{ py: 0.4, fontSize: '0.8rem' }}>
                      No team on this account yet. Set one below to track wins, goals and top scorers.
                    </Alert>
                  )}
                </CardContent>
              </Card>

              )}

              {followedTeams.length > 0 && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                    <Typography
                      variant="overline"
                      sx={{ color: 'text.secondary', letterSpacing: '0.12em', display: 'block', mb: 1 }}
                    >
                      Following
                    </Typography>
                    <Stack spacing={0.7}>
                      {followedTeams.map((teamName) => {
                        const nextMatch = matches
                          .filter(
                            (match) =>
                              !hasRecordedScore(match.homeScore, match.awayScore) &&
                              (match.homeTeam.toLowerCase() === teamName.toLowerCase() ||
                                match.awayTeam.toLowerCase() === teamName.toLowerCase()) &&
                              new Date(match.kickoff).getTime() > Date.now(),
                          )
                          .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0]

                        return (
                          <Stack
                            key={teamName}
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }} noWrap>
                                {teamName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                {nextMatch
                                  ? `Next: vs ${nextMatch.homeTeam.toLowerCase() === teamName.toLowerCase() ? nextMatch.awayTeam : nextMatch.homeTeam} · ${formatKickoffLabel(nextMatch.kickoff)}`
                                  : 'No upcoming match'}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              aria-label={`Unfollow ${teamName}`}
                              onClick={() => void handleUnfollow(teamName)}
                              sx={{ p: 0.3 }}
                            >
                              <CloseRoundedIcon sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </Stack>
                        )
                      })}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {isRefereeAccount ? (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.1 }}>
                      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
                        Booked games
                      </Typography>
                      <Chip
                        size="small"
                        label={refereeBookings.length}
                        sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }}
                      />
                    </Stack>

                    {refereeBookings.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                        No games booked for you yet. Teams choose a referee when they request a friendly.
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {refereeBookings.map((booking) => {
                          const refereeState = booking.report
                            ? { label: 'REPORTED', bg: 'rgba(76,227,163,0.2)', color: '#4ce3a3' }
                            : booking.refereeStatus === 'accepted'
                              ? { label: 'CONFIRMED', bg: 'rgba(76,227,163,0.16)', color: '#4ce3a3' }
                              : booking.refereeStatus === 'declined'
                                ? { label: 'DECLINED', bg: 'rgba(255,107,117,0.14)', color: '#ff8a94' }
                                : { label: 'AWAITING REPLY', bg: 'rgba(250,204,21,0.14)', color: '#facc15' }

                          const busy = refereeActionId === booking.id

                          return (
                            <Box
                              key={booking.id}
                              sx={{
                                border: '1px solid rgba(159,176,201,0.16)',
                                borderRadius: 1.6,
                                p: 1.1,
                                bgcolor: 'background.paper',
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }} noWrap>
                                    {booking.requesterTeam} vs {booking.recipientTeam}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block' }}
                                    noWrap
                                  >
                                    {formatBookingWhen(booking.preferredDate, booking.preferredTime)} ·{' '}
                                    {booking.location}
                                  </Typography>
                                </Box>
                                <Chip
                                  size="small"
                                  label={refereeState.label}
                                  sx={{
                                    height: 19,
                                    fontSize: '0.53rem',
                                    fontWeight: 800,
                                    bgcolor: refereeState.bg,
                                    color: refereeState.color,
                                  }}
                                />
                              </Stack>

                              {booking.report ? (
                                <Typography sx={{ mt: 0.8, fontSize: '0.72rem', color: 'text.secondary' }}>
                                  Reported {booking.report.homeScore} – {booking.report.awayScore}
                                  {booking.report.notes ? ` · ${booking.report.notes}` : ''}
                                </Typography>
                              ) : (
                                <Stack direction="row" spacing={0.6} sx={{ mt: 0.9 }}>
                                  {booking.refereeStatus !== 'accepted' && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      disabled={busy}
                                      onClick={() => void handleRefereeRespond(booking.id, 'accepted')}
                                      sx={{ fontSize: '0.66rem', py: 0.2, px: 1 }}
                                    >
                                      Accept
                                    </Button>
                                  )}
                                  {booking.refereeStatus !== 'declined' && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="inherit"
                                      disabled={busy}
                                      onClick={() => void handleRefereeRespond(booking.id, 'declined')}
                                      sx={{ fontSize: '0.66rem', py: 0.2, px: 1 }}
                                    >
                                      Decline
                                    </Button>
                                  )}
                                  <Button
                                    size="small"
                                    variant="text"
                                    disabled={busy}
                                    onClick={() => {
                                      setReportBooking(booking)
                                      setReportHomeScore('')
                                      setReportAwayScore('')
                                      setReportNotes('')
                                    }}
                                    sx={{ fontSize: '0.66rem', py: 0.2, px: 1 }}
                                  >
                                    Report score
                                  </Button>
                                </Stack>
                              )}
                            </Box>
                          )
                        })}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              ) : (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.1 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
                      Upcoming games
                    </Typography>
                    <Chip
                      size="small"
                      label={upcomingMatches.length}
                      sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }}
                    />
                  </Stack>

                  {upcomingMatches.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                      {myTeamName
                        ? 'No upcoming games for your team yet.'
                        : 'No upcoming games yet.'}
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {upcomingMatches.map((match) => {
                        const homeSide =
                          match.homeTeam.trim().toLowerCase() === myTeamName.toLowerCase()
                        const opponent = homeSide ? match.awayTeam : match.homeTeam
                        const isLive = new Date(match.kickoff).getTime() <= Date.now()
                        return (
                          <Box
                            key={match.id}
                            sx={{
                              border: '1px solid rgba(159,176,201,0.16)',
                              borderRadius: 1.6,
                              p: 1.1,
                              bgcolor: isLive ? 'rgba(250,204,21,0.06)' : 'rgba(21,31,51,0.55)',
                            }}
                          >
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }} noWrap>
                                  {myTeamName ? (homeSide ? 'vs ' : 'at ') : ''}
                                  {opponent}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block' }}
                                  noWrap
                                >
                                  {formatKickoffLabel(match.kickoff)} · {match.venue || 'Venue TBC'}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                label={isLive ? 'LIVE' : homeSide ? 'HOME' : 'AWAY'}
                                sx={{
                                  height: 19,
                                  fontSize: '0.58rem',
                                  fontWeight: 800,
                                  bgcolor: isLive ? 'rgba(250,204,21,0.16)' : 'rgba(159,176,201,0.1)',
                                  color: isLive ? '#facc15' : '#a7b3c9',
                                }}
                              />
                            </Stack>
                          </Box>
                        )
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              )}

              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.1 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
                      Replies & activity
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        setIsAuthOpen(false)
                        setIsNotificationsOpen(true)
                      }}
                      sx={{ fontSize: '0.7rem', minWidth: 0 }}
                    >
                      View all
                    </Button>
                  </Stack>

                  {recentActivity.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                      Replies to your comments and match alerts will appear here.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {recentActivity.map((notification) => (
                        <Box
                          key={notification.id}
                          onClick={() => void handleNotificationRead(notification.id, notification.read)}
                          sx={{
                            border: '1px solid rgba(159,176,201,0.16)',
                            borderRadius: 1.6,
                            p: 1.1,
                            cursor: 'pointer',
                            bgcolor: notification.read ? 'transparent' : 'rgba(76,227,163,0.07)',
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }} noWrap>
                            {notification.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {notification.message}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              {!isRefereeAccount && (
              <Box component="form" onSubmit={handleSaveProfile} sx={{ display: 'grid', gap: 1.3, mb: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  Team profile
                </Typography>
                <TextField
                  label="Team (optional)"
                  value={profileTeam}
                  onChange={(event) => setProfileTeam(event.target.value)}
                  placeholder="Team name"
                  size="small"
                />
                <TextField
                  select
                  label="County / Eneo"
                  value={profileCounty}
                  onChange={(event) => setProfileCounty(event.target.value)}
                  size="small"
                  helperText="Required if you set a team."
                >
                  {KENYA_COUNTIES.map((countyName) => (
                    <MenuItem key={countyName} value={countyName}>
                      {countyName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Home ground (optional)"
                  value={profileHomeGround}
                  onChange={(event) => setProfileHomeGround(event.target.value)}
                  placeholder="e.g. Nairobi West Ground"
                  size="small"
                  helperText="Required if you set a team."
                />
                <Button type="submit" variant="contained" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving…' : 'Save team'}
                </Button>
                {profileMessage && (
                  <Alert
                    severity="info"
                    onClose={() => setProfileMessage('')}
                    sx={{ py: 0.3, fontSize: '0.78rem' }}
                  >
                    {profileMessage}
                  </Alert>
                )}
              </Box>
              )}

              <Button onClick={handleLogout} variant="outlined" fullWidth>
                Logout
              </Button>
            </>
          ) : authView === 'login' ? (
            <Box component="form" onSubmit={handleLogin} sx={{ display: 'grid', gap: 1.5 }}>
              <TextField
                type="email"
                label="Email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="name@email.com"
                required
              />
              <TextField
                type="password"
                label="Password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="********"
                required
              />
              <Button type="submit" variant="contained" size="large">
                Login
              </Button>
              <Typography variant="body2" color="text.secondary">
                <Button
                  onClick={() => {
                    setForgotEmail(loginEmail)
                    setAuthView('forgot')
                  }}
                  variant="text"
                  size="small"
                  sx={{ p: 0, minWidth: 0 }}
                >
                  Forgot password?
                </Button>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No account yet?{' '}
                <Button onClick={() => setAuthView('register')} variant="text" size="small" sx={{ p: 0, minWidth: 0 }}>
                  Register
                </Button>
              </Typography>
            </Box>
          ) : authView === 'forgot' ? (
            <Box component="form" onSubmit={handleForgotPassword} sx={{ display: 'grid', gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Enter the email on your account and we will send a link to choose a new password.
              </Typography>
              <TextField
                type="email"
                label="Email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="name@email.com"
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={isSendingReset}>
                {isSendingReset ? 'Sending…' : 'Send reset link'}
              </Button>
              <Typography variant="body2" color="text.secondary">
                <Button onClick={() => setAuthView('login')} variant="text" size="small" sx={{ p: 0, minWidth: 0 }}>
                  Back to login
                </Button>
              </Typography>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegister} sx={{ display: 'grid', gap: 1.5 }}>
              <TextField
                label="Name"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                placeholder="Your name"
                required
              />
              {registerRole !== 'Referee' && (
                <>
                  <TextField
                    label="Team (optional)"
                    value={registerTeam}
                    onChange={(event) => setRegisterTeam(event.target.value)}
                    placeholder="Team name"
                    helperText="You can add or change this later from your account."
                  />
                  <TextField
                    select
                    label="County / Eneo"
                    value={registerCounty}
                    onChange={(event) => setRegisterCounty(event.target.value)}
                    helperText="Required if you enter a team."
                  >
                    {KENYA_COUNTIES.map((countyName) => (
                      <MenuItem key={countyName} value={countyName}>
                        {countyName}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Home ground (optional)"
                    value={registerHomeGround}
                    onChange={(event) => setRegisterHomeGround(event.target.value)}
                    placeholder="e.g. Nairobi West Ground"
                    helperText="Required if you enter a team."
                  />
                </>
              )}
              <FormControl required>
                <InputLabel id="register-role-label">Role</InputLabel>
                <Select
                  labelId="register-role-label"
                  value={registerRole}
                  label="Role"
                  onChange={(event) => {
                    const nextRole = event.target.value
                    setRegisterRole(nextRole)
                    if (nextRole === 'Referee') {
                      setRegisterTeam('')
                      setRegisterCounty('')
                      setRegisterHomeGround('')
                    }
                  }}
                >
                  <MenuItem value="TM">TM</MenuItem>
                  <MenuItem value="Coach">COACH</MenuItem>
                  <MenuItem value="captain">CAPTAIN</MenuItem>
                  <MenuItem value="player">PLAYER</MenuItem>
                  <MenuItem value="Referee">REFEREE</MenuItem>
                  <MenuItem value="Fan">FAN</MenuItem>
                </Select>
              </FormControl>
              {registerRole === 'Referee' && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: -0.6 }}>
                  Referees are not attached to a team.
                </Typography>
              )}
              <FormControl required>
                <InputLabel id="register-sport-label">Sport</InputLabel>
                <Select
                  labelId="register-sport-label"
                  value={registerSport}
                  label="Sport"
                  onChange={(event) => setRegisterSport(event.target.value)}
                >
                  {sports.map((sport) => (
                    <MenuItem key={sport} value={sport}>
                      {sport}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                type="email"
                label="Email"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                placeholder="name@email.com"
                required
              />
              <TextField
                type="password"
                label="Password"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                placeholder="Create password"
                required
              />
              <Button type="submit" variant="contained" size="large">
                Register
              </Button>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Button onClick={() => setAuthView('login')} variant="text" size="small" sx={{ p: 0, minWidth: 0 }}>
                  Login
                </Button>
              </Typography>
            </Box>
          )}

        </Box>
      </Drawer>

      <Drawer anchor="right" open={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)}>
        <Box sx={{ width: { xs: '90vw', sm: 390 }, p: 2.5 }} role="presentation">
          <Stack direction="row" sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Notifications
            </Typography>
            <IconButton onClick={() => setIsNotificationsOpen(false)} aria-label="Close notifications drawer">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          {!loggedInUser ? (
            <Alert severity="info">Log in to see your notifications.</Alert>
          ) : notifications.length === 0 ? (
            <Alert severity="info">You do not have any notifications yet.</Alert>
          ) : (
            <Stack spacing={1.4}>
              {notifications.map((notification) => (
                <Box
                  key={notification.id}
                  onClick={() => void handleNotificationRead(notification.id, notification.read)}
                  sx={{
                    border: '1px solid rgba(159,176,201,0.16)',
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: notification.read ? 'transparent' : 'rgba(76,227,163,0.08)',
                    cursor: 'pointer',
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{notification.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                    </Box>
                    <Badge variant="dot" color="primary" invisible={notification.read} />
                  </Stack>
                  <Divider sx={{ my: 1.2 }} />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(notification.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog open={Boolean(reportBooking)} onClose={() => setReportBooking(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 800 }}>Match report</DialogTitle>
        <DialogContent>
          {reportBooking && (
            <Stack spacing={1.4} sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {reportBooking.requesterTeam} vs {reportBooking.recipientTeam} ·{' '}
                {formatBookingWhen(reportBooking.preferredDate, reportBooking.preferredTime)}
              </Typography>
              <Stack direction="row" spacing={1.2}>
                <TextField
                  label={reportBooking.requesterTeam}
                  type="number"
                  size="small"
                  value={reportHomeScore}
                  onChange={(event) => setReportHomeScore(event.target.value)}
                  slotProps={{ htmlInput: { min: 0 } }}
                  fullWidth
                />
                <TextField
                  label={reportBooking.recipientTeam}
                  type="number"
                  size="small"
                  value={reportAwayScore}
                  onChange={(event) => setReportAwayScore(event.target.value)}
                  slotProps={{ htmlInput: { min: 0 } }}
                  fullWidth
                />
              </Stack>
              <TextField
                label="Notes (optional)"
                size="small"
                multiline
                rows={2}
                value={reportNotes}
                onChange={(event) => setReportNotes(event.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportBooking(null)} size="small">
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => void handleSubmitRefereeReport()}
            disabled={isSubmittingReport}
          >
            {isSubmittingReport ? 'Sending…' : 'Submit report'}
          </Button>
        </DialogActions>
      </Dialog>

      <Container maxWidth="lg" sx={{ py: 4, pb: { xs: 12, sm: 4 }, px: { xs: 2, md: 3 }, flex: 1, width: '100%' }}>
        <Outlet
          context={{ loggedInUser, loggedInRole, loggedInAccountId, loggedInTeam } satisfies AuthOutletContext}
        />
      </Container>

      <Box
        component="footer"
        sx={{
          borderTop: '1px solid rgba(159,176,201,0.14)',
          bgcolor: 'background.paper',
          py: 2.5,
          mt: 'auto',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            px: { xs: 2, md: 3 },
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            © {currentYear} Nurevie. For Sports Updates.
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
