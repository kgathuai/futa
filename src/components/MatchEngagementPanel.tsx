import { useMemo, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material'
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded'
import type { MatchAnnouncement, MatchComment } from '../types'

interface MatchEngagementPanelProps {
  match: MatchAnnouncement
  canInteract: boolean
  onLike: (matchId: string) => Promise<boolean>
  onComment: (matchId: string, comment: string) => Promise<boolean>
  onCommentLike: (matchId: string, commentId: string) => Promise<boolean>
  onCommentReply: (matchId: string, commentId: string, comment: string) => Promise<boolean>
  onRate: (matchId: string, rating: number) => Promise<boolean>
}

export function MatchEngagementPanel({
  match,
  canInteract,
  onLike,
  onComment,
  onCommentLike,
  onCommentReply,
  onRate,
}: MatchEngagementPanelProps) {
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false)
  const [expandedRating, setExpandedRating] = useState(false)
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<Record<string, boolean>>({})

  const visibleComments = useMemo(() => {
    return match.comments.filter((entry) => entry.text.trim().length > 0)
  }, [match.comments])

  const handleCommentSubmit = async () => {
    const safeComment = comment.trim()
    if (!safeComment) {
      return
    }

    const submitted = await onComment(match.id, safeComment)
    if (submitted) {
      setComment('')
      setCommentsDialogOpen(true)
    }
  }

  const handleRateSubmit = async () => {
    if (rating === null || rating < 1 || rating > 5) {
      return
    }

    await onRate(match.id, rating)
  }

  const handleReplySubmit = async (commentId: string) => {
    const safeReply = replyText.trim()
    if (!safeReply) {
      return
    }

    const submitted = await onCommentReply(match.id, commentId, safeReply)
    if (submitted) {
      setReplyText('')
      setReplyingToCommentId(null)
    }
  }

  const toggleReplyThread = (commentId: string) => {
    setExpandedReplyThreads((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }))
  }

  const renderComment = (entry: MatchComment) => (
    <Box
      key={entry.id}
      sx={{
        border: '1px solid rgba(137,151,178,0.22)',
        borderRadius: 1.2,
        p: 1,
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#4ce3a3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {entry.authorName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(entry.createdAt).toLocaleString()}
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
        {entry.text}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 0.8, alignItems: 'center' }}>
        <Button
          size="small"
          variant="text"
          onClick={() => void onCommentLike(match.id, entry.id)}
          disabled={!canInteract || entry.likedByMe}
          sx={{ minWidth: 0, p: 0, textTransform: 'none' }}
        >
          Like ({entry.likes}){entry.likedByMe ? ' *' : ''}
        </Button>
        <Button
          size="small"
          variant="text"
          onClick={() => {
            setReplyingToCommentId((prev) => (prev === entry.id ? null : entry.id))
            setReplyText('')
          }}
          disabled={!canInteract}
          sx={{ minWidth: 0, p: 0, textTransform: 'none' }}
        >
          Reply
        </Button>
      </Stack>

      {replyingToCommentId === entry.id && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
          <TextField
            size="small"
            placeholder="Write a reply"
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            disabled={!canInteract}
            fullWidth
          />
          <Button variant="outlined" size="small" onClick={() => void handleReplySubmit(entry.id)} disabled={!canInteract}>
            Reply
          </Button>
        </Stack>
      )}

      {entry.replies.length > 0 && (
        <Box sx={{ mt: 0.75 }}>
          <Button
            size="small"
            variant="text"
            onClick={() => toggleReplyThread(entry.id)}
            sx={{ minWidth: 0, p: 0, textTransform: 'none' }}
          >
            {expandedReplyThreads[entry.id] ? 'Hide replies' : `Show replies (${entry.replies.length})`}
          </Button>

          {expandedReplyThreads[entry.id] && (
            <Stack
              spacing={0.7}
              sx={{
                mt: 0.8,
                pl: 1.2,
                borderLeft: '2px solid rgba(137,151,178,0.18)',
                maxHeight: entry.replies.length > 3 ? 210 : 'none',
                overflowY: entry.replies.length > 3 ? 'auto' : 'visible',
                pr: entry.replies.length > 3 ? 0.4 : 0,
              }}
            >
              {entry.replies.map((reply) => (
                <Box key={reply.id}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#adff0f' }}>
                      {reply.authorName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(reply.createdAt).toLocaleString()}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {reply.text}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => void onCommentLike(match.id, reply.id)}
                    disabled={!canInteract || reply.likedByMe}
                    sx={{ mt: 0.25, minWidth: 0, p: 0, textTransform: 'none' }}
                  >
                    Like ({reply.likes}){reply.likedByMe ? ' *' : ''}
                  </Button>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  )

  return (
    <>
      <Stack
        direction="row"
        spacing={{ xs: 0.36, sm: 0.72, md: 1.32 }}
        sx={{
          mt: 1.3,
          pt: 1.2,
          borderTop: '1px solid rgba(91,107,146,0.22)',
          color: 'text.secondary',
          flexWrap: 'nowrap',
        }}
      >
        <Button
          size="small"
          variant="text"
          onClick={() => void onLike(match.id)}
          disabled={!canInteract || match.likedByMe}
          sx={{ minWidth: 0, p: 0, color: 'text.secondary', textTransform: 'none', justifyContent: 'flex-start' }}
        >
          <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 24, sm: 26, md: 30 },
                height: { xs: 24, sm: 26, md: 30 },
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: '#aab1c4',
              }}
            >
              <FavoriteBorderOutlinedIcon sx={{ fontSize: { xs: '0.95rem', sm: '1rem', md: '1.14rem' } }} />
            </Box>
            <Typography sx={{ lineHeight: 1.1, fontWeight: 700, color: '#b7bfd3', fontSize: { xs: '1rem', sm: '1.05rem', md: '1.1rem' } }}>
              {match.engagement.likes}
            </Typography>
          </Stack>
        </Button>

        <Button
          size="small"
          variant="text"
          onClick={() => setCommentsDialogOpen(true)}
          sx={{ minWidth: 0, p: 0, color: 'text.secondary', textTransform: 'none', justifyContent: 'flex-start' }}
        >
          <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 24, sm: 26, md: 30 },
                height: { xs: 24, sm: 26, md: 30 },
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: '#aab1c4',
              }}
            >
              <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: { xs: '0.95rem', sm: '1rem', md: '1.14rem' } }} />
            </Box>
            <Typography sx={{ lineHeight: 1.1, fontWeight: 700, color: '#b7bfd3', fontSize: { xs: '1rem', sm: '1.05rem', md: '1.1rem' } }}>
              {match.engagement.comments}
            </Typography>
          </Stack>
        </Button>

        <Button
          size="small"
          variant="text"
          onClick={() => setExpandedRating((prev) => !prev)}
          disabled={!canInteract}
          sx={{ minWidth: 0, p: 0, color: 'text.secondary', textTransform: 'none', ml: 'auto', justifyContent: 'flex-start' }}
        >
          <Stack direction="row" spacing={0.55} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 24, sm: 26, md: 30 },
                height: { xs: 24, sm: 26, md: 30 },
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: '#aab1c4',
              }}
            >
              <StarOutlineRoundedIcon sx={{ fontSize: { xs: '0.95rem', sm: '1rem', md: '1.14rem' } }} />
            </Box>
            <Box sx={{ textAlign: 'left', minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography sx={{ lineHeight: 1.1, fontWeight: 700, color: match.engagement.rating > 0 ? '#9dff20' : '#a7afc3', fontSize: { xs: '1rem', sm: '1.05rem', md: '1.1rem' } }}>
                {match.engagement.rating.toFixed(1)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8c94aa', letterSpacing: { xs: '0.01em', sm: '0.03em' }, fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.82rem' } }}>
                RATING ({match.engagement.ratingCount}){match.ratedByMe ? ' *' : ''}
              </Typography>
            </Box>
          </Stack>
        </Button>
      </Stack>

      <Dialog
        open={commentsDialogOpen}
        onClose={() => setCommentsDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Match comments</DialogTitle>
        <DialogContent>
          {!canInteract && (
            <Alert severity="info" sx={{ mb: 1.2 }}>
              Please log in to comment, like comments, and reply.
            </Alert>
          )}

          {visibleComments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No comments yet.
            </Typography>
          ) : (
            <Stack spacing={0.8} sx={{ maxHeight: 280, overflowY: 'auto', pr: 0.4 }}>
              {visibleComments.map((entry) => renderComment(entry))}
            </Stack>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <TextField
              size="small"
              placeholder="Write a comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={!canInteract}
              fullWidth
            />
            <Button variant="outlined" size="small" onClick={() => void handleCommentSubmit()} disabled={!canInteract}>
              Comment
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {expandedRating && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
          <TextField
            select
            size="small"
            label="Rate"
            value={rating === null ? '' : String(rating)}
            onChange={(event) => {
              const value = event.target.value
              setRating(value ? Number(value) : null)
            }}
            disabled={!canInteract}
            sx={{ minWidth: { xs: '100%', md: 140 } }}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="1">1</MenuItem>
            <MenuItem value="2">2</MenuItem>
            <MenuItem value="3">3</MenuItem>
            <MenuItem value="4">4</MenuItem>
            <MenuItem value="5">5</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            size="small"
            onClick={() => void handleRateSubmit()}
            disabled={!canInteract || match.ratedByMe}
          >
            Submit rating
          </Button>
        </Stack>
      )}
    </>
  )
}
