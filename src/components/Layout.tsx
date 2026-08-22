import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
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
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import type { NotificationItem } from '../types'

const sports = ['Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table']

const links = [
  { to: '/', label: 'Home' },
  { to: '/friendlies', label: 'Friendlies' },
  { to: '/team', label: 'Teams' },
  { to: '/tournaments', label: 'Tournaments' },
]

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInAccountId: string | null
  loggedInTeam: string | null
}

export function Layout() {
  const location = useLocation()
  const currentYear = new Date().getFullYear()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'register'>('login')
  const [authMessage, setAuthMessage] = useState('')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [registerName, setRegisterName] = useState('')
  const [registerTeam, setRegisterTeam] = useState('')
  const [registerRole, setRegisterRole] = useState('')
  const [registerSport, setRegisterSport] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

  const [loggedInUser, setLoggedInUser] = useState<string | null>(null)
  const [loggedInRole, setLoggedInRole] = useState<string | null>(null)
  const [loggedInAccountId, setLoggedInAccountId] = useState<string | null>(null)
  const [loggedInTeam, setLoggedInTeam] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

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
        void loadNotifications(response.user.id)
      } catch {
        api.clearToken()
      }
    }

    void restoreSession()
  }, [])

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
      void loadNotifications(response.user.id)
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
    const safeName = registerName.trim()
    const safeTeam = registerTeam.trim()
    const safeRole = registerRole.trim()
    const safeSport = registerSport.trim()
    const safeEmail = registerEmail.trim().toLowerCase()
    const safePassword = registerPassword.trim()

    if (!safeName || !safeTeam || !safeRole || !safeSport || !safeEmail || !safePassword) {
      setAuthMessage('Add your details to create an account.')
      return
    }

    try {
      await api.register({
        name: safeName,
        team: safeTeam,
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
      setRegisterRole('')
      setRegisterSport('')
      setRegisterEmail('')
      setRegisterPassword('')
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Registration failed.')
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
    setNotifications([])
    setAuthMessage('You have logged out.')
  }

  useEffect(() => {
    void loadNotifications(loggedInAccountId)
  }, [loggedInAccountId])

  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length
  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canAccessDashboard =
    Boolean(loggedInUser) &&
    (normalizedRole === 'coach' || normalizedRole === 'tm' || normalizedRole === 'captain')

  const navLinks = canAccessDashboard
    ? [{ to: '/team-dashboard', label: 'Dashboard' }, ...links]
    : links

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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#0d1524',
          borderTop: '1px solid rgba(76,227,163,0.25)',
          borderBottom: '1px solid rgba(159,176,201,0.14)',
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
          <Toolbar disableGutters sx={{ minHeight: 58, gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, fontSize: '1.9rem', letterSpacing: '-0.04em', mr: 1 }}>
              <Box component="span" sx={{ color: 'primary.main' }}>
                Sports
              </Box>
              Hub
            </Typography>

            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
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
                        fontSize: '0.92rem',
                        px: 1.25,
                        py: 0.58,
                        minWidth: 0,
                        color: isActive ? '#06101c' : 'text.secondary',
                        '&:hover': {
                          backgroundColor: isActive ? 'primary.main' : 'rgba(159,176,201,0.1)',
                        },
                      }}
                    >
                      {link.label}
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
                  px: 1.25,
                  py: 0.58,
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
                <AccountCircleRoundedIcon />
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="right" open={isAuthOpen} onClose={() => setIsAuthOpen(false)}>
        <Box sx={{ width: { xs: '90vw', sm: 390 }, p: 2.5 }} role="presentation">
          <Stack direction="row" sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {loggedInUser ? 'Account' : authView === 'login' ? 'Login' : 'Register'}
            </Typography>
            <IconButton onClick={() => setIsAuthOpen(false)} aria-label="Close authentication drawer">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          {loggedInUser ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Signed in: {loggedInUser}
              </Alert>
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
                No account yet?{' '}
                <Button onClick={() => setAuthView('register')} variant="text" size="small" sx={{ p: 0, minWidth: 0 }}>
                  Register
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
              <TextField
                label="Team"
                value={registerTeam}
                onChange={(event) => setRegisterTeam(event.target.value)}
                placeholder="Team name"
                required
              />
              <FormControl required>
                <InputLabel id="register-role-label">Role</InputLabel>
                <Select
                  labelId="register-role-label"
                  value={registerRole}
                  label="Role"
                  onChange={(event) => setRegisterRole(event.target.value)}
                >
                  <MenuItem value="Coach">Coach</MenuItem>
                  <MenuItem value="Referee">Referee</MenuItem>
                  <MenuItem value="player">player</MenuItem>
                  <MenuItem value="captain">captain</MenuItem>
                  <MenuItem value="fun">fun</MenuItem>
                  <MenuItem value="TM">TM</MenuItem>
                </Select>
              </FormControl>
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

          {authMessage && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {authMessage}
            </Alert>
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

      <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, md: 3 }, flex: 1, width: '100%' }}>
        <Outlet
          context={{ loggedInUser, loggedInRole, loggedInAccountId, loggedInTeam } satisfies AuthOutletContext}
        />
      </Container>

      <Box
        component="footer"
        sx={{
          borderTop: '1px solid rgba(159,176,201,0.14)',
          bgcolor: '#0d1524',
          py: 2.5,
          mt: 'auto',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            px: { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {currentYear} Sports Hub. Community football, fixtures, and updates.
          </Typography>
          <Stack direction="row" spacing={1.8} sx={{ alignItems: 'center' }}>
            {links.map((link) => (
              <Button
                key={`footer-${link.to}`}
                component={NavLink}
                to={link.to}
                color="inherit"
                sx={{
                  minWidth: 0,
                  p: 0,
                  color: 'text.secondary',
                  fontSize: '0.82rem',
                  '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}
