import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { FriendlyRequest } from '../types'
import { formatMatchLength } from '../lib/matchFormat'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInTeam: string | null
}

const formatKickoff = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time || '00:00'}`)
  if (!Number.isFinite(parsed.getTime())) {
    return `${date} at ${time || '00:00'}`
  }
  return parsed.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Public landing page for a shared friendly invite. A team or individual that
 * is not registered yet can open the link, sign up and accept the friendly.
 */
export function FriendlyInvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { loggedInUser, loggedInTeam } = useOutletContext<AuthOutletContext>()
  const [invite, setInvite] = useState<FriendlyRequest | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [message, setMessage] = useState('')
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    let active = true
    setState('loading')
    void api
      .getFriendlyInvite(token)
      .then((response) => {
        if (active) {
          setInvite(response)
          setState('ready')
        }
      })
      .catch(() => {
        if (active) {
          setState('missing')
        }
      })
    return () => {
      active = false
    }
  }, [token])

  const openAccountPanel = () => {
    document.querySelector<HTMLButtonElement>('[aria-label="Account"]')?.click()
  }

  const handleClaim = async () => {
    const authToken = api.getToken()
    if (!authToken) {
      openAccountPanel()
      return
    }
    setClaiming(true)
    setMessage('')
    try {
      await api.claimFriendlyInvite(token, authToken)
      navigate('/')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not accept this invite.')
    } finally {
      setClaiming(false)
    }
  }

  if (state === 'loading') {
    return (
      <Stack spacing={2}>
        <Typography color="text.secondary">Loading invite…</Typography>
      </Stack>
    )
  }

  if (state === 'missing' || !invite) {
    return (
      <Alert severity="warning">
        This friendly invite is no longer available — it may have been accepted already.
      </Alert>
    )
  }

  const isRequester = Boolean(loggedInUser && invite.requesterName === loggedInUser)
  const length = formatMatchLength({ sport: invite.sport, raceTo: invite.raceTo })

  return (
    <Stack spacing={2.4} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.4,
          borderColor: 'rgba(76,227,163,0.32)',
          background:
            'linear-gradient(135deg, rgba(76,227,163,0.14) 0%, rgba(20,32,52,0.6) 55%, rgba(13,21,36,0.7) 100%)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.4, md: 3.2 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.8, mb: 1.2 }}>
            <Chip
              size="small"
              label="FRIENDLY INVITE"
              sx={{ fontWeight: 800, fontSize: '0.6rem', letterSpacing: '0.08em', bgcolor: 'primary.main', color: 'primary.contrastText' }}
            />
            <Typography sx={{ fontSize: '0.62rem', letterSpacing: '0.14em', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
              {invite.sport} · {invite.status}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            {invite.requesterTeam} vs {invite.recipientTeam}
          </Typography>
          <Stack
            direction="row"
            spacing={{ xs: 1, md: 1.4 }}
            sx={{ mt: 1.4, alignItems: 'center', flexWrap: 'wrap', rowGap: 0.6, color: 'text.secondary' }}
          >
            <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 16 }} />
              <Typography sx={{ fontSize: '0.82rem' }}>{formatKickoff(invite.preferredDate, invite.preferredTime)}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
              <FmdGoodOutlinedIcon sx={{ fontSize: 16 }} />
              <Typography sx={{ fontSize: '0.82rem' }}>{invite.location}</Typography>
            </Stack>
            {length ? <Typography sx={{ fontSize: '0.82rem' }}>• {length}</Typography> : null}
            <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
              <EmojiEventsOutlinedIcon sx={{ fontSize: 16 }} />
              <Typography sx={{ fontSize: '0.82rem' }}>{invite.referee || 'Referee to be confirmed'}</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.4}>
            <Box>
              <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 800, color: 'text.secondary', mb: 0.4 }}>
                REQUESTED BY
              </Typography>
              <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                <PersonOutlineRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {invite.requesterName} · {invite.requesterTeam}
                </Typography>
              </Stack>
            </Box>
            <Divider />
            <Box>
              <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 800, color: 'text.secondary', mb: 0.4 }}>
                CONTACT
              </Typography>
              <Typography>{invite.contact}</Typography>
            </Box>
            {invite.note ? (
              <Box>
                <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 800, color: 'text.secondary', mb: 0.4 }}>
                  MESSAGE
                </Typography>
                <Typography sx={{ color: 'text.secondary' }}>{invite.note}</Typography>
              </Box>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {message && <Alert severity="error">{message}</Alert>}

      {isRequester ? (
        <Alert severity="info">
          You sent this invite. Share the link with {invite.recipientTeam} so they can accept it.
        </Alert>
      ) : loggedInUser ? (
        <Button variant="contained" size="large" onClick={() => void handleClaim()} disabled={claiming}>
          {claiming ? 'Accepting…' : `Accept friendly as ${loggedInTeam || loggedInUser}`}
        </Button>
      ) : (
        <Stack spacing={1}>
          <Alert severity="info">Sign in with your team account (or create one) to accept this friendly.</Alert>
          <Button variant="contained" size="large" onClick={openAccountPanel}>
            Sign in / register to accept
          </Button>
        </Stack>
      )}
    </Stack>
  )
}
