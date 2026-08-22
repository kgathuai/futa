import fs from 'node:fs'
import path from 'node:path'
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDatabase, store, type AccountRecord, type TeamPayload } from './store.ts'

const app = express()
const port = Number(process.env.PORT ?? 4000)
const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/futa_monolith'
const allowedRoles = new Set(['tm', 'coach', 'captain'])

app.use(cors())
app.use(express.json({ limit: '10mb' }))

interface RequestUser {
  id: string
  name: string
  role: string
  team: string
  email: string
}

interface MatchWithInteractions {
  likedByAccountIds?: string[]
  ratedByAccountIds?: string[]
  comments?: unknown
  [key: string]: unknown
}

interface PublicCommentReply {
  id: string
  text: string
  authorName: string
  likes: number
  likedByMe: boolean
  createdAt: string
}

interface PublicComment {
  id: string
  text: string
  authorName: string
  likes: number
  likedByMe: boolean
  createdAt: string
  replies: PublicCommentReply[]
}

const normalizePublicComments = (comments: unknown, viewerAccountId?: string): PublicComment[] => {
  if (!Array.isArray(comments)) {
    return []
  }

  return comments
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const text = entry.trim()
        if (!text || text === 'Match announced.') {
          return null
        }

        const splitIndex = text.indexOf(':')
        const authorName = splitIndex > 0 ? text.slice(0, splitIndex).trim() : 'Unknown'
        const body = splitIndex > 0 ? text.slice(splitIndex + 1).trim() : text

        return {
          id: `legacy-${index + 1}`,
          text: body,
          authorName: authorName || 'Unknown',
          likes: 0,
          likedByMe: false,
          createdAt: new Date(0).toISOString(),
          replies: [],
        } satisfies PublicComment
      }

      if (!entry || typeof entry !== 'object') {
        return null
      }

      const raw = entry as {
        id?: unknown
        text?: unknown
        authorName?: unknown
        likes?: unknown
        likedByAccountIds?: unknown
        createdAt?: unknown
        replies?: unknown
      }

      const text = typeof raw.text === 'string' ? raw.text.trim() : ''
      if (!text) {
        return null
      }

      const likedByAccountIds = Array.isArray(raw.likedByAccountIds)
        ? raw.likedByAccountIds.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        : []

      const replies = Array.isArray(raw.replies)
        ? raw.replies
            .map((reply, replyIndex) => {
              if (!reply || typeof reply !== 'object') {
                return null
              }

              const rawReply = reply as {
                id?: unknown
                text?: unknown
                authorName?: unknown
                likes?: unknown
                likedByAccountIds?: unknown
                createdAt?: unknown
              }

              const replyText = typeof rawReply.text === 'string' ? rawReply.text.trim() : ''
              if (!replyText) {
                return null
              }

              const replyLikedBy = Array.isArray(rawReply.likedByAccountIds)
                ? rawReply.likedByAccountIds.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                : []

              return {
                id: typeof rawReply.id === 'string' && rawReply.id.trim() ? rawReply.id : `reply-${index + 1}-${replyIndex + 1}`,
                text: replyText,
                authorName:
                  typeof rawReply.authorName === 'string' && rawReply.authorName.trim()
                    ? rawReply.authorName.trim()
                    : 'Unknown',
                likes: Number.isFinite(rawReply.likes as number) ? Math.max(0, Number(rawReply.likes)) : 0,
                likedByMe: Boolean(viewerAccountId && replyLikedBy.includes(viewerAccountId)),
                createdAt:
                  typeof rawReply.createdAt === 'string' && rawReply.createdAt.trim()
                    ? rawReply.createdAt
                    : new Date(0).toISOString(),
              } satisfies PublicCommentReply
            })
            .filter((reply): reply is PublicCommentReply => reply !== null)
        : []

      return {
        id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `comment-${index + 1}`,
        text,
        authorName: typeof raw.authorName === 'string' && raw.authorName.trim() ? raw.authorName.trim() : 'Unknown',
        likes: Number.isFinite(raw.likes as number) ? Math.max(0, Number(raw.likes)) : 0,
        likedByMe: Boolean(viewerAccountId && likedByAccountIds.includes(viewerAccountId)),
        createdAt: typeof raw.createdAt === 'string' && raw.createdAt.trim() ? raw.createdAt : new Date(0).toISOString(),
        replies,
      } satisfies PublicComment
    })
    .filter((comment): comment is PublicComment => comment !== null)
}

const sanitizeAccount = (account: AccountRecord) => ({
  id: account.id,
  name: account.name,
  team: account.team,
  role: account.role,
  sport: account.sport,
  email: account.email,
})

const sanitizeMatchForViewer = (match: MatchWithInteractions, viewerAccountId?: string) => {
  const likedBy = Array.isArray(match.likedByAccountIds) ? match.likedByAccountIds : []
  const ratedBy = Array.isArray(match.ratedByAccountIds) ? match.ratedByAccountIds : []
  const comments = normalizePublicComments(match.comments, viewerAccountId)
  const { likedByAccountIds, ratedByAccountIds, ...rest } = match

  return {
    ...rest,
    comments,
    likedByMe: viewerAccountId ? likedBy.includes(viewerAccountId) : false,
    ratedByMe: viewerAccountId ? ratedBy.includes(viewerAccountId) : false,
  }
}

const getBearerToken = (value: string | undefined) => {
  if (!value) {
    return null
  }
  if (!value.startsWith('Bearer ')) {
    return null
  }
  return value.slice(7).trim()
}

const getRequestUser = async (authorizationHeader: string | undefined): Promise<RequestUser | null> => {
  const token = getBearerToken(authorizationHeader)
  if (!token) {
    return null
  }

  const session = await store.getSession(token)
  if (!session) {
    return null
  }

  const account = await store.findAccountById(session.accountId)
  if (!account) {
    return null
  }

  return {
    id: account.id,
    name: account.name,
    role: account.role,
    team: account.team,
    email: account.email,
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'monolith', db: 'mongodb' })
})

app.get('/api/matches', async (req, res) => {
  const viewer = await getRequestUser(req.header('authorization'))
  const matches = await store.getMatches()
  res.json(matches.map((match) => sanitizeMatchForViewer(match as MatchWithInteractions, viewer?.id)))
})

app.get('/api/matches/my', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const teamName = user.team?.trim()
  if (!teamName) {
    res.status(400).json({ error: 'Your account has no team set.' })
    return
  }

  const matches = await store.getMatchesForTeam(teamName)
  res.json(matches.map((match) => sanitizeMatchForViewer(match as MatchWithInteractions, user.id)))
})

app.post('/api/matches', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const teamName = user.team?.trim()
  if (!teamName) {
    res.status(400).json({ error: 'Your account has no team set.' })
    return
  }

  const body = req.body as {
    awayTeam?: string
    venue?: string
    kickoff?: string
    durationMinutes?: number
    category?: 'League' | 'Friendly' | 'Cup'
    sport?: 'Football' | 'Handball' | 'Volleyball' | 'Basketball' | 'Rugby' | 'Tennis' | 'Pool Table'
    comment?: string
  }

  if (!body.awayTeam || !body.venue || !body.kickoff || !body.durationMinutes || !body.category || !body.sport) {
    res.status(400).json({ error: 'Missing match fields.' })
    return
  }

  const created = await store.addMatch({
    homeTeam: teamName,
    awayTeam: body.awayTeam,
    venue: body.venue,
    kickoff: body.kickoff,
    durationMinutes: body.durationMinutes,
    category: body.category,
    sport: body.sport,
    comment: body.comment,
    createdByTeam: teamName,
    createdByAccountId: user.id,
  })

  res.status(201).json(sanitizeMatchForViewer(created as MatchWithInteractions, user.id))
})

app.patch('/api/matches/:matchId/kickoff', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const teamName = user.team?.trim()
  if (!teamName) {
    res.status(400).json({ error: 'Your account has no team set.' })
    return
  }

  const matchId = req.params.matchId?.trim()
  const kickoff = (req.body as { kickoff?: string }).kickoff?.trim()
  if (!matchId || !kickoff) {
    res.status(400).json({ error: 'Match id and kickoff are required.' })
    return
  }

  const updated = await store.updateMatchKickoff(matchId, teamName, kickoff)
  if (!updated) {
    res.status(404).json({ error: 'Match not found.' })
    return
  }

  res.json(sanitizeMatchForViewer(updated as MatchWithInteractions, user.id))
})

app.patch('/api/matches/:matchId/score', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const teamName = user.team?.trim()
  if (!teamName) {
    res.status(400).json({ error: 'Your account has no team set.' })
    return
  }

  const matchId = req.params.matchId?.trim()
  const body = req.body as { homeScore?: number; awayScore?: number }
  if (!matchId || body.homeScore === undefined || body.awayScore === undefined) {
    res.status(400).json({ error: 'Match id, homeScore and awayScore are required.' })
    return
  }

  const existingMatch = await store.getMatchForCreatorTeam(matchId, teamName)
  if (!existingMatch) {
    res.status(404).json({ error: 'Match not found.' })
    return
  }

  const kickoffTime = new Date(existingMatch.kickoff)
  if (Number.isFinite(kickoffTime.getTime()) && kickoffTime.getTime() > Date.now()) {
    res.status(409).json({ error: 'Scores can only be updated when the match has started or after it has ended.' })
    return
  }

  const updated = await store.updateMatchScore(matchId, teamName, body.homeScore, body.awayScore)
  if (!updated) {
    res.status(404).json({ error: 'Match not found.' })
    return
  }

  res.json(sanitizeMatchForViewer(updated as MatchWithInteractions, user.id))
})

app.post('/api/matches/:matchId/like', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const matchId = req.params.matchId?.trim()
  if (!matchId) {
    res.status(400).json({ error: 'Match id is required.' })
    return
  }

  const result = await store.likeMatch(matchId, user.id)
  if (result.status === 'not-found') {
    res.status(404).json({ error: 'Match not found.' })
    return
  }

  if (result.status === 'already-liked') {
    res.status(409).json({ error: 'You can only like a match once.' })
    return
  }

  res.json(sanitizeMatchForViewer(result.match as MatchWithInteractions, user.id))
})

app.post('/api/matches/:matchId/comment', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const matchId = req.params.matchId?.trim()
  const comment = (req.body as { comment?: string }).comment?.trim()

  if (!matchId || !comment) {
    res.status(400).json({ error: 'Match id and comment are required.' })
    return
  }

  const updated = await store.commentOnMatch(matchId, comment, user.name, user.id)
  if (!updated) {
    res.status(404).json({ error: 'Match not found.' })
    return
  }

  res.json(sanitizeMatchForViewer(updated as MatchWithInteractions, user.id))
})

app.post('/api/matches/:matchId/comments/:commentId/like', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const matchId = req.params.matchId?.trim()
  const commentId = req.params.commentId?.trim()
  if (!matchId || !commentId) {
    res.status(400).json({ error: 'Match id and comment id are required.' })
    return
  }

  const result = await store.likeCommentOnMatch(matchId, commentId, user.id)
  if (result.status === 'not-found') {
    res.status(404).json({ error: 'Match not found.' })
    return
  }

  if (result.status === 'comment-not-found') {
    res.status(404).json({ error: 'Comment not found.' })
    return
  }

  if (result.status === 'already-liked') {
    res.status(409).json({ error: 'You can only like a comment once.' })
    return
  }

  res.json(sanitizeMatchForViewer(result.match as MatchWithInteractions, user.id))
})

app.post('/api/matches/:matchId/comments/:commentId/reply', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const matchId = req.params.matchId?.trim()
  const commentId = req.params.commentId?.trim()
  const comment = (req.body as { comment?: string }).comment?.trim()

  if (!matchId || !commentId || !comment) {
    res.status(400).json({ error: 'Match id, comment id and reply text are required.' })
    return
  }

  const result = await store.replyToMatchComment(matchId, commentId, comment, user.name, user.id)
  if (result.status === 'not-found') {
    res.status(404).json({ error: 'Match not found.' })
    return
  }

  if (result.status === 'comment-not-found') {
    res.status(404).json({ error: 'Comment not found.' })
    return
  }

  res.json(sanitizeMatchForViewer(result.match as MatchWithInteractions, user.id))
})

app.post('/api/matches/:matchId/rate', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const matchId = req.params.matchId?.trim()
  const rating = Number((req.body as { rating?: number }).rating)

  if (!matchId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Match id and rating between 1 and 5 are required.' })
    return
  }

  const result = await store.rateMatch(matchId, rating, user.id)
  if (result.status === 'not-found') {
    res.status(404).json({ error: 'Match not found.' })
    return
  }

  if (result.status === 'already-rated') {
    res.status(409).json({ error: 'You can only rate a match once.' })
    return
  }

  res.json(sanitizeMatchForViewer(result.match as MatchWithInteractions, user.id))
})

app.delete('/api/matches/:matchId', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const teamName = user.team?.trim()
  if (!teamName) {
    res.status(400).json({ error: 'Your account has no team set.' })
    return
  }

  const matchId = req.params.matchId?.trim()
  if (!matchId) {
    res.status(400).json({ error: 'Match id is required.' })
    return
  }

  const deleted = await store.deleteMatchForTeam(matchId, teamName)
  if (!deleted) {
    res.status(404).json({ error: 'Match not found.' })
    return
  }

  res.status(204).send()
})

app.get('/api/results', async (_req, res) => {
  const results = await store.getResults()
  res.json(results)
})

app.get('/api/tournaments', async (_req, res) => {
  const tournaments = await store.getTournaments()
  res.json(tournaments)
})

app.get('/api/team', async (_req, res) => {
  const team = await store.getTeam()
  res.json(team)
})

app.get('/api/friendlies', async (_req, res) => {
  const friendlies = await store.getFriendlyRequests()
  res.json(friendlies)
})

app.get('/api/notifications', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const notifications = await store.getNotifications(user.id)
  res.json(notifications)
})

app.post('/api/notifications/:notificationId/read', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const notificationId = req.params.notificationId?.trim()
  if (!notificationId) {
    res.status(400).json({ error: 'Missing notification id.' })
    return
  }

  const notification = await store.markNotificationRead(notificationId, user.id)
  if (!notification) {
    res.status(404).json({ error: 'Notification not found.' })
    return
  }

  res.json(notification)
})

app.post('/api/friendlies', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const body = req.body as {
    teamName?: string
    contact?: string
    preferredDate?: string
    preferredTime?: string
    location?: string
    note?: string
  }

  if (
    !body.teamName ||
    !body.contact ||
    !body.preferredDate ||
    !body.preferredTime ||
    !body.location ||
    !body.note
  ) {
    res.status(400).json({ error: 'Missing friendly request fields.' })
    return
  }

  const request = await store.addFriendlyRequest({
    teamName: body.teamName,
    contact: body.contact,
    preferredDate: body.preferredDate,
    preferredTime: body.preferredTime,
    location: body.location,
    note: body.note,
  }, user.id)

  res.status(201).json(request)
})

app.post('/api/friendlies/:requestId/accept', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const requestId = req.params.requestId?.trim()
  if (!requestId) {
    res.status(400).json({ error: 'Missing request id.' })
    return
  }

  const result = await store.acceptFriendlyRequest(requestId, user.id)
  if (!result) {
    res.status(404).json({ error: 'Friendly request not found.' })
    return
  }

  res.json(result)
})

app.post('/api/friendlies/:requestId/decline', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const requestId = req.params.requestId?.trim()
  if (!requestId) {
    res.status(400).json({ error: 'Missing request id.' })
    return
  }

  const result = await store.declineFriendlyRequest(requestId, user.id)
  if (!result) {
    res.status(404).json({ error: 'Friendly request not found.' })
    return
  }

  res.json(result)
})

app.get('/api/teams', async (_req, res) => {
  const teams = await store.getTeams()
  res.json({ teams })
})

app.get('/api/grounds', async (_req, res) => {
  const grounds = await store.getGrounds()
  res.json({ grounds })
})

app.post('/api/auth/register', async (req, res) => {
  const body = req.body as Partial<AccountRecord>
  const name = body.name?.trim() ?? ''
  const team = body.team?.trim() ?? ''
  const role = body.role?.trim() ?? ''
  const sport = body.sport?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password?.trim() ?? ''

  if (!name || !team || !role || !sport || !email || !password) {
    res.status(400).json({ error: 'Missing required registration fields.' })
    return
  }

  const existingAccount = await store.findAccountByEmail(email)
  if (existingAccount) {
    res.status(409).json({ error: 'Email already registered.' })
    return
  }

  const account = await store.createAccount({ name, team, role, sport, email, password })
  const session = await store.createSession(account.id)

  res.status(201).json({
    token: session.token,
    user: sanitizeAccount(account),
  })
})

app.post('/api/auth/login', async (req, res) => {
  const body = req.body as Partial<AccountRecord>
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password?.trim() ?? ''

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' })
    return
  }

  const account = await store.findAccountByEmail(email)
  if (!account) {
    res.status(404).json({ error: 'Account not found. Please register first.' })
    return
  }

  if (account.password !== password) {
    res.status(401).json({ error: 'Invalid credentials.' })
    return
  }

  const session = await store.createSession(account.id)

  res.json({
    token: session.token,
    user: sanitizeAccount(account),
  })
})

app.post('/api/auth/logout', async (req, res) => {
  const token = getBearerToken(req.header('authorization'))
  if (!token) {
    res.status(400).json({ error: 'Missing bearer token.' })
    return
  }

  await store.clearSession(token)
  res.status(204).send()
})

app.get('/api/auth/me', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const account = await store.findAccountById(user.id)
  if (!account) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  res.json({ user: sanitizeAccount(account) })
})

app.post('/api/team', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  if (!allowedRoles.has(user.role.trim().toLowerCase())) {
    res.status(403).json({ error: 'Only TM, Coach, or captain can create a team.' })
    return
  }

  const body = req.body as Partial<TeamPayload>
  const payload: TeamPayload = {
    name: body.name?.trim() ?? '',
    manager: body.manager?.trim() ?? '',
    county: body.county?.trim() ?? '',
    homeGround: body.homeGround?.trim() ?? '',
    level: (body.level as TeamPayload['level']) ?? 'Amateur',
    bio: body.bio?.trim() ?? '',
    logoUrl: body.logoUrl?.trim() || undefined,
  }

  if (!payload.name || !payload.manager || !payload.county || !payload.homeGround || !payload.level || !payload.bio) {
    res.status(400).json({ error: 'Missing team fields.' })
    return
  }

  const updatedTeam = await store.setTeam(payload, user.id)
  res.status(201).json({ team: updatedTeam })
})

app.post('/api/results', async (req, res) => {
  const body = req.body as {
    homeTeam?: string
    awayTeam?: string
    homeScore?: number
    awayScore?: number
    venue?: string
    playedOn?: string
    reportedBy?: string
    engagement?: {
      likes: number
      comments: number
      rating: number
      ratingCount: number
    }
  }

  if (
    !body.homeTeam ||
    !body.awayTeam ||
    body.homeScore === undefined ||
    body.awayScore === undefined ||
    !body.venue ||
    !body.playedOn ||
    !body.reportedBy
  ) {
    res.status(400).json({ error: 'Missing result fields.' })
    return
  }

  const result = await store.addResult({
    homeTeam: body.homeTeam,
    awayTeam: body.awayTeam,
    homeScore: body.homeScore,
    awayScore: body.awayScore,
    venue: body.venue,
    playedOn: body.playedOn,
    reportedBy: body.reportedBy,
    engagement: body.engagement,
  })

  res.status(201).json(result)
})

app.post('/api/tournaments', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  if (!allowedRoles.has(user.role.trim().toLowerCase())) {
    res.status(403).json({ error: 'Only TM, Coach, or captain can create a tournament.' })
    return
  }

  const body = req.body as {
    sport?: string
    format?: string
    name?: string
    period?: string
    venue?: string
    status?: 'upcoming' | 'registration open' | 'ongoing'
    registeredTeams?: string[]
  }

  if (!body.sport || !body.format || !body.name || !body.period || !body.venue || !body.status) {
    res.status(400).json({ error: 'Missing tournament fields.' })
    return
  }

  const tournament = await store.addTournament({
    sport: body.sport.trim(),
    format: body.format.trim(),
    name: body.name.trim(),
    period: body.period.trim(),
    venue: body.venue.trim(),
    status: body.status,
    ownerTeam: user.team,
    registeredTeams: body.registeredTeams,
  })

  res.status(201).json(tournament)
})

app.post('/api/tournaments/:tournamentId/register', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  if (!allowedRoles.has(user.role.trim().toLowerCase())) {
    res.status(403).json({ error: 'Only TM, Coach, or captain can register a team to a tournament.' })
    return
  }

  const teamName = user.team?.trim()
  if (!teamName) {
    res.status(400).json({ error: 'Your account has no team set.' })
    return
  }

  const tournamentId = req.params.tournamentId?.trim()
  if (!tournamentId) {
    res.status(400).json({ error: 'Tournament id is required.' })
    return
  }

  const tournament = await store.registerTeamForTournament(tournamentId, teamName)
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found.' })
    return
  }

  res.json(tournament)
})

const distPath = path.resolve(process.cwd(), 'dist')
const indexPath = path.join(distPath, 'index.html')

if (process.env.NODE_ENV === 'production' && fs.existsSync(indexPath)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      next()
      return
    }

    res.sendFile(indexPath)
  })
}

const startServer = async () => {
  await connectDatabase(mongoUri)

  app.listen(port, () => {
    console.log(`Monolith backend running on http://localhost:${port}`)
    console.log(`MongoDB connected: ${mongoUri}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start monolith backend', error)
  process.exit(1)
})
