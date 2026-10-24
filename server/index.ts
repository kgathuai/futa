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
const corsOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors(corsOrigins.length > 0 ? { origin: corsOrigins } : {}))
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
  const { likedByAccountIds: _likedByAccountIds, ratedByAccountIds: _ratedByAccountIds, ...rest } = match

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

app.get('/api/team', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  const team = await store.getTeam(user?.id, user?.team)
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
    referee?: string
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
    referee: body.referee,
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

app.patch('/api/friendlies/:requestId/status', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const requestId = req.params.requestId?.trim()
  const status = (req.body as { status?: string }).status?.trim()
  if (!requestId || (status !== 'pending' && status !== 'accepted' && status !== 'declined')) {
    res.status(400).json({ error: 'A valid request id and status are required.' })
    return
  }

  const result = await store.updateFriendlyRequestStatus(requestId, status, user.id)
  if (!result) {
    res.status(404).json({ error: 'Friendly request not found.' })
    return
  }

  res.json(result)
})

// ─── Fixture generation helpers ───────────────────────────────────────────────

type Fixture = { home: string; away: string; round: number }

/** Standard round-robin using the rotation algorithm (Berger tables). */
function roundRobinFixtures(teams: string[]): Fixture[] {
  const list = teams.length % 2 === 0 ? [...teams] : [...teams, 'BYE']
  const n = list.length
  const rounds = n - 1
  const half = n / 2
  const fixtures: Fixture[] = []

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = list[i]
      const away = list[n - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        fixtures.push({ home, away, round: r + 1 })
      }
    }
    // Rotate all elements except the first (fixed pin)
    const last = list.pop()!
    list.splice(1, 0, last)
  }

  return fixtures
}

/** Double round-robin — home+away legs. */
function doubleRoundRobinFixtures(teams: string[]): Fixture[] {
  const leg1 = roundRobinFixtures(teams)
  const totalRounds = leg1.length > 0 ? Math.max(...leg1.map((f) => f.round)) : 0
  const leg2 = leg1.map((f) => ({ home: f.away, away: f.home, round: f.round + totalRounds }))
  return [...leg1, ...leg2]
}

/** Single-elimination knockout — seeds top half vs bottom half. */
function knockoutFixtures(teams: string[]): Fixture[] {
  // Pad to next power of two with BYE slots
  let size = 1
  while (size < teams.length) size *= 2
  const seeded = [...teams]
  while (seeded.length < size) seeded.push('BYE')

  const fixtures: Fixture[] = []
  let roundTeams = seeded
  let round = 1

  while (roundTeams.length > 1) {
    const nextRound: string[] = []
    for (let i = 0; i < roundTeams.length; i += 2) {
      const home = roundTeams[i]
      const away = roundTeams[i + 1]
      if (home !== 'BYE' && away !== 'BYE') {
        fixtures.push({ home, away, round })
      }
      // winner placeholder — only Round 1 fixtures are concrete
      nextRound.push(`W${round}-${i / 2 + 1}`)
    }
    roundTeams = nextRound
    round++
  }

  return fixtures
}

/** Group stage: split into groups of groupSize, round-robin within each group. */
function groupStageFixtures(teams: string[], groupSize = 4): Fixture[] {
  const fixtures: Fixture[] = []
  for (let g = 0; g * groupSize < teams.length; g++) {
    const group = teams.slice(g * groupSize, (g + 1) * groupSize)
    const groupFixtures = roundRobinFixtures(group)
    for (const f of groupFixtures) {
      fixtures.push({ ...f, round: f.round }) // rounds are local to group; kept as-is
    }
  }
  return fixtures
}

// ─── GET /api/tournaments/:id/fixtures ───────────────────────────────────────
app.get('/api/tournaments/:tournamentId/fixtures', async (req, res) => {
  const tournamentId = req.params.tournamentId?.trim()
  if (!tournamentId) {
    res.status(400).json({ error: 'Tournament id is required.' })
    return
  }

  const fixtures = await store.getFixturesForTournament(tournamentId)
  res.json(fixtures.map((m) => sanitizeMatchForViewer(m as MatchWithInteractions)))
})

// ─── POST /api/tournaments/:id/generate-fixtures ─────────────────────────────
app.post('/api/tournaments/:tournamentId/generate-fixtures', async (req, res) => {
  const user = await getRequestUser(req.header('authorization'))
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  if (!allowedRoles.has(user.role.trim().toLowerCase())) {
    res.status(403).json({ error: 'Only TM, Coach, or captain can generate fixtures.' })
    return
  }

  const tournamentId = req.params.tournamentId?.trim()
  if (!tournamentId) {
    res.status(400).json({ error: 'Tournament id is required.' })
    return
  }

  const tournaments = await store.getTournaments()
  const tournament = tournaments.find((t) => t.id === tournamentId)
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found.' })
    return
  }

  if (tournament.ownerTeam !== user.team) {
    res.status(403).json({ error: 'Only the tournament owner can generate fixtures.' })
    return
  }

  const teams = [...new Set(tournament.registeredTeams.map((t) => t.trim()).filter(Boolean))]
  if (teams.length < 2) {
    res.status(400).json({ error: 'At least 2 registered teams are required to generate fixtures.' })
    return
  }

  // Check fixtures don't already exist
  const existing = await store.getFixturesForTournament(tournamentId)
  if (existing.length > 0) {
    res.status(409).json({ error: 'Fixtures have already been generated for this tournament.' })
    return
  }

  const format = tournament.format.toLowerCase()
  let pairs: Fixture[]

  if (format.includes('knockout') && !format.includes('group')) {
    pairs = knockoutFixtures(teams)
  } else if (format.includes('group')) {
    const groupFixtures = groupStageFixtures(teams, 4)
    const maxGroupRound = groupFixtures.length > 0 ? Math.max(...groupFixtures.map((f) => f.round)) : 0
    const knockoutPairs = knockoutFixtures(teams.slice(0, Math.min(teams.length, 8)))
    pairs = [
      ...groupFixtures,
      ...knockoutPairs.map((f) => ({ ...f, round: f.round + maxGroupRound })),
    ]
  } else {
    // League / Round Robin — double round-robin for home+away
    pairs = doubleRoundRobinFixtures(teams)
  }

  const sport = tournament.sport as 'Football' | 'Handball' | 'Volleyball' | 'Basketball' | 'Rugby' | 'Tennis' | 'Pool Table'
  const category = format.includes('league') || format.includes('round robin') ? 'League' : 'Cup'

  const created = await Promise.all(
    pairs.map((pair) =>
      store.addMatch({
        homeTeam: pair.home,
        awayTeam: pair.away,
        venue: tournament.venue,
        kickoff: new Date(Date.now() + pair.round * 7 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 90,
        category,
        sport,
        createdByTeam: user.team,
        createdByAccountId: user.id,
        tournamentId,
        round: pair.round,
      }),
    ),
  )

  res.status(201).json(created.map((m) => sanitizeMatchForViewer(m as MatchWithInteractions, user.id)))
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

  const result = await store.authenticate(email, password)
  if (result.status === 'not-found') {
    res.status(404).json({ error: 'Account not found. Please register first.' })
    return
  }

  if (result.status === 'invalid') {
    res.status(401).json({ error: 'Invalid credentials.' })
    return
  }

  const session = await store.createSession(result.account.id)

  res.json({
    token: session.token,
    user: sanitizeAccount(result.account),
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
    startDate?: string
    endDate?: string
    venue?: string
    status?: 'upcoming' | 'registration open' | 'ongoing'
    registeredTeams?: string[]
    maxTeams?: number
  }

  if (!body.sport || !body.format || !body.name || !body.period || !body.venue || !body.status) {
    res.status(400).json({ error: 'Missing tournament fields.' })
    return
  }

  const maxTeams = body.maxTeams !== undefined ? Number(body.maxTeams) : undefined
  if (maxTeams !== undefined && (!Number.isInteger(maxTeams) || maxTeams < 2)) {
    res.status(400).json({ error: 'maxTeams must be an integer of 2 or more.' })
    return
  }

  const tournament = await store.addTournament({
    sport: body.sport.trim(),
    format: body.format.trim(),
    name: body.name.trim(),
    period: body.period.trim(),
    startDate: body.startDate,
    endDate: body.endDate,
    venue: body.venue.trim(),
    status: body.status,
    ownerTeam: user.team,
    registeredTeams: body.registeredTeams,
    maxTeams,
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

  if (tournament === 'full') {
    res.status(409).json({ error: 'This tournament is full. No more teams can register.' })
    return
  }

  if (tournament === 'closed') {
    res.status(409).json({ error: 'Registration is not open for this tournament.' })
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
