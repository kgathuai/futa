import { Avatar, Box, Chip, Stack, Typography } from '@mui/material'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import type { MatchAnnouncement } from '../types'
import { MatchEngagementPanel } from './MatchEngagementPanel'

interface MatchShowcaseCardProps {
  match: MatchAnnouncement
  runtimeStatus: 'scheduled' | 'playing' | 'finished'
  canInteract: boolean
  onLike: (matchId: string) => Promise<boolean>
  onComment: (matchId: string, comment: string) => Promise<boolean>
  onCommentLike: (matchId: string, commentId: string) => Promise<boolean>
  onCommentReply: (matchId: string, commentId: string, comment: string) => Promise<boolean>
  onRate: (matchId: string, rating: number) => Promise<boolean>
  getTeamLogo?: (teamName: string) => string | undefined
}

const formatKickoffDate = (value: string) =>
  new Date(value).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

const formatKickoffTime = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

const statusColor = (status: MatchShowcaseCardProps['runtimeStatus']) => {
  if (status === 'finished') {
    return { border: 'rgba(189,67,80,0.65)', glow: 'rgba(81,30,41,0.72)', text: '#ff4f62' }
  }

  if (status === 'playing') {
    return { border: 'rgba(52,211,153,0.48)', glow: 'rgba(18,68,52,0.7)', text: '#6ee7b7' }
  }

  return { border: 'rgba(214,183,48,0.55)', glow: 'rgba(86,71,26,0.68)', text: '#facc15' }
}

export function MatchShowcaseCard({
  match,
  runtimeStatus,
  canInteract,
  onLike,
  onComment,
  onCommentLike,
  onCommentReply,
  onRate,
  getTeamLogo,
}: MatchShowcaseCardProps) {
  const statusTheme = statusColor(runtimeStatus)

  const TeamBadge = ({
    teamName,
    homeAway,
    accent,
  }: {
    teamName: string
    homeAway: 'HOME' | 'AWAY'
    accent: string
  }) => {
    const logo = getTeamLogo?.(teamName)

    return (
      <Stack spacing={0.42} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Box
          sx={{
            width: { xs: 37, sm: 42, md: 50 },
            height: { xs: 37, sm: 42, md: 50 },
            borderRadius: '50%',
            border: { xs: `2px solid ${accent}`, sm: `2px solid ${accent}` },
            bgcolor: 'rgba(23,27,42,0.92)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: {
              xs: `0 0 0 1px rgba(115,126,173,0.2), 0 0 8px ${accent}`,
              sm: `0 0 0 1px rgba(115,126,173,0.2), 0 0 13px ${accent}`,
            },
          }}
        >
          {logo ? (
            <Avatar src={logo} alt={`${teamName} logo`} sx={{ width: { xs: 19, sm: 22, md: 28 }, height: { xs: 19, sm: 22, md: 28 } }} />
          ) : (
            <Typography sx={{ fontWeight: 900, color: accent, fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.78rem' }, letterSpacing: '0.01em' }}>
              {teamName.slice(0, 2).toUpperCase()}
            </Typography>
          )}
        </Box>

        <Typography
          sx={{
            fontSize: { xs: '0.69rem', sm: '0.81rem', md: '1.11rem' },
            fontWeight: 900,
            letterSpacing: { xs: '-0.01em', md: '-0.03em' },
            color: '#e3e7f5',
            textAlign: 'center',
            lineHeight: 1.08,
            maxWidth: { xs: 96, sm: 132, md: 220 },
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {teamName}
        </Typography>
        <Typography sx={{ fontSize: { xs: '0.38rem', sm: '0.44rem', md: '0.56rem' }, letterSpacing: { xs: '0.12em', md: '0.18em' }, color: '#808aa8' }}>
          {homeAway}
        </Typography>
      </Stack>
    )
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: 640, md: 640 },
        mx: 'auto',
        borderRadius: { xs: 1.8, md: 2.7 },
        border: '1px solid rgba(56,63,90,0.85)',
        p: { xs: 0.78, sm: 1.02, md: 1.26 },
        background:
          'radial-gradient(120% 120% at 20% 0%, rgba(40,55,120,0.14) 0%, rgba(20,22,33,0.98) 42%, rgba(18,20,30,1) 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.03), inset 0 0 0 1px rgba(94,104,141,0.14), 0 14px 30px rgba(4,6,14,0.42)',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: { xs: 0.78, sm: 0.96, md: 1.26 }, gap: 0.48 }}>
        <Chip
          label={match.category.toUpperCase()}
          sx={{
            borderRadius: 1.8,
            height: { xs: 18, md: 20 },
            bgcolor: 'rgba(30,45,24,0.6)',
            border: '1px solid rgba(108,170,24,0.62)',
            color: '#b6ff1a',
            fontWeight: 300,
            letterSpacing: { xs: '0.1em', md: '0.2em' },
            px: { xs: 0.7, md: 0.95 },
            '& .MuiChip-label': { px: { xs: 0.6, md: 0.95 }, fontSize: { xs: '0.41rem', sm: '0.43rem', md: '0.47rem' } },
          }}
        />
        <Chip
          label={`● ${runtimeStatus.toUpperCase()}`}
          sx={{
            borderRadius: 1.8,
            height: { xs: 18, md: 20 },
            bgcolor: statusTheme.glow,
            border: `1px solid ${statusTheme.border}`,
            color: statusTheme.text,
            fontWeight: 800,
            letterSpacing: { xs: '0.1em', md: '0.2em' },
            px: { xs: 0.7, md: 0.95 },
            '& .MuiChip-label': { px: { xs: 0.6, md: 0.95 }, fontSize: { xs: '0.41rem', sm: '0.43rem', md: '0.47rem' } },
          }}
        />
      </Stack>

      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: { xs: 0.72, sm: 0.9, md: 1.14 },
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          columnGap: { xs: 0.18, sm: 0.3, md: 0.48 },
        }}
      >
        <TeamBadge teamName={match.homeTeam} homeAway="HOME" accent="rgba(96,119,255,0.55)" />

        <Box
          sx={{
            width: { xs: 26, sm: 30, md: 34 },
            height: { xs: 26, sm: 30, md: 34 },
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(58,66,95,0.42)',
            border: '1px solid rgba(121,128,164,0.35)',
            boxShadow: { xs: '0 0 4px rgba(126,101,255,0.18)', sm: '0 0 7px rgba(126,101,255,0.2)', md: '0 0 10px rgba(126,101,255,0.22)' },
            mt: { xs: -0.06, sm: -0.06, md: -0.09 },
          }}
        >
          <Typography sx={{ fontSize: { xs: '.18rem', sm: '.3rem', md: '.36rem' }, fontWeight: 400, color: '#f0eaff', letterSpacing: '0.03em' }}>
            VS
          </Typography>
        </Box>

        <TeamBadge teamName={match.awayTeam} homeAway="AWAY" accent="rgba(250,204,21,0.5)" />
      </Stack>

      <Box
        sx={{
          border: '1px solid rgba(51,58,84,0.85)',
          bgcolor: 'rgba(14,16,24,0.9)',
          borderRadius: 1.44,
          p: { xs: 0.54, sm: 0.66, md: 0.72 },
          display: 'flex',
          gap: { xs: 0.42, sm: 0.54, md: 0.57 },
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            width: { xs: 19, sm: 23, md: 31 },
            height: { xs: 19, sm: 23, md: 31 },
            borderRadius: 0.72,
            bgcolor: 'rgba(39,43,63,0.8)',
            border: '1px solid rgba(67,74,106,0.7)',
            display: 'grid',
            placeItems: 'center',
            color: '#9ba3ba',
            flexShrink: 0,
          }}
        >
          <EventOutlinedIcon sx={{ fontSize: { xs: '0.57rem', sm: '0.64rem', md: '0.85rem' } }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: '0.57rem', sm: '0.65rem', md: '0.72rem' }, fontWeight: 900, letterSpacing: '-0.01em', color: '#e1e6f7', lineHeight: 1.08, overflowWrap: 'anywhere' }}>
            {formatKickoffDate(match.kickoff)}
          </Typography>
          <Typography sx={{ color: '#8c94aa', letterSpacing: { xs: '0.01em', md: '0.03em' }, fontSize: { xs: '0.36rem', sm: '0.41rem', md: '0.5rem' }, textTransform: 'capitalize' }}>
            {formatKickoffTime(match.kickoff)} • Two Team Match
          </Typography>
        </Box>
      </Box>

      <MatchEngagementPanel
        match={match}
        canInteract={canInteract}
        onLike={onLike}
        onComment={onComment}
        onCommentLike={onCommentLike}
        onCommentReply={onCommentReply}
        onRate={onRate}
      />
    </Box>
  )
}
