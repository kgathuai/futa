import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material'
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import { useAppData } from '../context/AppContext'
import type { MatchAnnouncement } from '../types'
import { api } from '../lib/api'
import { useOutletContext } from 'react-router-dom'
import { MatchEngagementPanel } from '../components/MatchEngagementPanel'
import { useAutoHide } from '../lib/useAutoHide'
import { getMatchRuntimeStatus, getMatchStatusLabel, hasRecordedScore } from '../lib/matchStatus'
import { useMatchClock } from '../lib/useMatchClock'
import { MatchForm } from '../components/MatchForm'
import { CardSkeleton } from '../components/LoadingSkeleton'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInAccountId: string | null
  loggedInTeam: string | null
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })


const sports = ['All sports', 'Football', 'Handball', 'Volleyball', 'Basketball', 'Rugby', 'Tennis', 'Paddle Tennis', 'Table Tennis', 'Pool Table', 'Darts', 'Golf', 'Chess']
const statuses = ['Scheduled', 'Playing', 'Played']

export function HomePage() {
  useMatchClock()
  const { matches, isLoading, updateMatch, removeMatch } = useAppData()
  const { loggedInTeam, loggedInAccountId, loggedInUser, loggedInRole } = useOutletContext<AuthOutletContext>()
  const canModerateMatches = ['admin', 'superadmin'].includes((loggedInRole ?? '').trim().toLowerCase())
  const [selectedSport, setSelectedSport] = useState('All sports')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [showAnnounceForm, setShowAnnounceForm] = useState(false)
  const [teamLogos, setTeamLogos] = useState<Record<string, string | undefined>>({})
  const [teamOptions, setTeamOptions] = useState<string[]>([])
  const [refereeOptions, setRefereeOptions] = useState<Array<{ id: string; name: string }>>([])
  const [groundOptions, setGroundOptions] = useState<string[]>([])
  const [announceMessage, setAnnounceMessage] = useState('')
  const [engagementMessage, setEngagementMessage] = useState('')
  const [reportMatchId, setReportMatchId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)
  const [editingMatch, setEditingMatch] = useState<MatchAnnouncement | null>(null)
  const [editKickoff, setEditKickoff] = useState('')
  const [editVenue, setEditVenue] = useState('')
  const [editDuration, setEditDuration] = useState(90)
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  useAutoHide(announceMessage, () => setAnnounceMessage(''))
  useAutoHide(engagementMessage, () => setEngagementMessage(''))

  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canCreateHere =
    Boolean(loggedInUser) &&
    (normalizedRole === 'tm' ||
      normalizedRole === 'coach' ||
      normalizedRole === 'captain' ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin')

  useEffect(() => {
    const loadReferees = async () => {
      try {
        const response = await api.getReferees()
        setRefereeOptions(response.referees)
      } catch {
        setRefereeOptions([])
      }
    }

    void loadReferees()
  }, [])

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await api.getTeams()
        const nextLogos: Record<string, string | undefined> = {}
        for (const team of response.teams) {
          nextLogos[team.name] = team.logoUrl
        }
        setTeamLogos(nextLogos)
        setTeamOptions(response.teams.map((team) => team.name))
      } catch {
        setTeamLogos({})
        setTeamOptions([])
      }
    }

    const loadGrounds = async () => {
      try {
        const response = await api.getGrounds()
        setGroundOptions(response.grounds)
      } catch {
        setGroundOptions([])
      }
    }

    void loadTeams()
    void loadGrounds()
  }, [])

  const getTeamLogo = useMemo(() => {
    return (teamName: string) => teamLogos[teamName]
  }, [teamLogos])

  const handleLike = async (matchId: string): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to like matches.')
      return false
    }

    try {
      const updatedMatch = await api.likeMatch(matchId, token)
      updateMatch(updatedMatch)
      setEngagementMessage('Match liked!')
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to like match.')
      return false
    }
  }

  const handleComment = async (matchId: string, comment: string): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to comment.')
      return false
    }

    try {
      const updatedMatch = await api.commentOnMatch(matchId, comment, token)
      updateMatch(updatedMatch)
      setEngagementMessage('Comment added!')
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to add comment.')
      return false
    }
  }

  const handleCommentLike = async (matchId: string, commentId: string): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to like comments.')
      return false
    }

    try {
      const updatedMatch = await api.likeMatchComment(matchId, commentId, token)
      updateMatch(updatedMatch)
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to like comment.')
      return false
    }
  }

  const handleCommentReply = async (matchId: string, commentId: string, replyText: string): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to reply.')
      return false
    }

    try {
      const updatedMatch = await api.replyToMatchComment(matchId, commentId, replyText, token)
      updateMatch(updatedMatch)
      setEngagementMessage('Reply added!')
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to add reply.')
      return false
    }
  }

  const handleRate = async (matchId: string, rating: number): Promise<boolean> => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to rate matches.')
      return false
    }

    try {
      const updatedMatch = await api.rateMatch(matchId, rating, token)
      updateMatch(updatedMatch)
      setEngagementMessage('Match rated!')
      return true
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to rate match.')
      return false
    }
  }

  const canEditMatch = (match: MatchAnnouncement) => {
    if (!loggedInUser) {
      return false
    }
    const role = (loggedInRole ?? '').trim().toLowerCase()
    const isCreator = Boolean(loggedInAccountId) && match.createdByAccountId === loggedInAccountId
    const isManager = ['tm', 'coach', 'captain', 'admin', 'superadmin'].includes(role)
    const isParticipant =
      Boolean(loggedInTeam) && [match.homeTeam, match.awayTeam].includes(loggedInTeam as string)
    return isCreator || (isManager && isParticipant) || role === 'superadmin' || role === 'admin'
  }

  const openMatchEditor = (match: MatchAnnouncement) => {
    setEditingMatch(match)
    setEditKickoff(new Date(match.kickoff).toISOString().slice(0, 16))
    setEditVenue(match.venue)
    setEditDuration(match.durationMinutes ?? 90)
    setEditError('')
  }

  const handleSaveMatch = async () => {
    if (!editingMatch) {
      return
    }
    const token = api.getToken()
    if (!token) {
      setEditError('Please log in again.')
      return
    }
    if (new Date(editKickoff).getTime() <= Date.now()) {
      setEditError('Pick a kickoff time in the future.')
      return
    }

    setIsSavingEdit(true)
    setEditError('')
    try {
      const updated = await api.updateMatchDetails(
        editingMatch.id,
        { kickoff: new Date(editKickoff).toISOString(), venue: editVenue, durationMinutes: editDuration },
        token,
      )
      updateMatch(updated)
      setEngagementMessage('Match updated — the other team has been notified.')
      setEditingMatch(null)
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not update that match.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleSubmitReport = async () => {
    if (!reportMatchId) {
      return
    }

    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Log in to report content.')
      return
    }

    setIsReporting(true)
    try {
      await api.submitReport({ matchId: reportMatchId, reason: reportReason }, token)
      setEngagementMessage('Thanks — a moderator will review this.')
      setReportMatchId(null)
      setReportReason('')
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Could not send that report.')
    } finally {
      setIsReporting(false)
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    const token = api.getToken()
    if (!token) {
      setEngagementMessage('Please log in to delete matches.')
      return
    }

    if (!window.confirm('Delete this match? This cannot be undone.')) {
      return
    }

    try {
      await api.deleteMatch(matchId, token)
      removeMatch(matchId)
      setEngagementMessage('Match deleted.')
    } catch (error) {
      setEngagementMessage(error instanceof Error ? error.message : 'Failed to delete match.')
    }
  }

  const filteredMatches = matches.filter((match) => {
    const sportMatch = selectedSport === 'All sports' || match.sport === selectedSport
    const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes, match.homeScore, match.awayScore)

    if (selectedStatus === 'All') {
      return sportMatch
    }

    if (selectedStatus === 'Scheduled') {
      return sportMatch && runtimeStatus === 'scheduled'
    }

    if (selectedStatus === 'Playing') {
      return sportMatch && runtimeStatus === 'playing'
    }

    if (selectedStatus === 'Played') {
      return sportMatch && runtimeStatus === 'finished'
    }

    if (selectedStatus === 'Tournament') {
      return false
    }

    return sportMatch && match.category === selectedStatus
  })

  return (
    <Stack spacing={3.25} sx={{ width: '100%' }}>
  
      {engagementMessage && (
        <Alert severity="info" onClose={() => setEngagementMessage('')}>
          {engagementMessage}
        </Alert>
      )}

      {canCreateHere && showAnnounceForm && (
        <Card variant="outlined">
          <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Create a match
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Home team: {loggedInTeam || 'Not set'}
              </Typography>

              <MatchForm
                homeTeam={loggedInTeam}
                teamOptions={teamOptions}
                groundOptions={groundOptions}
                refereeOptions={refereeOptions}
                onCreated={(created) => updateMatch(created)}
              />
          </CardContent>
        </Card>
      )}

      {canCreateHere && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={() => setShowAnnounceForm((prev) => !prev)}
            sx={{ fontWeight: 800 }}
          >
            {showAnnounceForm ? 'Close match form' : '+ Create match'}
          </Button>
        </Stack>
      )}

      <Stack
        direction="row"
        aria-label="Sport filters"
        sx={{
          width: '100%',
          position: 'relative',
          zIndex: 1,
          display: { xs: 'grid', sm: 'flex' },
          gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))' },
          columnGap: { xs: 0.7, sm: 0.9 },
          rowGap: { xs: 1.6, sm: 0.9 },
          flexWrap: 'wrap',
        }}
      >
        {sports.map((sport) => (
          <Button
            key={sport}
            type="button"
            onClick={() => setSelectedSport(sport)}
            aria-pressed={sport === selectedSport}
            variant="contained"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minWidth: 0,
              borderRadius: 999,
              px: { xs: 0.5, sm: 1.4 },
              py: 0.55,
              fontSize: { xs: '0.62rem', sm: '0.75rem' },
              cursor: 'pointer',
              color: sport === selectedSport ? '#07111f' : '#e7ebf3',
              backgroundColor: sport === selectedSport ? '#4ce3a3' : '#2d3545',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: sport === selectedSport ? '#4ce3a3' : '#3a4558',
                boxShadow: 'none',
              },
            }}
          >
            {sport}
          </Button>
        ))}
      </Stack>

      <Stack direction="row" spacing={0.9} aria-label="Match filters" sx={{ flexWrap: 'wrap' }}>
        {statuses.map((status) => (
          <Chip
            key={status}
            label={status}
            clickable
            size="small"
            color={status === selectedStatus ? 'primary' : 'default'}
            onClick={() => setSelectedStatus(status)}
            sx={
              status === selectedStatus
                ? { color: '#07111f', fontWeight: 700, px: 0.2 }
                : { borderColor: 'rgba(159,176,201,0.2)', color: 'text.secondary', px: 0.2 }
            }
            variant={status === selectedStatus ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      <Dialog open={Boolean(editingMatch)} onClose={() => setEditingMatch(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 800 }}>
          Edit {editingMatch?.homeTeam} vs {editingMatch?.awayTeam}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.3} sx={{ mt: 0.5 }}>
            <TextField
              label="Kickoff"
              type="datetime-local"
              size="small"
              value={editKickoff}
              onChange={(event) => setEditKickoff(event.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: new Date().toISOString().slice(0, 16) },
              }}
            />
            <TextField
              label="Venue"
              size="small"
              value={editVenue}
              onChange={(event) => setEditVenue(event.target.value)}
            />
            <TextField
              label="Duration (min)"
              type="number"
              size="small"
              value={editDuration}
              onChange={(event) => setEditDuration(Number(event.target.value))}
              slotProps={{ htmlInput: { min: 20, max: 240, step: 5 } }}
            />
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
              Saving notifies the other team about the change.
            </Typography>
            {editError && (
              <Alert severity="error" sx={{ fontSize: '0.74rem', py: 0.3 }}>
                {editError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setEditingMatch(null)}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={() => void handleSaveMatch()} disabled={isSavingEdit}>
            {isSavingEdit ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(reportMatchId)} onClose={() => setReportMatchId(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: '0.92rem', fontWeight: 800 }}>Report content</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="What is wrong?"
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setReportMatchId(null)}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={isReporting || !reportReason.trim()}
            onClick={() => void handleSubmitReport()}
          >
            {isReporting ? 'Sending…' : 'Send report'}
          </Button>
        </DialogActions>
      </Dialog>

      {isLoading && <CardSkeleton count={3} />}

      <Box sx={{ display: 'grid', gap: 1.2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {!isLoading && filteredMatches.map((match) => {
          const runtimeStatus = getMatchRuntimeStatus(match.kickoff, match.durationMinutes, match.homeScore, match.awayScore)
          const firstCommentText = match.comments.find((entry) => entry.text.trim().length > 0)?.text
          return (
            <Card
              key={match.id}
              variant="outlined"
              onClick={() => {
                if (canEditMatch(match)) {
                  openMatchEditor(match)
                }
              }}
              sx={{
                borderRadius: 2.3,
                cursor: canEditMatch(match) ? 'pointer' : 'default',
                transition: 'border-color 120ms ease',
                '&:hover': canEditMatch(match) ? { borderColor: 'rgba(76,227,163,0.5)' } : undefined,
              }}
            >
              <CardContent sx={{ p: 2.3, '&:last-child': { pb: 2.3 } }}>
                <Stack direction="row" sx={{ mb: 1.5, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', letterSpacing: '0.12em', fontWeight: 800 }}
                  >
                    {match.sport} · {match.category}
                  </Typography>
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                    {loggedInUser && (
                      <IconButton
                        size="small"
                        aria-label={`Report ${match.homeTeam} vs ${match.awayTeam}`}
                        onClick={() => {
                          setReportMatchId(match.id)
                          setReportReason('')
                        }}
                      >
                        <FlagOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                      </IconButton>
                    )}
                    {canModerateMatches && (
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Delete ${match.homeTeam} vs ${match.awayTeam}`}
                        onClick={() => void handleDeleteMatch(match.id)}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
                    <Chip
                      label={getMatchStatusLabel(runtimeStatus)}
                      size="small"
                      color={runtimeStatus === 'finished' ? 'primary' : 'default'}
                      sx={
                        runtimeStatus === 'finished'
                          ? { color: '#07111f', fontWeight: 700 }
                          : { bgcolor: 'rgba(159,176,201,0.12)', color: 'text.secondary' }
                      }
                    />
                  </Stack>
                </Stack>

                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                    {getTeamLogo(match.homeTeam) ? (
                      <Box
                        component="img"
                        src={getTeamLogo(match.homeTeam)}
                        alt={`${match.homeTeam} logo`}
                        sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(159,176,201,0.28)' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(76,227,163,0.12)',
                        color: 'primary.main',
                        fontSize: 14,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {match.homeTeam.charAt(0).toUpperCase()}
                    </Box>
                  )}
                  <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                    {match.homeTeam}
                  </Typography>
                </Stack>
                <Typography sx={{ color: 'primary.main', fontWeight: 800, fontSize: '1.05rem', px: 1 }}>
                  {hasRecordedScore(match.homeScore, match.awayScore)
                    ? `${match.homeScore} - ${match.awayScore}`
                    : runtimeStatus === 'playing'
                      ? 'live'
                      : 'vs'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', textAlign: 'right' }}>
                    {match.awayTeam}
                  </Typography>
                  {getTeamLogo(match.awayTeam) ? (
                    <Box
                      component="img"
                      src={getTeamLogo(match.awayTeam)}
                      alt={`${match.awayTeam} logo`}
                      sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(159,176,201,0.28)' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(76,227,163,0.12)',
                        color: 'primary.main',
                        fontSize: 14,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {match.awayTeam.charAt(0).toUpperCase()}
                    </Box>
                  )}
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1.2} sx={{ mt: 1.2, color: '#7f8da4', alignItems: 'center' }}>
                <Typography variant="body2">{formatDateTime(match.kickoff)}</Typography>
                <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }}>
                  <FmdGoodOutlinedIcon sx={{ fontSize: 14 }} />
                  <Typography variant="body2">{match.venue}</Typography>
                </Stack>
                {match.durationMinutes ? (
                  <Typography variant="body2">• {match.durationMinutes} min</Typography>
                ) : null}
              </Stack>

              {firstCommentText ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.9 }}>
                  {firstCommentText}
                </Typography>
              ) : null}

              <MatchEngagementPanel
                match={match}
                canInteract={Boolean(loggedInUser && loggedInAccountId)}
                onLike={handleLike}
                onComment={handleComment}
                onCommentLike={handleCommentLike}
                onCommentReply={handleCommentReply}
                onRate={handleRate}
              />
            </CardContent>
          </Card>
          )
        })}
      </Box>
    </Stack>
  )
}
