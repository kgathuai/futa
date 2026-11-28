import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import SportsSoccerOutlinedIcon from '@mui/icons-material/SportsSoccerOutlined'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInTeam: string | null
}

const openAuth = (view: 'login' | 'register') => {
  window.dispatchEvent(new CustomEvent('kambumbu:open-auth', { detail: { view } }))
}

/**
 * Public landing page for a shared "join Kambumbu" invite link. Opens the
 * account drawer straight on the register form.
 */
export function JoinPage() {
  const [searchParams] = useSearchParams()
  const { loggedInUser, loggedInTeam } = useOutletContext<AuthOutletContext>()
  const inviter = searchParams.get('from')?.trim() ?? ''

  if (loggedInUser) {
    return (
      <Stack spacing={2.4} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
        <Card variant="outlined">
          <CardContent>
            <Chip
              size="small"
              label="KAMBUMBU"
              sx={{ fontWeight: 800, fontSize: '0.6rem', letterSpacing: '0.08em', bgcolor: 'primary.main', color: 'primary.contrastText', mb: 1.4 }}
            />
            <Typography sx={{ fontSize: { xs: '1.35rem', md: '1.8rem' }, fontWeight: 800, lineHeight: 1.15 }}>
              You&apos;re already part of Kambumbu.
            </Typography>
            <Typography sx={{ mt: 1, color: 'text.secondary' }}>
              Signed in as {loggedInUser}
              {loggedInTeam?.trim() ? ` · ${loggedInTeam}` : ''}. Invite someone else from your account page.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
              <Button component={Link} to="/" variant="contained">
                Go to home
              </Button>
              <Button component={Link} to="/team" variant="outlined">
                Browse teams
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    )
  }

  return (
    <Stack spacing={2.4} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.4,
          borderColor: 'rgba(76,227,163,0.32)',
          background:
            'linear-gradient(135deg, rgba(76,227,163,0.16) 0%, rgba(20,32,52,0.66) 45%, rgba(13,21,36,0.6) 100%)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.6, md: 3.6 } }}>
          <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.16em', fontWeight: 800, color: 'primary.main', mb: 1 }}>
            YOU&apos;RE INVITED TO KAMBUMBU
          </Typography>
          <Typography sx={{ fontSize: { xs: '1.6rem', md: '2.3rem' }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Join the local sport community.
          </Typography>
          <Typography sx={{ mt: 1.2, color: 'text.secondary', maxWidth: 640 }}>
            {inviter ? `${inviter} invited you to Kambumbu. ` : ''}
            Create an account to find teams, book friendlies, join tournaments and keep every result in one place.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2.2 }}>
            <Button variant="contained" size="large" onClick={() => openAuth('register')}>
              Create my account
            </Button>
            <Button variant="outlined" size="large" onClick={() => openAuth('login')}>
              I already have an account
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <GroupsOutlinedIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 700 }}>Find teams and players around you</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <SportsSoccerOutlinedIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 700 }}>Book friendlies and confirm them from the app</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <EmojiEventsOutlinedIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 700 }}>Run tournaments, follow results and build your record</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
