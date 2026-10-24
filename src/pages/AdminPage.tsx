import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import SportsSoccerOutlinedIcon from '@mui/icons-material/SportsSoccerOutlined'
import { Navigate, useOutletContext } from 'react-router-dom'
import { api } from '../lib/api'
import { useAppData } from '../context/AppContext'
import type { AdminAccount, MatchAnnouncement } from '../types'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInAccountId: string | null
  loggedInTeam: string | null
}

const assignableRoles = ['admin', 'TM', 'Coach', 'captain', 'player', 'Referee', 'fun'] as const
const publicRoles = ['TM', 'Coach', 'captain', 'player', 'Referee', 'fun'] as const
const sports = ['Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Pool Table'] as const

const normalizeRole = (role: string | null | undefined) => role?.trim().toLowerCase() ?? ''
const isAdminRole = (role: string | null | undefined) => {
  const normalized = normalizeRole(role)
  return normalized === 'admin' || normalized === 'superadmin'
}
const isSuperAdminRole = (role: string | null | undefined) => normalizeRole(role) === 'superadmin'

const roleChip = (role: string) => {
  const normalized = normalizeRole(role)
  if (normalized === 'superadmin') {
    return { color: '#ffdf76', border: 'rgba(250,204,21,0.45)', bg: 'rgba(250,204,21,0.1)' }
  }
  if (normalized === 'admin') {
    return { color: '#4ce3a3', border: 'rgba(76,227,163,0.4)', bg: 'rgba(76,227,163,0.08)' }
  }
  return { color: '#9fa9c0', border: 'rgba(159,176,201,0.22)', bg: 'rgba(159,176,201,0.06)' }
}

const avatarTone = (role: string) => {
  const normalized = normalizeRole(role)
  if (normalized === 'superadmin') {
    return { bg: 'rgba(250,204,21,0.14)', fg: '#ffdf76' }
  }
  if (normalized === 'admin') {
    return { bg: 'rgba(76,227,163,0.14)', fg: '#4ce3a3' }
  }
  return { bg: 'rgba(159,176,201,0.1)', fg: '#a9b3c8' }
}

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
}

const formatMatchDate = (value: string) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return 'TBD'
  }
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 1.6,
        borderColor: 'rgba(159,176,201,0.14)',
        background: 'linear-gradient(180deg, rgba(21,31,51,0.72) 0%, rgba(14,22,38,0.72) 100%)',
      }}
    >
      <CardContent sx={{ py: 0.9, px: 1.3, '&:last-child': { pb: 0.9 } }}>
        <Typography
          sx={{ fontSize: '0.55rem', letterSpacing: '0.14em', fontWeight: 800, color: '#66708a' }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.2, color: accent }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

export function AdminPage() {
  const { loggedInRole, loggedInAccountId } = useOutletContext<AuthOutletContext>()
  const { removeMatch } = useAppData()

  const canAccessAdmin = isSuperAdminRole(loggedInRole)
  const isSuperAdmin = canAccessAdmin

  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [matches, setMatches] = useState<MatchAnnouncement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'superadmin' | 'admin' | 'members'>('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('player')
  const [newTeam, setNewTeam] = useState('')
  const [newSport, setNewSport] = useState('Football')
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const load = useCallback(async () => {
    const token = api.getToken()
    if (!token) {
      setError('Please log in again.')
      return
    }

    setIsLoading(true)
    try {
      const [accountList, matchList] = await Promise.all([
        api.getAdminAccounts(token),
        api.getMatches(),
      ])
      setAccounts(accountList)
      setMatches(matchList)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load admin data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canAccessAdmin) {
      return
    }
    void load()
  }, [canAccessAdmin, load])

  const filteredAccounts = useMemo(() => {
    const term = query.trim().toLowerCase()

    return accounts.filter((account) => {
      const normalized = normalizeRole(account.role)
      const roleMatch =
        roleFilter === 'all' ||
        normalized === roleFilter ||
        (roleFilter === 'members' && !isAdminRole(account.role))

      if (!roleMatch) {
        return false
      }

      if (!term) {
        return true
      }

      return [account.name, account.email, account.team, account.role, account.sport]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [accounts, query, roleFilter])

  const stats = useMemo(
    () => ({
      total: accounts.length,
      superadmins: accounts.filter((account) => normalizeRole(account.role) === 'superadmin').length,
      admins: accounts.filter((account) => normalizeRole(account.role) === 'admin').length,
      matches: matches.length,
    }),
    [accounts, matches.length],
  )

  if (!canAccessAdmin) {
    return <Navigate to="/" replace />
  }

  const handleRoleChange = async (account: AdminAccount, role: string) => {
    const token = api.getToken()
    if (!token) {
      return
    }

    setBusyId(account.id)
    try {
      const updated = await api.updateAccountRole(account.id, role, token)
      setAccounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setError('')
      setMessage(`Updated ${updated.name}'s role to ${updated.role}.`)
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Failed to update role.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteAccount = async (account: AdminAccount) => {
    const token = api.getToken()
    if (!token) {
      return
    }

    if (!window.confirm(`Delete ${account.name} <${account.email}>? Their team and matches are kept.`)) {
      return
    }

    setBusyId(account.id)
    try {
      await api.deleteAccount(account.id, token)
      setAccounts((prev) => prev.filter((item) => item.id !== account.id))
      setError('')
      setMessage(`Deleted ${account.name}.`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete account.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteMatch = async (match: MatchAnnouncement) => {
    const token = api.getToken()
    if (!token) {
      return
    }

    if (!window.confirm(`Delete ${match.homeTeam} vs ${match.awayTeam}? This cannot be undone.`)) {
      return
    }

    setBusyId(match.id)
    try {
      await api.deleteMatch(match.id, token)
      setMatches((prev) => prev.filter((item) => item.id !== match.id))
      removeMatch(match.id)
      setError('')
      setMessage(`Deleted ${match.homeTeam} vs ${match.awayTeam}.`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete match.')
    } finally {
      setBusyId(null)
    }
  }

  const resetCreateForm = () => {
    setNewName('')
    setNewEmail('')
    setNewPassword('')
    setNewRole('player')
    setNewTeam('')
    setNewSport('Football')
    setCreateError('')
  }

  const handleCreateAccount = async () => {
    const token = api.getToken()
    if (!token) {
      return
    }

    const isReferee = newRole === 'Referee'
    const name = newName.trim()
    const email = newEmail.trim().toLowerCase()
    const password = newPassword.trim()
    const team = isReferee ? '' : newTeam.trim()

    if (!name || !email || !password || (!isReferee && !team)) {
      setCreateError('Fill in all required fields.')
      return
    }

    setIsCreating(true)
    try {
      const created = await api.createAccount(
        { name, email, password, role: newRole, sport: newSport, team },
        token,
      )
      setAccounts((prev) => [...prev, created])
      setRoleFilter('all')
      setQuery('')
      setCreateOpen(false)
      resetCreateForm()
      setError('')
      setMessage(`Created ${created.name} (${created.role}).`)
    } catch (createAccountError) {
      setCreateError(
        createAccountError instanceof Error ? createAccountError.message : 'Failed to create account.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  const canDeleteAccount = (account: AdminAccount) =>
    isSuperAdmin && account.id !== loggedInAccountId && !isSuperAdminRole(account.role)

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}
      >
        <Box>
          <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', mb: 0.3 }}>
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: '0.9rem', color: '#4ce3a3' }} />
            <Typography
              sx={{ fontSize: '0.56rem', letterSpacing: '0.18em', fontWeight: 800, color: '#5f6a84' }}
            >
              ADMIN CONSOLE
            </Typography>
          </Stack>
          <Typography
            sx={{ fontSize: { xs: '1.2rem', md: '1.45rem' }, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}
          >
            Access &amp; moderation
          </Typography>
          <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mt: 0.25 }}>
            {isSuperAdmin
              ? 'Manage roles, remove admin accounts, and delete any match.'
              : 'Remove any match or tournament fixture.'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center' }}>
          <Chip
            size="small"
            label={isSuperAdmin ? 'SUPERADMIN' : 'ADMIN'}
            sx={{
              height: 20,
              fontSize: '0.55rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: isSuperAdmin ? '#ffdf76' : '#4ce3a3',
              bgcolor: isSuperAdmin ? 'rgba(250,204,21,0.1)' : 'rgba(76,227,163,0.1)',
              border: `1px solid ${isSuperAdmin ? 'rgba(250,204,21,0.35)' : 'rgba(76,227,163,0.35)'}`,
              '& .MuiChip-label': { px: 0.7 },
            }}
          />
          <Button
            size="small"
            variant="contained"
            startIcon={<PersonAddAltRoundedIcon sx={{ fontSize: '0.9rem' }} />}
            onClick={() => {
              resetCreateForm()
              setCreateOpen(true)
            }}
            sx={{
              fontSize: '0.7rem',
              py: 0.35,
              px: 1.1,
              bgcolor: '#4ce3a3',
              color: '#07111f',
              fontWeight: 800,
              '&:hover': { bgcolor: '#3ecf92' },
            }}
          >
            New account
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshRoundedIcon sx={{ fontSize: '0.85rem' }} />}
            onClick={() => void load()}
            disabled={isLoading}
            sx={{ fontSize: '0.7rem', py: 0.35, px: 1.1, borderColor: 'rgba(159,176,201,0.25)' }}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {message && (
        <Alert severity="success" onClose={() => setMessage('')} sx={{ fontSize: '0.75rem', py: 0.35 }}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ fontSize: '0.75rem', py: 0.35 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', md: 'repeat(4, minmax(0,1fr))' },
        }}
      >
        <StatTile label="ACCOUNTS" value={stats.total} accent="#edf2f7" />
        <StatTile label="SUPERADMINS" value={stats.superadmins} accent="#ffdf76" />
        <StatTile label="ADMINS" value={stats.admins} accent="#4ce3a3" />
        <StatTile label="MATCHES" value={stats.matches} accent="#adff0f" />
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0.8}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <TextField
          size="small"
          placeholder="Search name, email, team…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{
            maxWidth: { sm: 300 },
            '& .MuiInputBase-input': { fontSize: '0.76rem', py: 0.6 },
            '& .MuiOutlinedInput-root': { borderRadius: 1.4 },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: '0.95rem', color: '#6b7590' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          value={roleFilter}
          onChange={(event) =>
            setRoleFilter(event.target.value as 'all' | 'superadmin' | 'admin' | 'members')
          }
          sx={{
            minWidth: 140,
            '& .MuiInputBase-input': { fontSize: '0.74rem', py: 0.6 },
            '& .MuiOutlinedInput-root': { borderRadius: 1.4 },
          }}
        >
          <MenuItem value="all" sx={{ fontSize: '0.76rem' }}>All roles</MenuItem>
          <MenuItem value="superadmin" sx={{ fontSize: '0.76rem' }}>Superadmins</MenuItem>
          <MenuItem value="admin" sx={{ fontSize: '0.76rem' }}>Admins</MenuItem>
          <MenuItem value="members" sx={{ fontSize: '0.76rem' }}>Members</MenuItem>
        </TextField>
      </Stack>

      {isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress size={22} sx={{ color: '#adff0f' }} />
        </Stack>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1.4,
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.8fr) minmax(0,1fr)' },
            alignItems: 'start',
          }}
        >
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: 'rgba(159,176,201,0.14)',
              background: 'linear-gradient(180deg, rgba(21,31,51,0.6) 0%, rgba(13,21,36,0.6) 100%)',
              overflow: 'hidden',
            }}
          >
            <Stack
              direction="row"
              sx={{ px: 1.5, py: 1, justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(159,176,201,0.1)' }}
            >
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.01em' }}>
                Accounts
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', color: '#66708a' }}>
                {filteredAccounts.length} of {accounts.length}
              </Typography>
            </Stack>

            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) 128px 34px',
                gap: 1,
                px: 1.5,
                py: 0.55,
                borderBottom: '1px solid rgba(159,176,201,0.07)',
                bgcolor: 'rgba(255,255,255,0.012)',
              }}
            >
              {['ACCOUNT', 'TEAM', 'ROLE', ''].map((label, index) => (
                <Typography
                  key={`account-head-${index}`}
                  sx={{ fontSize: '0.54rem', letterSpacing: '0.12em', fontWeight: 800, color: '#5f6a84' }}
                >
                  {label}
                </Typography>
              ))}
            </Box>

            {filteredAccounts.length === 0 ? (
              <Stack sx={{ alignItems: 'center', py: 5, gap: 0.6 }}>
                <SearchOffRoundedIcon sx={{ fontSize: '1.35rem', color: '#3f4a63' }} />
                <Typography sx={{ fontSize: '0.74rem', color: '#66708a' }}>
                  No accounts match your filters.
                </Typography>
              </Stack>
            ) : (
              <Stack divider={<Box sx={{ height: '1px', bgcolor: 'rgba(159,176,201,0.06)' }} />}>
                {filteredAccounts.map((account) => {
                  const chip = roleChip(account.role)
                  const avatar = avatarTone(account.role)
                  const currentRole =
                    assignableRoles.find(
                      (role) => role.toLowerCase() === account.role.trim().toLowerCase(),
                    ) ?? 'admin'

                  return (
                    <Box
                      key={account.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'minmax(0,1fr) auto',
                          md: 'minmax(0,2fr) minmax(0,1fr) 128px 34px',
                        },
                        gap: 1,
                        px: 1.5,
                        py: 0.8,
                        alignItems: 'center',
                        transition: 'background-color 120ms ease',
                        '&:hover': { bgcolor: 'rgba(76,227,163,0.025)' },
                      }}
                    >
                      <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center', minWidth: 0 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            bgcolor: avatar.bg,
                            color: avatar.fg,
                          }}
                        >
                          {initialsOf(account.name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={0.55} sx={{ alignItems: 'center', minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {account.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={account.role.toUpperCase()}
                              sx={{
                                height: 16,
                                fontSize: '0.5rem',
                                fontWeight: 800,
                                letterSpacing: '0.06em',
                                color: chip.color,
                                bgcolor: chip.bg,
                                border: `1px solid ${chip.border}`,
                                '& .MuiChip-label': { px: 0.55 },
                              }}
                            />
                          </Stack>
                          <Typography
                            sx={{
                              fontSize: '0.64rem',
                              color: '#7f8aa3',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {account.email}
                          </Typography>
                        </Box>
                      </Stack>

                      <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            color: '#a9b3c8',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {account.team || 'No team'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.58rem', color: '#66708a' }}>
                          {account.sport}
                        </Typography>
                      </Box>

                      {isSuperAdmin ? (
                        isSuperAdminRole(account.role) ? (
                          <Typography sx={{ fontSize: '0.6rem', color: '#66708a' }}>CLI only</Typography>
                        ) : account.id === loggedInAccountId ? (
                          <Typography sx={{ fontSize: '0.6rem', color: '#66708a' }}>You</Typography>
                        ) : (
                          <TextField
                            select
                            fullWidth
                            size="small"
                            value={currentRole}
                            onChange={(event) => void handleRoleChange(account, event.target.value)}
                            disabled={busyId === account.id}
                            sx={{
                              '& .MuiInputBase-input': { fontSize: '0.68rem', py: 0.4 },
                              '& .MuiOutlinedInput-root': { borderRadius: 1.1 },
                              '& .MuiSelect-icon': { fontSize: '1rem' },
                            }}
                          >
                            {assignableRoles.map((role) => (
                              <MenuItem key={role} value={role} sx={{ fontSize: '0.72rem' }}>
                                {role}
                              </MenuItem>
                            ))}
                          </TextField>
                        )
                      ) : (
                        <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.6rem', color: '#66708a' }}>
                          View only
                        </Typography>
                      )}

                      {canDeleteAccount(account) ? (
                        <Tooltip title="Delete account">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={busyId === account.id}
                              onClick={() => void handleDeleteAccount(account)}
                              aria-label={`Delete ${account.name}`}
                              sx={{ p: 0.4 }}
                            >
                              <DeleteOutlineRoundedIcon sx={{ fontSize: '0.95rem' }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Box />
                      )}
                    </Box>
                  )
                })}
              </Stack>
            )}
          </Card>

          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: 'rgba(159,176,201,0.14)',
              background: 'linear-gradient(180deg, rgba(21,31,51,0.6) 0%, rgba(13,21,36,0.6) 100%)',
              overflow: 'hidden',
            }}
          >
            <Stack
              direction="row"
              sx={{ px: 1.5, py: 1, justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(159,176,201,0.1)' }}
            >
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.01em' }}>
                Matches
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', color: '#66708a' }}>
                {matches.length} total
              </Typography>
            </Stack>

            {matches.length === 0 ? (
              <Stack sx={{ alignItems: 'center', py: 5, gap: 0.6 }}>
                <SportsSoccerOutlinedIcon sx={{ fontSize: '1.4rem', color: '#3f4a63' }} />
                <Typography sx={{ fontSize: '0.74rem', color: '#66708a' }}>No matches yet.</Typography>
              </Stack>
            ) : (
              <Stack divider={<Box sx={{ height: '1px', bgcolor: 'rgba(159,176,201,0.06)' }} />}>
                {matches.map((match) => (
                  <Box
                    key={match.id}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      justifyContent: 'space-between',
                      transition: 'background-color 120ms ease',
                      '&:hover': { bgcolor: 'rgba(76,227,163,0.025)' },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {match.homeTeam}{' '}
                        <Box component="span" sx={{ color: '#606a82', fontWeight: 500 }}>
                          vs
                        </Box>{' '}
                        {match.awayTeam}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.6rem', color: '#7f8aa3', whiteSpace: 'nowrap' }}>
                          {formatMatchDate(match.kickoff)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', color: '#4c556b' }}>·</Typography>
                        <Typography
                          sx={{
                            fontSize: '0.6rem',
                            color: '#7f8aa3',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {match.venue}
                        </Typography>
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', flexShrink: 0 }}>
                      <Chip
                        label={match.category.toUpperCase()}
                        size="small"
                        sx={{
                          height: 15,
                          fontSize: '0.48rem',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          color: '#9fa9c0',
                          bgcolor: 'rgba(159,176,201,0.06)',
                          border: '1px solid rgba(159,176,201,0.18)',
                          '& .MuiChip-label': { px: 0.5 },
                        }}
                      />
                      <Tooltip title="Delete match">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={busyId === match.id}
                            onClick={() => void handleDeleteMatch(match)}
                            aria-label={`Delete ${match.homeTeam} vs ${match.awayTeam}`}
                            sx={{ p: 0.4 }}
                          >
                            <DeleteOutlineRoundedIcon sx={{ fontSize: '0.95rem' }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
        </Box>
      )}

      <Dialog
        open={createOpen}
        onClose={() => {
          if (!isCreating) {
            setCreateOpen(false)
            resetCreateForm()
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 800, pb: 0.5 }}>
          Create account
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ pt: 1 }}>
            <TextField
              size="small"
              label="Name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              autoFocus
              sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
            />
            <TextField
              size="small"
              type="email"
              label="Email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
            />
            <TextField
              size="small"
              type="password"
              label="Initial password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              helperText="Share this with the user so they can log in."
              sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <TextField
                select
                size="small"
                label="Role"
                value={newRole}
                onChange={(event) => {
                  const nextRole = event.target.value
                  setNewRole(nextRole)
                  if (nextRole === 'Referee') {
                    setNewTeam('')
                  }
                }}
                sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.78rem' } }}
              >
                {publicRoles.map((role) => (
                  <MenuItem key={role} value={role} sx={{ fontSize: '0.78rem' }}>
                    {role}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Sport"
                value={newSport}
                onChange={(event) => setNewSport(event.target.value)}
                sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.78rem' } }}
              >
                {sports.map((sport) => (
                  <MenuItem key={sport} value={sport} sx={{ fontSize: '0.78rem' }}>
                    {sport}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {newRole !== 'Referee' && (
              <TextField
                size="small"
                label="Team"
                value={newTeam}
                onChange={(event) => setNewTeam(event.target.value)}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
              />
            )}
            {newRole === 'Referee' && (
              <Typography sx={{ fontSize: '0.66rem', color: '#7f8aa3' }}>
                Referees are not attached to a team.
              </Typography>
            )}
            {createError && (
              <Alert severity="error" sx={{ fontSize: '0.72rem', py: 0.3 }}>
                {createError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.6 }}>
          <Button
            size="small"
            onClick={() => {
              setCreateOpen(false)
              resetCreateForm()
            }}
            disabled={isCreating}
            sx={{ fontSize: '0.72rem' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => void handleCreateAccount()}
            disabled={isCreating}
            sx={{ fontSize: '0.72rem' }}
          >
            {isCreating ? 'Creating…' : 'Create account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
