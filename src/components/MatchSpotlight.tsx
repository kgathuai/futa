import { useEffect, useState } from 'react'
import { Avatar, Box, Button, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import { Link } from 'react-router-dom'
import type { MatchAnnouncement } from '../types'
import { getMatchRuntimeStatus } from '../lib/matchStatus'
import { formatMatchLength } from '../lib/matchFormat'

const MAX_SLIDES = 5
const SLIDE_INTERVAL_MS = 6000

const formatKickoff = (value: string) =>
  new Date(value).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

export interface MatchSpotlightProps {
  /** All visible matches — the banner picks the next five itself. */
  matches: MatchAnnouncement[]
  /** Team name → crest URL, used for the logo next to each side. */
  teamLogos: Record<string, string | undefined>
  isGuest: boolean
  canCreateMatch: boolean
  onCreateMatch: () => void
  onRegister: () => void
}

/**
 * Home-page banner. Slides through up to five matches — live games first, then
 * the soonest kickoffs — and falls back to the welcome pitch when there is
 * nothing to show (guests only). Auto-advances, pauses on hover, and offers
 * explicit slide dots + a pause control.
 */
export function MatchSpotlight({
  matches,
  teamLogos,
  isGuest,
  canCreateMatch,
  onCreateMatch,
  onRegister,
}: MatchSpotlightProps) {
  // Recomputed every render (the page re-renders every 30s), so a match flips
  // from scheduled to live without a reload.
  const live: MatchAnnouncement[] = []
  const upcoming: MatchAnnouncement[] = []
  for (const match of matches) {
    const status = getMatchRuntimeStatus(
      match.kickoff,
      match.durationMinutes,
      match.homeScore,
      match.awayScore,
    )
    if (status === 'playing') {
      live.push(match)
    } else if (status === 'scheduled') {
      upcoming.push(match)
    }
  }
  const byKickoff = (a: MatchAnnouncement, b: MatchAnnouncement) =>
    new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
  live.sort(byKickoff)
  upcoming.sort(byKickoff)
  const slides = [...live, ...upcoming].slice(0, MAX_SLIDES)

  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  const slideKey = slides.map((match) => match.id).join('|')
  useEffect(() => {
    setActive(0)
  }, [slideKey])

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, slides.length - 1)))
  }, [slides.length])

  const autoplayPaused = paused || hovered || reduceMotion
  useEffect(() => {
    if (autoplayPaused || slides.length < 2) {
      return
    }
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [autoplayPaused, slides.length])

  if (slides.length === 0 && !isGuest) {
    return null
  }

  const activeIndex = slides.length > 0 ? active % slides.length : 0

  const teamLogo = (team: string) => (
    <Avatar
      src={teamLogos[team]}
      alt={`${team} logo`}
      sx={{
        width: { xs: 34, md: 48 },
        height: { xs: 34, md: 48 },
        bgcolor: 'rgba(76,227,163,0.14)',
        color: '#4ce3a3',
        fontWeight: 800,
        fontSize: { xs: '0.85rem', md: '1.1rem' },
        border: '1px solid rgba(76,227,163,0.3)',
        flexShrink: 0,
      }}
    >
      {team.charAt(0).toUpperCase()}
    </Avatar>
  )

  const actions = (
    <Box
      sx={{
        // Pin the call-to-action row to the bottom edge of the banner.
        mt: 'auto',
        pt: { xs: 2.2, md: 3 },
        // Neat 2×2 grid on phones/tablets, one row on desktop.
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, auto)' },
        gap: { xs: 1, md: 1.4 },
        justifyContent: 'start',
        alignItems: 'center',
      }}
    >
      <Button component={Link} to="/team" variant="contained" size="large" sx={{ fontWeight: 800 }}>
        Find a team
      </Button>
      <Button component={Link} to="/friendlies?request=1" variant="outlined" size="large" sx={{ fontWeight: 800 }}>
        Request a friendly
      </Button>
      <Button component={Link} to="/tournaments" variant="outlined" size="large" sx={{ fontWeight: 800 }}>
        Explore tournaments
      </Button>
      {isGuest ? (
        <Button onClick={onRegister} variant="outlined" size="large" sx={{ fontWeight: 800 }}>
          Register your team
        </Button>
      ) : canCreateMatch ? (
        <Button onClick={onCreateMatch} variant="outlined" size="large" sx={{ fontWeight: 800 }}>
          Create a match
        </Button>
      ) : null}
    </Box>
  )

  return (
    <Box sx={{ minWidth: 0 }}>
      <Card
        variant="outlined"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: 'flex',
        // On phones the banner runs edge to edge: cancel the page container's
        // 16px side padding (Layout uses px: { xs: 2, md: 3 }).
        ml: { md: 0, xs: '-16px', sm: '-16px' },
        mr: { md: 0, xs: '-16px', sm: '-16px' },
        width: { md: '100%', xs: 'calc(100% + 32px)', sm: 'calc(100% + 32px)' },
        // Match slides use the tall hero; the no-match welcome fallback sizes to
        // its content so it doesn't leave a dead band above the CTAs.
        // Phone height is ~5 cm taller than the previous 400px (1 cm ≈ 38px).
        minHeight: slides.length > 0 ? { xs: 590, sm: 400, md: 440 } : 'auto',
        // Square-edged banner.
        borderRadius: 0,
        borderColor: 'rgba(76,227,163,0.32)',
        background:
          'linear-gradient(135deg, rgba(76,227,163,0.16) 0%, rgba(20,32,52,0.66) 45%, rgba(13,21,36,0.6) 100%)',
        overflow: 'hidden',
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          width: '100%',
          p: { xs: 3, sm: 4, md: 5.5 },
          '&:last-child': { pb: { xs: 3, sm: 4, md: 5.5 } },
        }}
      >
        {slides.length > 0 ? (
          <>
            <Box
              role="group"
              aria-roledescription="carousel"
              aria-label="Featured matches"
              sx={{ overflow: 'hidden' }}
            >
              <Box
                sx={{
                  display: 'flex',
                  transform: `translateX(-${activeIndex * 100}%)`,
                  transition: reduceMotion ? 'none' : 'transform 550ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {slides.map((match, index) => {
                  const status = getMatchRuntimeStatus(
                    match.kickoff,
                    match.durationMinutes,
                    match.homeScore,
                    match.awayScore,
                  )
                  const isLive = status === 'playing'
                  const length = formatMatchLength(match)
                  return (
                    <Box
                      key={match.id}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`Slide ${index + 1} of ${slides.length}`}
                      aria-hidden={index !== activeIndex}
                      // 2px inset stops the next slide's first pixels bleeding at the clip edge.
                      sx={{ minWidth: '100%', pl: '2px' }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.8, mb: { xs: 0.9, md: 1.2 } }}
                      >
                        <Chip
                          size="small"
                          label={isLive ? 'LIVE' : 'UPCOMING'}
                          sx={{
                            height: 20,
                            fontWeight: 800,
                            fontSize: '0.58rem',
                            letterSpacing: '0.08em',
                            bgcolor: isLive ? 'primary.main' : 'rgba(159,176,201,0.12)',
                            color: isLive ? 'primary.contrastText' : 'text.secondary',
                            border: isLive ? 'none' : '1px solid rgba(159,176,201,0.3)',
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: { xs: '0.58rem', md: '0.66rem' },
                            letterSpacing: '0.14em',
                            fontWeight: 800,
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                          }}
                        >
                          {match.sport} · {match.category}
                          {length ? ` · ${length}` : ''}
                        </Typography>
                      </Stack>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 0.6, sm: 1.4 }}
                        sx={{
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          flexWrap: 'wrap',
                          rowGap: 0.6,
                          maxWidth: 920,
                        }}
                      >
                        <Stack direction="row" spacing={{ xs: 0.8, md: 1.2 }} sx={{ alignItems: 'center', minWidth: 0 }}>
                          {teamLogo(match.homeTeam)}
                          <Typography
                            sx={{
                              fontSize: { xs: '1.35rem', sm: '1.8rem', md: '2.15rem' },
                              fontWeight: 800,
                              lineHeight: 1.12,
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {match.homeTeam}
                          </Typography>
                        </Stack>
                        <Box
                          component="span"
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 700,
                            fontSize: { xs: '0.72rem', md: '0.85rem' },
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            alignSelf: { xs: 'flex-start', sm: 'center' },
                          }}
                        >
                          vs
                        </Box>
                        <Stack direction="row" spacing={{ xs: 0.8, md: 1.2 }} sx={{ alignItems: 'center', minWidth: 0 }}>
                          {teamLogo(match.awayTeam)}
                          <Typography
                            sx={{
                              fontSize: { xs: '1.35rem', sm: '1.8rem', md: '2.15rem' },
                              fontWeight: 800,
                              lineHeight: 1.12,
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {match.awayTeam}
                          </Typography>
                        </Stack>
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={{ xs: 1, md: 1.4 }}
                        sx={{
                          mt: { xs: 1, md: 1.3 },
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          rowGap: 0.6,
                          color: 'text.secondary',
                        }}
                      >
                        <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
                          <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />
                          <Typography sx={{ fontSize: { xs: '0.74rem', md: '0.84rem' } }}>
                            {formatKickoff(match.kickoff)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
                          <FmdGoodOutlinedIcon sx={{ fontSize: 14 }} />
                          <Typography sx={{ fontSize: { xs: '0.74rem', md: '0.84rem' } }}>{match.venue}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
                          <PersonOutlineRoundedIcon sx={{ fontSize: 14 }} />
                          <Typography sx={{ fontSize: { xs: '0.74rem', md: '0.84rem' } }}>
                            {match.referee?.trim() ? `Referee: ${match.referee.trim()}` : 'Referee to be confirmed'}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  )
                })}
              </Box>
            </Box>

            {slides.length > 1 && (
              <Stack direction="row" spacing={0.6} sx={{ mt: 1.4, alignItems: 'center' }}>
                {slides.map((match, index) => (
                  <Box
                    key={`spotlight-dot-${match.id}`}
                    component="button"
                    type="button"
                    aria-label={`Show ${match.homeTeam} vs ${match.awayTeam}`}
                    aria-current={index === activeIndex}
                    onClick={() => setActive(index)}
                    sx={{
                      width: index === activeIndex ? 18 : 6,
                      height: 6,
                      p: 0,
                      border: 0,
                      borderRadius: 999,
                      cursor: 'pointer',
                      bgcolor: index === activeIndex ? 'primary.main' : 'rgba(159,176,201,0.35)',
                      transition: reduceMotion ? 'none' : 'width 220ms ease, background-color 220ms ease',
                    }}
                  />
                ))}
                {!reduceMotion && (
                  <IconButton
                    size="small"
                    onClick={() => setPaused((value) => !value)}
                    aria-label={paused ? 'Play banner slides' : 'Pause banner slides'}
                    sx={{ p: 0.3, ml: 0.4, color: 'text.secondary' }}
                  >
                    {paused ? (
                      <PlayArrowRoundedIcon sx={{ fontSize: '1rem' }} />
                    ) : (
                      <PauseRoundedIcon sx={{ fontSize: '1rem' }} />
                    )}
                  </IconButton>
                )}
              </Stack>
            )}
          </>
        ) : (
          <>
            <Typography
              sx={{
                fontSize: { xs: '0.6rem', md: '0.68rem' },
                letterSpacing: '0.16em',
                fontWeight: 800,
                color: 'primary.main',
                mb: { xs: 1, md: 1.3 },
              }}
            >
              WELCOME TO KAMBUMBU
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1.6rem', sm: '2.1rem', md: '3rem' },
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                maxWidth: 780,
              }}
            >
              Local sport, one home.
            </Typography>
            <Typography
              sx={{
                mt: { xs: 1.2, md: 1.6 },
                fontSize: { xs: '0.88rem', sm: '0.95rem', md: '1.08rem' },
                lineHeight: 1.6,
                color: 'text.secondary',
                maxWidth: 760,
              }}
            >
              Kambumbu connects teams, players and fans across Kenya. Find an opponent, book a friendly, run a
              tournament and keep every result in one place.
            </Typography>
          </>
        )}

        {actions}
      </CardContent>
      </Card>
    </Box>
  )
}
