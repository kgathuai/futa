import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
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

const normalizeRole = (role: string | null | undefined) => role?.trim().toLowerCase() ?? ''
const isAdminRole = (role: string | null | undefined) => {
  const normalized = normalizeRole(role)
  return normalized === 'admin' || normalized === 'superadmin'
}
const isSuperAdminRole = (role: string | null | undefined) => normalizeRole(role) === 'superadmin'

const roleChipColor = (role: string) => {
  const normalized = normalizeRole(role)
  if (normalized === 'superadmin') {
    return { color: '#ffdf76', border: 'rgba(250,204,21,0.5)', bg: 'rgba(250,204,21,0.12)' }
  }
  if (normalized === 'admin') {
    return { color: '#4ce3a3', border: 'rgba(76,227,163,0.45)', bg: 'rgba(76,227,163,0.12)' }
  }
  return { color: '#a9b3c8', border: 'rgba(159,176,201,0.25)', bg: 'rgba(159,176,201,0.08)' }
}

export function AdminPage() {
  const { loggedInRole, loggedInAccountId } = useOutletContext<AuthOutletContext>()
  const { removeMatch } = useAppData()

  const canAccessAdmin = isAdminRole(loggedInRole)
  const isSuperAdmin = isSuperAdminRole(loggedInRole)

  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [matches, setMatches] = useState<MatchAnnouncement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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

  const canDeleteAccount = (account: AdminAccount) =>
    isSuperAdmin && account.id !== loggedInAccountId && !isSuperAdminRole(account.role)

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
          Admin
        </Typography>
        <Typography color="text.secondary">
          {isSuperAdmin
            ? 'Manage account roles, delete admin accounts, and remove any match.'
            : 'Moderation: remove any match or tournament fixture.'}
        </Typography>
      </Box>

      {message && (
        <Alert severity="success" onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress size={28} sx={{ color: '#adff0f' }} />
        </Stack>
      ) : (
        <>
          <Card variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}
              >
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Accounts
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {accounts.length} registered
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => void load()}>
                  Refresh
                </Button>
              </Stack>

              <Stack spacing={1.2}>
                {accounts.map((account) => {
                  const chip = roleChipColor(account.role)
                  const currentRole =
                    assignableRoles.find(
                      (role) => role.toLowerCase() === account.role.trim().toLowerCase(),
                    ) ?? 'admin'

                  return (
                    <Box
                      key={account.id}
                      sx={{
                        border: '1px solid rgba(159,176,201,0.16)',
                        borderRadius: 2,
                        p: 1.4,
                        display: 'grid',
                        gap: 1,
                        gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.6fr) auto auto' },
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 800 }}>{account.name}</Typography>
                          <Chip
                            size="small"
                            label={account.role.toUpperCase()}
                            sx={{
                              color: chip.color,
                              borderColor: chip.border,
                              bgcolor: chip.bg,
                              fontWeight: 800,
                            }}
                            variant="outlined"
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          {account.email} · {account.team} · {account.sport}
                        </Typography>
                      </Box>

                      {isSuperAdmin && (
                        isSuperAdminRole(account.role) ? (
                          <Typography variant="body2" color="text.secondary">
                            Managed via CLI
                          </Typography>
                        ) : account.id === loggedInAccountId ? (
                          <Typography variant="body2" color="text.secondary">
                            You
                          </Typography>
                        ) : (
                          <TextField
                            select
                            size="small"
                            label="Role"
                            value={currentRole}
                            onChange={(event) => void handleRoleChange(account, event.target.value)}
                            disabled={busyId === account.id}
                            sx={{ minWidth: 130 }}
                          >
                            {assignableRoles.map((role) => (
                              <MenuItem key={role} value={role}>
                                {role}
                              </MenuItem>
                            ))}
                          </TextField>
                        )
                      )}

                      {canDeleteAccount(account) && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          disabled={busyId === account.id}
                          onClick={() => void handleDeleteAccount(account)}
                        >
                          Delete
                        </Button>
                      )}
                    </Box>
                  )
                })}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}
              >
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Matches
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {matches.length} listed
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => void load()}>
                  Refresh
                </Button>
              </Stack>

              {matches.length === 0 ? (
                <Typography color="text.secondary">No matches yet.</Typography>
              ) : (
                <Stack spacing={1}>
                  {matches.map((match) => (
                    <Box
                      key={match.id}
                      sx={{
                        border: '1px solid rgba(159,176,201,0.14)',
                        borderRadius: 1.6,
                        p: 1.2,
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {match.homeTeam} vs {match.awayTeam}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(match.kickoff).toLocaleString()} · {match.venue} · {match.category}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        disabled={busyId === match.id}
                        onClick={() => void handleDeleteMatch(match)}
                      >
                        Delete
                      </Button>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  )
}
