import crypto from 'node:crypto'
import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import type { TeamLevel, TournamentItem, TournamentStatus } from '../src/types.ts'
import { getTournamentStatus } from '../src/lib/tournamentStatus.ts'

// Sessions expire after 2 hours by default; override with SESSION_TTL_MINUTES.
const SESSION_TTL_MINUTES = Number(process.env.SESSION_TTL_MINUTES ?? 120)
const SESSION_TTL_MS =
  (Number.isFinite(SESSION_TTL_MINUTES) && SESSION_TTL_MINUTES > 0 ? SESSION_TTL_MINUTES : 120) *
  60 *
  1000

export interface AccountRecord {
  id: string
  name: string
  team: string
  county: string
  homeGround: string
  role: string
  sport: string
  email: string
  password: string
  avatar?: string
  emailVerified?: boolean
}

export interface TeamPayload {
  name: string
  manager: string
  county: string
  homeGround: string
  level: TeamLevel
  bio: string
  logoUrl?: string
}

export interface PlayerRecord {
  id: string
  team: string
  name: string
  number?: number
  position?: string
  createdAt?: string
}

export interface FriendlyRequestRecord {
  id: string
  requesterAccountId: string
  requesterName: string
  requesterTeam: string
  recipientAccountId: string
  recipientTeam: string
  contact: string
  preferredDate: string
  preferredTime: string
  location: string
  note: string
  referee?: string
  refereeAccountId?: string
  refereeStatus?: 'pending' | 'accepted' | 'declined'
  refereeRespondedAt?: string | null
  report?: {
    homeScore: number
    awayScore: number
    notes?: string
    createdAt: string
  } | null
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  respondedAt?: string | null
}

export interface NotificationRecord {
  id: string
  accountId: string
  type:
    | 'friendly-request'
    | 'friendly-accepted'
    | 'friendly-declined'
    | 'match-score-reminder'
    | 'comment-reply'
    | 'referee-booking'
  title: string
  message: string
  relatedFriendlyRequestId?: string
  relatedMatchId?: string
  read: boolean
  createdAt: string
}

export interface SessionRecord {
  token: string
  accountId: string
  createdAt: string
  expiresAt: string
}

export interface TournamentRecord extends TournamentItem {
  createdAt: string
  updatedAt?: string
}

const engagementSchema = new Schema(
  {
    likes: { type: Number, required: true },
    comments: { type: Number, required: true },
    rating: { type: Number, required: true },
    ratingCount: { type: Number, required: true },
  },
  { _id: false },
)

const goalSchema = new Schema(
  {
    id: { type: String, required: true },
    team: { type: String, required: true },
    scorer: { type: String, required: true },
    assist: { type: String, required: false },
  },
  { _id: false },
)

const matchSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    venue: { type: String, required: true },
    kickoff: { type: String, required: true },
    durationMinutes: { type: Number, required: false },
    homeScore: { type: Number, required: false },
    awayScore: { type: Number, required: false },
    category: { type: String, required: true },
    sport: { type: String, required: true },
    createdByTeam: { type: String, required: false },
    createdByAccountId: { type: String, required: false },
    likedByAccountIds: { type: [String], required: true, default: [] },
    ratedByAccountIds: { type: [String], required: true, default: [] },
    status: { type: String, required: true },
    comments: [{ type: Schema.Types.Mixed, required: true }],
    goals: { type: [goalSchema], required: true, default: [] },
    scoreReminderSentAt: { type: Date, required: false },
    engagement: { type: engagementSchema, required: true },
    tournamentId: { type: String, required: false },
    round: { type: Number, required: false },
  },
  { versionKey: false },
)

const resultSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    homeScore: { type: Number, required: true },
    awayScore: { type: Number, required: true },
    venue: { type: String, required: true },
    playedOn: { type: String, required: true },
    reportedBy: { type: String, required: true },
    engagement: { type: engagementSchema, required: true },
  },
  { versionKey: false },
)

const tournamentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    sport: { type: String, required: true },
    format: { type: String, required: true },
    name: { type: String, required: true },
    period: { type: String, required: true },
    startDate: { type: String, required: false },
    endDate: { type: String, required: false },
    venue: { type: String, required: true },
    status: { type: String, required: true },
    // 'open' = any team may register up to maxTeams; 'closed' = owner defines the roster.
    type: { type: String, required: false, default: 'open' },
    ownerTeam: { type: String, required: false },
    registeredTeams: { type: [String], required: true, default: [] },
    maxTeams: { type: Number, required: false },
    // Entry fee per team in KES; 0 means free to enter.
    entryFee: { type: Number, required: false, default: 0 },
  },
  { versionKey: false, timestamps: true },
)

const teamSchema = new Schema(
  {
    name: { type: String, required: true },
    manager: { type: String, required: true },
    county: { type: String, required: true },
    homeGround: { type: String, required: true },
    level: { type: String, required: true },
    bio: { type: String, required: true },
    logoUrl: { type: String, required: false },
    ownerAccountId: { type: Schema.Types.ObjectId, required: false, ref: 'Account' },
  },
  { versionKey: false, timestamps: true },
)

const playerSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    team: { type: String, required: true },
    name: { type: String, required: true },
    number: { type: Number, required: false },
    position: { type: String, required: false, default: '' },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
)
playerSchema.index({ team: 1, name: 1 })

const paymentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tournamentId: { type: String, required: true },
    team: { type: String, required: true },
    accountId: { type: Schema.Types.ObjectId, required: false, ref: 'Account' },
    amount: { type: Number, required: true },
    phone: { type: String, required: false, default: '' },
    status: { type: String, required: true, default: 'pending' },
    provider: { type: String, required: true, default: 'mpesa' },
    reference: { type: String, required: false, default: '' },
    receipt: { type: String, required: false, default: '' },
    notes: { type: String, required: false, default: '' },
    createdAt: { type: Date, required: true, default: Date.now },
    paidAt: { type: Date, required: false },
  },
  { versionKey: false },
)
paymentSchema.index({ tournamentId: 1, team: 1 })
paymentSchema.index({ status: 1, createdAt: -1 })

const followSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    accountId: { type: Schema.Types.ObjectId, required: true, ref: 'Account' },
    team: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
)
followSchema.index({ accountId: 1, team: 1 }, { unique: true })

const accountSchema = new Schema(
  {
    name: { type: String, required: true },
    // Referees are not attached to a team, so this may be empty.
    team: { type: String, required: false, default: '' },
    county: { type: String, required: false, default: '' },
    homeGround: { type: String, required: false, default: '' },
    role: { type: String, required: true },
    sport: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Data URL or remote URL for the account profile picture.
    avatar: { type: String, required: false, default: '' },
    // Accounts created before verification existed are treated as verified.
    emailVerified: { type: Boolean, required: false, default: false },
  },
  { versionKey: false, timestamps: true },
)

const sessionSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    accountId: { type: Schema.Types.ObjectId, required: true, ref: 'Account' },
    createdAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
)

// MongoDB removes expired sessions automatically (the read path also enforces expiry).
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })


const friendlyRequestSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    requesterAccountId: { type: Schema.Types.ObjectId, required: true, ref: 'Account' },
    requesterName: { type: String, required: true },
    requesterTeam: { type: String, required: true },
    recipientAccountId: { type: Schema.Types.ObjectId, required: true, ref: 'Account' },
    recipientTeam: { type: String, required: true },
    contact: { type: String, required: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    location: { type: String, required: true },
    note: { type: String, required: true },
    referee: { type: String, required: false },
    refereeAccountId: { type: Schema.Types.ObjectId, required: false, ref: 'Account' },
    refereeStatus: { type: String, required: false, default: 'pending' },
    refereeRespondedAt: { type: String, required: false },
    report: {
      type: new Schema(
        {
          homeScore: { type: Number, required: true },
          awayScore: { type: Number, required: true },
          notes: { type: String, required: false, default: '' },
          createdAt: { type: String, required: true },
        },
        { versionKey: false, _id: false },
      ),
      required: false,
      default: null,
    },
    status: { type: String, required: true, default: 'pending' },
    respondedAt: { type: String, required: false },
  },
  { versionKey: false, timestamps: true },
)

const authTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    accountId: { type: Schema.Types.ObjectId, required: true, ref: 'Account' },
    type: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, required: false },
  },
  { versionKey: false },
)
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const notificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    accountId: { type: Schema.Types.ObjectId, required: true, ref: 'Account' },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedFriendlyRequestId: { type: String, required: false },
    relatedMatchId: { type: String, required: false },
    read: { type: Boolean, required: true, default: false },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
)

// Indexes for the hot read paths (match feeds, tournament fixtures, dashboards).
matchSchema.index({ kickoff: 1 })
matchSchema.index({ createdByTeam: 1, kickoff: 1 })
matchSchema.index({ tournamentId: 1, round: 1, kickoff: 1 })
matchSchema.index({ homeTeam: 1 })
matchSchema.index({ awayTeam: 1 })
resultSchema.index({ playedOn: -1 })
tournamentSchema.index({ createdAt: -1 })
teamSchema.index({ ownerAccountId: 1 })
teamSchema.index({ name: 1 })
friendlyRequestSchema.index({ createdAt: -1 })
friendlyRequestSchema.index({ recipientAccountId: 1, status: 1 })
notificationSchema.index({ accountId: 1, createdAt: -1 })

const MatchModel = mongoose.models.Match || mongoose.model('Match', matchSchema)
const ResultModel = mongoose.models.Result || mongoose.model('Result', resultSchema)
const TournamentModel = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema)
const TeamModel = mongoose.models.Team || mongoose.model('Team', teamSchema)
const AccountModel = mongoose.models.Account || mongoose.model('Account', accountSchema)
const SessionModel = mongoose.models.Session || mongoose.model('Session', sessionSchema)
const FriendlyRequestModel = mongoose.models.FriendlyRequest || mongoose.model('FriendlyRequest', friendlyRequestSchema)
const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
const AuthTokenModel = mongoose.models.AuthToken || mongoose.model('AuthToken', authTokenSchema)
const PlayerModel = mongoose.models.Player || mongoose.model('Player', playerSchema)
const FollowModel = mongoose.models.Follow || mongoose.model('Follow', followSchema)
const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)

type AccountDoc = InferSchemaType<typeof accountSchema> & { _id: mongoose.Types.ObjectId }

type SessionDoc = InferSchemaType<typeof sessionSchema> & { accountId: mongoose.Types.ObjectId }

const toPublicAccount = (account: AccountDoc): AccountRecord => ({
  id: account._id.toString(),
  name: account.name,
  team: account.team ?? '',
  county: account.county ?? '',
  homeGround: account.homeGround ?? '',
  role: account.role,
  sport: account.sport,
  email: account.email,
  password: account.password,
  avatar: account.avatar ?? '',
  // Missing on legacy documents → treat as verified so nobody is locked out.
  emailVerified: account.emailVerified !== false,
})

type AccountSummaryDoc = {
  _id: mongoose.Types.ObjectId
  name: string
  team: string
  role: string
  sport: string
  email: string
  createdAt?: Date
}

const toAdminAccount = (account: AccountSummaryDoc) => ({
  id: account._id.toString(),
  name: account.name,
  team: account.team,
  role: account.role,
  sport: account.sport,
  email: account.email,
  createdAt: account.createdAt ? new Date(account.createdAt).toISOString() : null,
})

interface StoredCommentReply {
  id: string
  text: string
  authorName: string
  authorAccountId: string | undefined
  likes: number
  likedByAccountIds: string[]
  createdAt: string
}

interface StoredComment {
  id: string
  text: string
  authorName: string
  authorAccountId: string | undefined
  likes: number
  likedByAccountIds: string[]
  createdAt: string
  replies: StoredCommentReply[]
}

const normalizeStoredComments = (input: unknown): StoredComment[] => {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const text = entry.trim()
        if (!text || text === 'Match announced.') {
          return null
        }

        const splitIndex = text.indexOf(':')
        const authorName = splitIndex > 0 ? text.slice(0, splitIndex).trim() : 'Unknown'
        const commentText = splitIndex > 0 ? text.slice(splitIndex + 1).trim() : text

        return {
          id: `legacy-${index + 1}`,
          text: commentText,
          authorName: authorName || 'Unknown',
          authorAccountId: undefined,
          likes: 0,
          likedByAccountIds: [],
          createdAt: new Date(0).toISOString(),
          replies: [],
        } satisfies StoredComment
      }

      if (!entry || typeof entry !== 'object') {
        return null
      }

      const raw = entry as {
        id?: unknown
        text?: unknown
        authorName?: unknown
        authorAccountId?: unknown
        likes?: unknown
        likedByAccountIds?: unknown
        createdAt?: unknown
        replies?: unknown
      }

      const text = typeof raw.text === 'string' ? raw.text.trim() : ''
      if (!text) {
        return null
      }

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
                authorAccountId?: unknown
                likes?: unknown
                likedByAccountIds?: unknown
                createdAt?: unknown
              }

              const replyText = typeof rawReply.text === 'string' ? rawReply.text.trim() : ''
              if (!replyText) {
                return null
              }

              return {
                id: typeof rawReply.id === 'string' && rawReply.id.trim() ? rawReply.id : `reply-${index + 1}-${replyIndex + 1}`,
                text: replyText,
                authorName:
                  typeof rawReply.authorName === 'string' && rawReply.authorName.trim()
                    ? rawReply.authorName.trim()
                    : 'Unknown',
                authorAccountId:
                  typeof rawReply.authorAccountId === 'string' && rawReply.authorAccountId.trim()
                    ? rawReply.authorAccountId.trim()
                    : undefined,
                likes: Number.isFinite(rawReply.likes as number) ? Math.max(0, Number(rawReply.likes)) : 0,
                likedByAccountIds: Array.isArray(rawReply.likedByAccountIds)
                  ? rawReply.likedByAccountIds.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                  : [],
                createdAt:
                  typeof rawReply.createdAt === 'string' && rawReply.createdAt.trim()
                    ? rawReply.createdAt
                    : new Date(0).toISOString(),
              } satisfies StoredCommentReply
            })
            .filter((reply): reply is StoredCommentReply => reply !== null)
        : []

      return {
        id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `comment-${index + 1}`,
        text,
        authorName: typeof raw.authorName === 'string' && raw.authorName.trim() ? raw.authorName.trim() : 'Unknown',
        authorAccountId:
          typeof raw.authorAccountId === 'string' && raw.authorAccountId.trim() ? raw.authorAccountId.trim() : undefined,
        likes: Number.isFinite(raw.likes as number) ? Math.max(0, Number(raw.likes)) : 0,
        likedByAccountIds: Array.isArray(raw.likedByAccountIds)
          ? raw.likedByAccountIds.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          : [],
        createdAt: typeof raw.createdAt === 'string' && raw.createdAt.trim() ? raw.createdAt : new Date(0).toISOString(),
        replies,
      } satisfies StoredComment
    })
    .filter((comment): comment is StoredComment => comment !== null)
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const makeEntityId = () => `${Date.now()}-${Math.floor(Math.random() * 10_000)}`

const PASSWORD_HASH_PREFIX = 'scrypt'
const PASSWORD_SALT_BYTES = 16
const PASSWORD_KEY_BYTES = 64

const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES)
  const derived = crypto.scryptSync(password, salt, PASSWORD_KEY_BYTES)
  return `${PASSWORD_HASH_PREFIX}$${salt.toString('hex')}$${derived.toString('hex')}`
}

const isHashedPassword = (value: string) => value.startsWith(`${PASSWORD_HASH_PREFIX}$`)

const verifyPassword = (stored: string, candidate: string) => {
  // Legacy accounts were stored in plain text; keep them working and upgrade on next login.
  if (!isHashedPassword(stored)) {
    return stored === candidate
  }

  const [, saltHex, hashHex] = stored.split('$')
  if (!saltHex || !hashHex) {
    return false
  }

  const expected = Buffer.from(hashHex, 'hex')
  if (expected.length === 0) {
    return false
  }

  const derived = crypto.scryptSync(candidate, Buffer.from(saltHex, 'hex'), expected.length)
  return crypto.timingSafeEqual(derived, expected)
}

const buildKickoffIso = (date: string, time: string) => {
  const safeDate = date.trim()
  const safeTime = time.trim()
  const normalizedTime = safeTime.length === 5 ? `${safeTime}:00` : safeTime
  const kickoff = new Date(`${safeDate}T${normalizedTime}`)

  if (Number.isNaN(kickoff.getTime())) {
    return `${safeDate} ${safeTime}`
  }

  return kickoff.toISOString()
}

const findTeamOwnerAccountId = async (teamName: string) => {
  const team = await TeamModel.findOne({ name: teamName.trim() }).lean<{ ownerAccountId?: mongoose.Types.ObjectId } | null>()
  if (team?.ownerAccountId) {
    return team.ownerAccountId.toString()
  }

  const account = await AccountModel.findOne({ team: teamName.trim() }).lean<AccountDoc | null>()
  return account ? account._id.toString() : null
}

const createNotification = async (payload: {
  accountId: string
  type: NotificationRecord['type']
  title: string
  message: string
  relatedFriendlyRequestId?: string
  relatedMatchId?: string
}) => {
  return NotificationModel.create({
    id: makeEntityId(),
    accountId: payload.accountId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    relatedFriendlyRequestId: payload.relatedFriendlyRequestId,
    relatedMatchId: payload.relatedMatchId,
    read: false,
    createdAt: new Date(),
  })
}

let isConnected = false

export const connectDatabase = async (mongoUri: string) => {
  if (isConnected) {
    return
  }

  await mongoose.connect(mongoUri)
  isConnected = true
}

export const store = {
  createPayment: async (payload: {
    tournamentId: string
    team: string
    accountId?: string
    amount: number
    phone?: string
    reference?: string
  }) => {
    const payment = await PaymentModel.create({
      id: makeEntityId(),
      tournamentId: payload.tournamentId,
      team: payload.team.trim(),
      accountId: mongoose.isValidObjectId(payload.accountId ?? '') ? payload.accountId : undefined,
      amount: payload.amount,
      phone: payload.phone?.trim() ?? '',
      status: 'pending',
      provider: 'mpesa',
      reference: payload.reference ?? '',
    })

    return payment.toObject()
  },
  updatePaymentReference: async (paymentId: string, reference: string) => {
    return PaymentModel.findOneAndUpdate(
      { id: paymentId },
      { $set: { reference } },
      { returnDocument: 'after' },
    ).lean()
  },
  markPaymentPaid: async (paymentId: string, receipt?: string, notes?: string) => {
    const payment = await PaymentModel.findOneAndUpdate(
      { id: paymentId },
      {
        $set: {
          status: 'paid',
          paidAt: new Date(),
          receipt: receipt?.trim() ?? '',
          notes: notes?.trim() ?? '',
        },
      },
      { returnDocument: 'after' },
    ).lean()

    return payment
  },
  markPaymentPaidByReference: async (reference: string, receipt?: string) => {
    return PaymentModel.findOneAndUpdate(
      { reference },
      { $set: { status: 'paid', paidAt: new Date(), receipt: receipt?.trim() ?? '' } },
      { returnDocument: 'after' },
    ).lean()
  },
  markPaymentFailedByReference: async (reference: string, notes?: string) => {
    return PaymentModel.findOneAndUpdate(
      { reference },
      { $set: { status: 'failed', notes: notes?.trim() ?? '' } },
      { returnDocument: 'after' },
    ).lean()
  },
  getTournamentById: async (tournamentId: string) => {
    if (!tournamentId) {
      return null
    }
    return TournamentModel.findOne({ id: tournamentId }).lean()
  },
  markPaymentFailed: async (paymentId: string, notes?: string) => {
    return PaymentModel.findOneAndUpdate(
      { id: paymentId },
      { $set: { status: 'failed', notes: notes?.trim() ?? '' } },
      { returnDocument: 'after' },
    ).lean()
  },
  getPaymentsForTournament: async (tournamentId: string) => {
    return PaymentModel.find({ tournamentId }).sort({ createdAt: -1 }).lean()
  },
  getPaymentsForTeamAccount: async (accountId: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return []
    }
    return PaymentModel.find({ accountId }).sort({ createdAt: -1 }).lean()
  },
  getPaidRegistration: async (tournamentId: string, teamName: string) => {
    return PaymentModel.findOne({
      tournamentId,
      team: new RegExp(`^${escapeRegExp(teamName.trim())}$`, 'i'),
      status: 'paid',
    }).lean()
  },
  followTeam: async (accountId: string, team: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return null
    }
    const name = team.trim()
    if (!name) {
      return null
    }

    await FollowModel.updateOne(
      { accountId, team: name },
      { $setOnInsert: { id: makeEntityId(), accountId, team: name, createdAt: new Date() } },
      { upsert: true },
    )
    return name
  },
  unfollowTeam: async (accountId: string, team: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return false
    }
    const result = await FollowModel.deleteOne({ accountId, team: team.trim() })
    return result.deletedCount > 0
  },
  getFollowedTeams: async (accountId: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return [] as string[]
    }
    const rows = await FollowModel.find({ accountId }).sort({ createdAt: -1 }).lean<Array<{ team: string }>>()
    return rows.map((row) => row.team)
  },
  getSquad: async (teamName: string) => {
    const team = teamName.trim()
    if (!team) {
      return [] as PlayerRecord[]
    }

    return PlayerModel.find({ team: new RegExp(`^${escapeRegExp(team)}$`, 'i') })
      .sort({ number: 1, name: 1 })
      .lean<PlayerRecord[]>()
  },
  addPlayer: async (payload: { team: string; name: string; number?: number; position?: string }) => {
    const created = await PlayerModel.create({
      id: makeEntityId(),
      team: payload.team.trim(),
      name: payload.name.trim(),
      number: payload.number,
      position: payload.position?.trim() ?? '',
    })

    return created.toObject() as PlayerRecord
  },
  updatePlayer: async (
    playerId: string,
    teamName: string,
    patch: { name?: string; number?: number; position?: string },
  ) => {
    const update: Record<string, unknown> = {}
    if (patch.name !== undefined) {
      update.name = patch.name.trim()
    }
    if (patch.number !== undefined) {
      update.number = patch.number
    }
    if (patch.position !== undefined) {
      update.position = patch.position.trim()
    }

    return PlayerModel.findOneAndUpdate(
      { id: playerId, team: new RegExp(`^${escapeRegExp(teamName.trim())}$`, 'i') },
      { $set: update },
      { returnDocument: 'after' },
    ).lean<PlayerRecord | null>()
  },
  deletePlayer: async (playerId: string, teamName: string) => {
    const result = await PlayerModel.deleteOne({
      id: playerId,
      team: new RegExp(`^${escapeRegExp(teamName.trim())}$`, 'i'),
    })
    return result.deletedCount > 0
  },
  getMatches: async () => MatchModel.find().sort({ kickoff: 1 }).lean(),
  getMatchesForTeam: async (teamName: string) =>
    MatchModel.find({ $or: [{ homeTeam: teamName }, { awayTeam: teamName }] }).sort({ kickoff: 1 }).lean(),
  getMatchForCreatorTeam: async (matchId: string, teamName: string) =>
    MatchModel.findOne({ id: matchId, createdByTeam: teamName }).lean(),
  getMatchForParticipant: async (matchId: string, teamName: string) =>
    MatchModel.findOne({
      id: matchId,
      $or: [{ homeTeam: teamName }, { awayTeam: teamName }],
    }).lean(),
  getMatchesAwaitingScore: async (now = Date.now()) => {
    const reminderWindowMs = 7 * 24 * 60 * 60 * 1000
    const matches = await MatchModel.find({
      homeScore: { $exists: false },
      scoreReminderSentAt: { $exists: false },
      status: { $ne: 'postponed' },
    }).lean<
      Array<{
        id: string
        homeTeam: string
        awayTeam: string
        kickoff: string
        durationMinutes?: number
      }>
    >()

    return matches.filter((match) => {
      const kickoff = new Date(match.kickoff).getTime()
      if (!Number.isFinite(kickoff)) {
        return false
      }
      const end = kickoff + (match.durationMinutes ?? 90) * 60_000
      return end <= now && end >= now - reminderWindowMs
    })
  },
  getAccountIdsForTeams: async (teamNames: string[]) => {
    const names = [...new Set(teamNames.map((name) => name.trim()).filter(Boolean))]
    if (names.length === 0) {
      return []
    }

    const [accounts, teams] = await Promise.all([
      AccountModel.find({ team: { $in: names } }, { _id: 1 }).lean<
        Array<{ _id: mongoose.Types.ObjectId }>
      >(),
      TeamModel.find(
        { name: { $in: names }, ownerAccountId: { $exists: true } },
        { ownerAccountId: 1 },
      ).lean<Array<{ ownerAccountId?: mongoose.Types.ObjectId }>>(),
    ])

    const ids = new Set<string>()
    for (const account of accounts) {
      ids.add(account._id.toString())
    }
    for (const team of teams) {
      if (team.ownerAccountId) {
        ids.add(team.ownerAccountId.toString())
      }
    }

    return [...ids]
  },
  markScoreReminderSent: async (matchIds: string[]) => {
    if (matchIds.length === 0) {
      return
    }

    await MatchModel.updateMany(
      { id: { $in: matchIds } },
      { $set: { scoreReminderSentAt: new Date() } },
    )
  },
  createNotifications: async (
    accountIds: string[],
    payload: {
      type: NotificationRecord['type']
      title: string
      message: string
      relatedMatchId?: string
    },
  ) => {
    if (accountIds.length === 0) {
      return
    }

    await NotificationModel.insertMany(
      accountIds.map((accountId) => ({
        id: crypto.randomUUID(),
        accountId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        relatedMatchId: payload.relatedMatchId,
        read: false,
        createdAt: new Date(),
      })),
    )
  },
  getResults: async () => ResultModel.find().sort({ playedOn: -1 }).lean(),
  getTournaments: async () => {
    const tournaments = await TournamentModel.find().sort({ createdAt: -1 }).lean<TournamentRecord[]>()
    return tournaments.map((tournament) => ({ ...tournament, status: getTournamentStatus(tournament) }))
  },
  getFixturesForTournament: async (tournamentId: string) =>
    MatchModel.find({ tournamentId }).sort({ round: 1, kickoff: 1 }).lean(),
  getTeam: async (ownerAccountId?: string, teamName?: string) => {
    if (ownerAccountId) {
      if (mongoose.isValidObjectId(ownerAccountId)) {
        const owned = await TeamModel.findOne({ ownerAccountId }).sort({ updatedAt: -1 }).lean()
        if (owned) {
          return owned
        }
      }

      const safeTeamName = teamName?.trim()
      if (safeTeamName) {
        const byName = await TeamModel.findOne({ name: safeTeamName }).sort({ updatedAt: -1 }).lean()
        if (byName) {
          return byName
        }
      }

      // Signed-in users without a team (e.g. referees) have no profile of their own.
      return null
    }

    return TeamModel.findOne().sort({ updatedAt: -1 }).lean()
  },
  getTeams: async () => {
    const [accountTeams, savedTeams] = await Promise.all([
      AccountModel.find({}, { team: 1, county: 1, homeGround: 1, _id: 0 }).lean<
        Array<{ team?: string; county?: string; homeGround?: string }>
      >(),
      TeamModel.find({}, { name: 1, logoUrl: 1, manager: 1, county: 1, homeGround: 1, level: 1, bio: 1, updatedAt: 1, _id: 0 })
        .lean<Array<{ name?: string; logoUrl?: string; manager?: string; county?: string; homeGround?: string; level?: TeamLevel; bio?: string; updatedAt?: Date }>>(),
    ])

    const teamsByName = new Map<
      string,
      {
        name: string
        logoUrl?: string
        manager?: string
        county?: string
        homeGround?: string
        level?: TeamLevel
        bio?: string
        status?: 'active' | 'inactive'
        updatedAt?: string
      }
    >()

    for (const account of accountTeams) {
      const trimmed = account.team?.trim()
      if (trimmed) {
        teamsByName.set(trimmed, {
          name: trimmed,
          county: account.county?.trim() || undefined,
          homeGround: account.homeGround?.trim() || undefined,
          status: 'inactive',
        })
      }
    }

    for (const team of savedTeams) {
      const trimmed = team.name?.trim()
      if (trimmed) {
        teamsByName.set(trimmed, {
          name: trimmed,
          logoUrl: team.logoUrl?.trim() || undefined,
          manager: team.manager?.trim() || undefined,
          county: team.county?.trim() || undefined,
          homeGround: team.homeGround?.trim() || undefined,
          level: team.level,
          bio: team.bio?.trim() || undefined,
          status: 'active',
          updatedAt: team.updatedAt?.toISOString(),
        })
      }
    }

    return Array.from(teamsByName.values()).sort((a, b) => a.name.localeCompare(b.name))
  },
  getRegisteredTeamNames: async () => {
    const [accountTeams, savedTeams] = await Promise.all([
      AccountModel.distinct('team'),
      TeamModel.find({}, { name: 1, _id: 0 }).lean<Array<{ name?: string }>>(),
    ])

    const names = new Set<string>()
    for (const teamName of accountTeams) {
      const trimmed = teamName?.trim()
      if (trimmed) {
        names.add(trimmed)
      }
    }
    for (const team of savedTeams) {
      const trimmed = team.name?.trim()
      if (trimmed) {
        names.add(trimmed)
      }
    }

    return [...names]
  },
  getGrounds: async () => {
    const [venues, homeGrounds, accountGrounds] = await Promise.all([
      MatchModel.distinct('venue'),
      TeamModel.find({}, { homeGround: 1, _id: 0 }).lean<Array<{ homeGround?: string }>>(),
      AccountModel.find({ homeGround: { $exists: true } }, { homeGround: 1, _id: 0 }).lean<
        Array<{ homeGround?: string }>
      >(),
    ])

    const grounds = new Set<string>()
    for (const venue of venues) {
      const trimmed = venue?.trim()
      if (trimmed) {
        grounds.add(trimmed)
      }
    }

    for (const team of homeGrounds) {
      const trimmed = team.homeGround?.trim()
      if (trimmed) {
        grounds.add(trimmed)
      }
    }

    for (const account of accountGrounds) {
      const trimmed = account.homeGround?.trim()
      if (trimmed) {
        grounds.add(trimmed)
      }
    }

    return Array.from(grounds).sort((a, b) => a.localeCompare(b))
  },
  setTeam: async (payload: TeamPayload, ownerAccountId: string, currentTeamName?: string) => {
    const name = payload.name.trim()
    const update = {
      name,
      manager: payload.manager.trim(),
      county: payload.county.trim(),
      homeGround: payload.homeGround.trim(),
      level: payload.level,
      bio: payload.bio.trim(),
      logoUrl: payload.logoUrl?.trim() || undefined,
      ownerAccountId,
    }

    // Only ever update the team owned by the caller — never the first team in the collection.
    const owned = await TeamModel.findOneAndUpdate({ ownerAccountId }, update, { returnDocument: 'after' }).lean()

    // Adopt a legacy/shared team document under the caller's current team name only,
    // so a manager cannot overwrite an unrelated team by typing its name.
    const safeCurrentName = currentTeamName?.trim()
    const team =
      owned ??
      (safeCurrentName
        ? await TeamModel.findOneAndUpdate(
            { name: safeCurrentName },
            update,
            { returnDocument: 'after' },
          ).lean()
        : null)
    const resolvedTeam = team ?? (await TeamModel.create(update)).toObject()

    // Keep the owner account's team and ground in sync so they can create matches.
    if (mongoose.isValidObjectId(ownerAccountId)) {
      await AccountModel.updateOne(
        { _id: ownerAccountId },
        { $set: { team: name, county: update.county, homeGround: update.homeGround } },
      )
    }

    return resolvedTeam
  },
  findAccountByEmail: async (email: string) => {
    const account = await AccountModel.findOne({ email: email.toLowerCase() }).lean<AccountDoc | null>()
    return account ? toPublicAccount(account) : null
  },
  findAccountById: async (id: string) => {
    if (!mongoose.isValidObjectId(id)) {
      return null
    }

    const account = await AccountModel.findById(id).lean<AccountDoc | null>()
    return account ? toPublicAccount(account) : null
  },
  createAccount: async (payload: Omit<AccountRecord, 'id'>) => {
    const account = await AccountModel.create({
      name: payload.name,
      team: payload.team,
      county: payload.county,
      homeGround: payload.homeGround,
      role: payload.role,
      sport: payload.sport,
      email: payload.email.toLowerCase(),
      password: hashPassword(payload.password),
      emailVerified: false,
    })

    return toPublicAccount(account.toObject() as AccountDoc)
  },
  updateAccountProfile: async (accountId: string, team: string, county: string, homeGround: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return null
    }

    const account = await AccountModel.findByIdAndUpdate(
      accountId,
      { $set: { team, county, homeGround } },
      { returnDocument: 'after' },
    ).lean<AccountDoc | null>()

    return account ? toPublicAccount(account) : null
  },
  updateAccountAvatar: async (accountId: string, avatar: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return null
    }

    const account = await AccountModel.findByIdAndUpdate(
      accountId,
      { $set: { avatar } },
      { returnDocument: 'after' },
    ).lean<AccountDoc | null>()

    return account ? toPublicAccount(account) : null
  },
  createAuthToken: async (accountId: string, type: 'reset' | 'verify', ttlMinutes = 60) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return null
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)
    await AuthTokenModel.create({ token, accountId, type, expiresAt })
    return { token, expiresAt }
  },
  consumeAuthToken: async (token: string, type: 'reset' | 'verify') => {
    const record = await AuthTokenModel.findOne({ token, type, usedAt: { $exists: false } }).lean<{
      _id: mongoose.Types.ObjectId
      accountId: mongoose.Types.ObjectId
      expiresAt: Date
    } | null>()

    if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
      return null
    }

    await AuthTokenModel.updateOne({ _id: record._id }, { usedAt: new Date() })
    return record.accountId.toString()
  },
  setAccountPassword: async (accountId: string, password: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return null
    }

    const account = await AccountModel.findByIdAndUpdate(
      accountId,
      { password: hashPassword(password) },
      { returnDocument: 'after' },
    ).lean<AccountDoc | null>()

    if (!account) {
      return null
    }

    // Changing the password signs every existing session out.
    await SessionModel.deleteMany({ accountId: account._id })
    return toPublicAccount(account)
  },
  markEmailVerified: async (accountId: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return null
    }

    const account = await AccountModel.findByIdAndUpdate(
      accountId,
      { emailVerified: true },
      { returnDocument: 'after' },
    ).lean<AccountDoc | null>()

    return account ? toPublicAccount(account) : null
  },
  authenticate: async (email: string, password: string) => {
    const account = await AccountModel.findOne({ email: email.toLowerCase() }).lean<AccountDoc | null>()
    if (!account) {
      return { status: 'not-found' as const }
    }

    if (!verifyPassword(account.password, password)) {
      return { status: 'invalid' as const }
    }

    // Transparently upgrade legacy plain-text passwords to a salted hash.
    if (!isHashedPassword(account.password)) {
      await AccountModel.updateOne({ _id: account._id }, { password: hashPassword(password) })
    }

    return { status: 'ok' as const, account: toPublicAccount(account) }
  },
  listAccounts: async () => {
    const accounts = await AccountModel.find(
      {},
      { name: 1, team: 1, role: 1, sport: 1, email: 1, createdAt: 1 },
    )
      .sort({ createdAt: 1 })
      .lean<AccountSummaryDoc[]>()

    return accounts.map(toAdminAccount)
  },
  setAccountRole: async (accountId: string, role: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return null
    }

    const account = await AccountModel.findByIdAndUpdate(accountId, { role }, { returnDocument: 'after' }).lean<AccountSummaryDoc | null>()
    return account ? toAdminAccount(account) : null
  },
  setAccountRoleByEmail: async (email: string, role: string) => {
    const account = await AccountModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role },
      { returnDocument: 'after' },
    ).lean<AccountSummaryDoc | null>()

    return account ? toAdminAccount(account) : null
  },
  deleteAccount: async (accountId: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return null
    }

    const account = await AccountModel.findByIdAndDelete(accountId).lean<AccountSummaryDoc | null>()
    if (!account) {
      return null
    }

    // Invalidate every session belonging to the deleted account.
    await SessionModel.deleteMany({ accountId: account._id })
    return toAdminAccount(account)
  },
  createSession: async (accountId: string) => {
    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS)
    const session = await SessionModel.create({
      token: crypto.randomUUID(),
      accountId,
      createdAt,
      expiresAt,
    })

    return {
      token: session.token,
      accountId: session.accountId.toString(),
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    } satisfies SessionRecord
  },
  getSession: async (token: string) => {
    const session = await SessionModel.findOne({ token }).lean<SessionDoc | null>()
    if (!session) {
      return null
    }

    // Legacy sessions created before expiries were added get created-at + TTL.
    const createdAt = new Date(session.createdAt)
    const expiresAt = session.expiresAt
      ? new Date(session.expiresAt)
      : new Date(createdAt.getTime() + SESSION_TTL_MS)

    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      await SessionModel.deleteOne({ token })
      return null
    }

    if (!session.expiresAt) {
      await SessionModel.updateOne({ token }, { $set: { expiresAt } })
    }

    return {
      token: session.token,
      accountId: session.accountId.toString(),
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    } satisfies SessionRecord
  },
  clearSession: async (token: string) => {
    await SessionModel.deleteOne({ token })
  },
  getNotifications: async (accountId: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return []
    }

    return NotificationModel.find({ accountId }).sort({ createdAt: -1 }).lean()
  },
  markNotificationRead: async (notificationId: string, accountId: string) => {
    if (!mongoose.isValidObjectId(accountId)) {
      return null
    }

    const updated = await NotificationModel.findOneAndUpdate(
      { id: notificationId, accountId },
      { read: true },
      { returnDocument: 'after' },
    ).lean()

    return updated
  },
  addResult: async (payload: {
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    venue: string
    playedOn: string
    reportedBy: string
    engagement?: {
      likes: number
      comments: number
      rating: number
      ratingCount: number
    }
  }) => {
    const result = await ResultModel.create({
      id: makeEntityId(),
      homeTeam: payload.homeTeam,
      awayTeam: payload.awayTeam,
      homeScore: payload.homeScore,
      awayScore: payload.awayScore,
      venue: payload.venue,
      playedOn: payload.playedOn,
      reportedBy: payload.reportedBy,
      engagement: payload.engagement ?? {
        likes: 0,
        comments: 0,
        rating: 0,
        ratingCount: 0,
      },
    })

    return result.toObject()
  },
  addTournament: async (payload: {
    sport: string
    format: string
    name: string
    period: string
    startDate?: string
    endDate?: string
    venue: string
    status: TournamentStatus
    type?: 'open' | 'closed'
    ownerTeam?: string
    registeredTeams?: string[]
    maxTeams?: number
    entryFee?: number
  }) => {
    const registeredTeams = (payload.registeredTeams?.length ? payload.registeredTeams : payload.ownerTeam ? [payload.ownerTeam] : [])
      .map((teamName) => teamName.trim())
      .filter(Boolean)

    const tournament = await TournamentModel.create({
      id: makeEntityId(),
      sport: payload.sport,
      format: payload.format,
      name: payload.name,
      period: payload.period,
      startDate: payload.startDate,
      endDate: payload.endDate,
      venue: payload.venue,
      status: payload.status,
      type: payload.type === 'closed' ? 'closed' : 'open',
      ownerTeam: payload.ownerTeam?.trim() || undefined,
      entryFee: payload.entryFee ?? 0,
      registeredTeams,
      maxTeams: payload.maxTeams ?? undefined,
    })

    return tournament.toObject() as TournamentRecord
  },
  registerTeamForTournament: async (tournamentId: string, teamName: string) => {
    const safeTeamName = teamName.trim()
    if (!safeTeamName) {
      return null
    }

    const existing = await TournamentModel.findOne({ id: tournamentId }).lean<TournamentRecord | null>()
    if (!existing) {
      return null
    }

    if (getTournamentStatus(existing) !== 'registration open') {
      return 'closed' as const
    }

    // Closed tournaments have an owner-defined roster; teams cannot self-register.
    if ((existing.type ?? 'open') === 'closed') {
      return 'closed' as const
    }

    if (
      existing.maxTeams !== undefined &&
      existing.maxTeams !== null &&
      existing.registeredTeams.length >= existing.maxTeams
    ) {
      return 'full' as const
    }

    return TournamentModel.findOneAndUpdate(
      { id: tournamentId },
      { $addToSet: { registeredTeams: safeTeamName } },
      { returnDocument: 'after' },
    ).lean<TournamentRecord | null>()
  },
  setTournamentTeams: async (tournamentId: string, ownerTeam: string, teams: string[]) => {
    const existing = await TournamentModel.findOne({ id: tournamentId }).lean<TournamentRecord | null>()
    if (!existing) {
      return { status: 'not-found' as const }
    }

    if ((existing.type ?? 'open') !== 'closed') {
      return { status: 'not-closed' as const }
    }

    if ((existing.ownerTeam ?? '').trim() !== ownerTeam.trim()) {
      return { status: 'forbidden' as const }
    }

    const currentStatus = getTournamentStatus(existing)
    if (currentStatus === 'ongoing' || currentStatus === 'finished') {
      return { status: 'started' as const }
    }

    const normalized = [...new Set(teams.map((teamName) => teamName.trim()).filter(Boolean))]
    if (normalized.length < 2) {
      return { status: 'too-few' as const }
    }

    if (
      existing.maxTeams !== undefined &&
      existing.maxTeams !== null &&
      normalized.length > existing.maxTeams
    ) {
      return { status: 'too-many' as const }
    }

    const updated = await TournamentModel.findOneAndUpdate(
      { id: tournamentId },
      { $set: { registeredTeams: normalized } },
      { returnDocument: 'after' },
    ).lean<TournamentRecord | null>()

    return { status: 'ok' as const, tournament: updated }
  },
  addMatch: async (payload: {
    homeTeam: string
    awayTeam: string
    venue: string
    kickoff: string
    durationMinutes: number
    category: 'League' | 'Friendly' | 'Cup'
    sport: 'Football' | 'Handball' | 'Volleyball' | 'Basketball' | 'Rugby' | 'Tennis' | 'Pool Table'
    comment?: string
    createdByTeam: string
    createdByAccountId: string
    tournamentId?: string
    round?: number
  }) => {
    const match = await MatchModel.create({
      id: makeEntityId(),
      homeTeam: payload.homeTeam,
      awayTeam: payload.awayTeam,
      venue: payload.venue,
      kickoff: payload.kickoff,
      durationMinutes: payload.durationMinutes,
      category: payload.category,
      sport: payload.sport,
      createdByTeam: payload.createdByTeam,
      createdByAccountId: payload.createdByAccountId,
      status: 'scheduled',
      comments: payload.comment?.trim() ? [payload.comment.trim()] : ['Match announced.'],
      engagement: {
        likes: 0,
        comments: 0,
        rating: 0,
        ratingCount: 0,
      },
      tournamentId: payload.tournamentId,
      round: payload.round,
    })

    return match.toObject()
  },
  getFriendlyRequests: async () => {
    const requests = await FriendlyRequestModel.find().sort({ createdAt: -1 }).lean()
    return requests.map((request) => ({
      ...request,
      requesterAccountId: request.requesterAccountId?.toString?.() ?? String(request.requesterAccountId),
      recipientAccountId: request.recipientAccountId?.toString?.() ?? String(request.recipientAccountId),
    }))
  },
  getRefereeBookings: async (accountId: string, refereeName: string) => {
    const escaped = refereeName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const filters: Array<Record<string, unknown>> = []
    if (mongoose.isValidObjectId(accountId)) {
      filters.push({ refereeAccountId: new mongoose.Types.ObjectId(accountId) })
    }
    if (escaped) {
      filters.push({ referee: { $regex: `^${escaped}$`, $options: 'i' } })
    }
    if (filters.length === 0) {
      return []
    }

    const requests = await FriendlyRequestModel.find({ $or: filters })
      .sort({ preferredDate: 1, preferredTime: 1 })
      .lean()
    return requests.map((request) => ({
      ...request,
      requesterAccountId: request.requesterAccountId?.toString?.() ?? String(request.requesterAccountId),
      recipientAccountId: request.recipientAccountId?.toString?.() ?? String(request.recipientAccountId),
    }))
  },
  getReferees: async () => {
    const referees = await AccountModel.find({ role: 'referee' })
      .select({ name: 1 })
      .sort({ name: 1 })
      .lean<Array<{ _id: mongoose.Types.ObjectId; name: string }>>()
    return referees.map((referee) => ({ id: referee._id.toString(), name: referee.name }))
  },
  updateMatchKickoff: async (matchId: string, teamName: string, kickoff: string) => {
    return MatchModel.findOneAndUpdate(
      {
        id: matchId,
        createdByTeam: teamName,
      },
      { kickoff },
      { returnDocument: 'after' },
    ).lean()
  },
  updateMatchScore: async (
    matchId: string,
    teamName: string,
    homeScore: number,
    awayScore: number,
    goals: Array<{ team: string; scorer: string; assist?: string }> = [],
  ) => {
    const normalizedGoals = goals
      .map((goal) => ({
        id: crypto.randomUUID(),
        team: goal.team.trim(),
        scorer: goal.scorer.trim(),
        assist: goal.assist?.trim() || undefined,
      }))
      .filter((goal) => goal.team && goal.scorer)

    // Either participating team may report the score.
    return MatchModel.findOneAndUpdate(
      {
        id: matchId,
        $or: [{ homeTeam: teamName }, { awayTeam: teamName }],
      },
      {
        homeScore,
        awayScore,
        goals: normalizedGoals,
        status: 'finished',
      },
      { returnDocument: 'after' },
    ).lean()
  },
  likeMatch: async (matchId: string, accountId: string) => {
    // Single conditional update handles the happy path; only fall back to a lookup
    // to tell "already liked" apart from "match missing".
    const updated = await MatchModel.findOneAndUpdate(
      { id: matchId, likedByAccountIds: { $ne: accountId } },
      {
        $inc: { 'engagement.likes': 1 },
        $addToSet: { likedByAccountIds: accountId },
      },
      { returnDocument: 'after' },
    ).lean()

    if (updated) {
      return { status: 'updated' as const, match: updated }
    }

    const exists = await MatchModel.exists({ id: matchId })
    return exists ? { status: 'already-liked' as const } : { status: 'not-found' as const }
  },
  commentOnMatch: async (matchId: string, comment: string, authorName: string, authorAccountId: string) => {
    const safeComment = comment.trim()
    const safeAuthor = authorName.trim()
    const existing = await MatchModel.findOne({ id: matchId }).lean<{ comments?: unknown } | null>()
    if (!existing) {
      return null
    }

    const nextComments = normalizeStoredComments(existing.comments)
    nextComments.push({
      id: crypto.randomUUID(),
      text: safeComment,
      authorName: safeAuthor || 'Unknown',
      authorAccountId,
      likes: 0,
      likedByAccountIds: [],
      createdAt: new Date().toISOString(),
      replies: [],
    })

    return MatchModel.findOneAndUpdate(
      { id: matchId },
      {
        $set: { comments: nextComments },
        $inc: { 'engagement.comments': 1 },
      },
      { returnDocument: 'after' },
    ).lean()
  },
  likeCommentOnMatch: async (matchId: string, commentId: string, accountId: string) => {
    const existing = await MatchModel.findOne({ id: matchId }).lean<{ comments?: unknown } | null>()
    if (!existing) {
      return { status: 'not-found' as const }
    }

    const comments = normalizeStoredComments(existing.comments)
    let touched = false
    let alreadyLiked = false

    const nextComments = comments.map((comment) => {
      if (comment.id === commentId) {
        if (comment.likedByAccountIds.includes(accountId)) {
          alreadyLiked = true
          return comment
        }

        touched = true
        return {
          ...comment,
          likes: comment.likes + 1,
          likedByAccountIds: [...comment.likedByAccountIds, accountId],
        }
      }

      const nextReplies = comment.replies.map((reply) => {
        if (reply.id !== commentId) {
          return reply
        }

        if (reply.likedByAccountIds.includes(accountId)) {
          alreadyLiked = true
          return reply
        }

        touched = true
        return {
          ...reply,
          likes: reply.likes + 1,
          likedByAccountIds: [...reply.likedByAccountIds, accountId],
        }
      })

      return nextReplies === comment.replies ? comment : { ...comment, replies: nextReplies }
    })

    if (alreadyLiked) {
      return { status: 'already-liked' as const }
    }

    if (!touched) {
      return { status: 'comment-not-found' as const }
    }

    const updated = await MatchModel.findOneAndUpdate(
      { id: matchId },
      { $set: { comments: nextComments } },
      { returnDocument: 'after' },
    ).lean()

    if (!updated) {
      return { status: 'not-found' as const }
    }

    return { status: 'updated' as const, match: updated }
  },
  replyToMatchComment: async (matchId: string, commentId: string, comment: string, authorName: string, authorAccountId: string) => {
    const safeComment = comment.trim()
    const safeAuthor = authorName.trim()

    const existing = await MatchModel.findOne({ id: matchId }).lean<{ comments?: unknown } | null>()
    if (!existing) {
      return { status: 'not-found' as const }
    }

    const comments = normalizeStoredComments(existing.comments)
    let replied = false
    const parentAuthorAccountId = comments.find((entry) => entry.id === commentId)?.authorAccountId ?? ''

    const nextComments = comments.map((entry) => {
      if (entry.id !== commentId) {
        return entry
      }

      replied = true
      return {
        ...entry,
        replies: [
          ...entry.replies,
          {
            id: crypto.randomUUID(),
            text: safeComment,
            authorName: safeAuthor || 'Unknown',
            authorAccountId,
            likes: 0,
            likedByAccountIds: [],
            createdAt: new Date().toISOString(),
          },
        ],
      }
    })

    if (!replied) {
      return { status: 'comment-not-found' as const }
    }

    const updated = await MatchModel.findOneAndUpdate(
      { id: matchId },
      {
        $set: { comments: nextComments },
        $inc: { 'engagement.comments': 1 },
      },
      { returnDocument: 'after' },
    ).lean()

    if (!updated) {
      return { status: 'not-found' as const }
    }

    // Let the original commenter know someone replied to them.
    if (
      parentAuthorAccountId &&
      parentAuthorAccountId !== authorAccountId &&
      mongoose.isValidObjectId(parentAuthorAccountId)
    ) {
      const matchLabel = `${updated.homeTeam} vs ${updated.awayTeam}`
      await createNotification({
        accountId: parentAuthorAccountId,
        type: 'comment-reply',
        title: 'New reply to your comment',
        message: `${safeAuthor || 'Someone'} replied on ${matchLabel}: “${safeComment.slice(0, 140)}”`,
        relatedMatchId: matchId,
      })
    }

    return { status: 'updated' as const, match: updated }
  },
  rateMatch: async (matchId: string, rating: number, accountId: string) => {
    const match = await MatchModel.findOne({ id: matchId }).lean<
      | {
          ratedByAccountIds?: string[]
          engagement?: {
            rating?: number
            ratingCount?: number
          }
        }
      | null
    >()

    if (!match) {
      return { status: 'not-found' as const }
    }

    if ((match.ratedByAccountIds ?? []).includes(accountId)) {
      return { status: 'already-rated' as const }
    }

    const currentAverage = match.engagement?.rating ?? 0
    const currentCount = match.engagement?.ratingCount ?? 0
    const nextCount = currentCount + 1
    const nextAverage = (currentAverage * currentCount + rating) / nextCount

    const updated = await MatchModel.findOneAndUpdate(
      { id: matchId, ratedByAccountIds: { $ne: accountId } },
      {
        $set: {
          'engagement.rating': Number(nextAverage.toFixed(2)),
          'engagement.ratingCount': nextCount,
        },
        $addToSet: { ratedByAccountIds: accountId },
      },
      { returnDocument: 'after' },
    ).lean()

    if (!updated) {
      return { status: 'already-rated' as const }
    }

    return { status: 'updated' as const, match: updated }
  },
  deleteMatchForTeam: async (matchId: string, teamName: string) => {
    const result = await MatchModel.deleteOne({
      id: matchId,
      createdByTeam: teamName,
    })
    return result.deletedCount > 0
  },
  deleteMatch: async (matchId: string) => {
    const result = await MatchModel.deleteOne({ id: matchId })
    return result.deletedCount > 0
  },
  addFriendlyRequest: async (
    payload: {
    teamName: string
    contact: string
    preferredDate: string
    preferredTime: string
    location: string
    note: string
    referee?: string
    },
    senderAccountId: string,
  ) => {
    const senderAccount = await AccountModel.findById(senderAccountId).lean<AccountDoc | null>()
    if (!senderAccount) {
      throw new Error('You need to be logged in to send a friendly request.')
    }

    const recipientTeamName = payload.teamName.trim()
    const recipientAccountId = await findTeamOwnerAccountId(recipientTeamName)
    if (!recipientAccountId) {
      throw new Error('That team does not have an owner yet.')
    }

    const refereeName = payload.referee?.trim() || ''
    const refereeAccount = refereeName
      ? await AccountModel.findOne({
          name: new RegExp(`^${refereeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
          role: 'referee',
        }).lean<AccountDoc | null>()
      : null

    const request = await FriendlyRequestModel.create({
      id: makeEntityId(),
      requesterAccountId: senderAccount._id,
      requesterName: senderAccount.name,
      requesterTeam: senderAccount.team,
      recipientAccountId,
      recipientTeam: recipientTeamName,
      contact: payload.contact,
      preferredDate: payload.preferredDate,
      preferredTime: payload.preferredTime,
      location: payload.location,
      note: payload.note,
      referee: refereeName || undefined,
      refereeAccountId: refereeAccount?._id,
      status: 'pending',
      respondedAt: null,
    })

    if (refereeAccount) {
      await createNotification({
        accountId: refereeAccount._id.toString(),
        type: 'referee-booking',
        title: 'You have been booked as referee',
        message: `${senderAccount.name} booked you for ${senderAccount.team} vs ${recipientTeamName} on ${payload.preferredDate} at ${payload.preferredTime}.`,
        relatedFriendlyRequestId: request.id,
      })
    }

    await createNotification({
      accountId: recipientAccountId,
      type: 'friendly-request',
      title: 'New friendly match request',
      message: `${senderAccount.name} wants a friendly against ${recipientTeamName} on ${payload.preferredDate} at ${payload.preferredTime}.`,
      relatedFriendlyRequestId: request.id,
    })

    return request.toObject()
  },
  respondToRefereeBooking: async (
    requestId: string,
    refereeAccountId: string,
    refereeName: string,
    status: 'accepted' | 'declined',
  ) => {
    const request = await FriendlyRequestModel.findOne({ id: requestId }).lean<FriendlyRequestRecord | null>()
    if (!request) {
      return { status: 'not-found' as const }
    }

    const linkedById = request.refereeAccountId?.toString() === refereeAccountId
    const linkedByName =
      Boolean(request.referee) &&
      request.referee!.trim().toLowerCase() === refereeName.trim().toLowerCase()
    if (!linkedById && !linkedByName) {
      return { status: 'forbidden' as const }
    }

    const updated = await FriendlyRequestModel.findOneAndUpdate(
      { id: requestId },
      { refereeStatus: status, refereeRespondedAt: new Date().toISOString() },
      { returnDocument: 'after' },
    ).lean<FriendlyRequestRecord | null>()

    if (!updated) {
      return { status: 'not-found' as const }
    }

    const message =
      status === 'accepted'
        ? `${refereeName} confirmed they will referee ${request.requesterTeam} vs ${request.recipientTeam} on ${request.preferredDate}.`
        : `${refereeName} can no longer referee ${request.requesterTeam} vs ${request.recipientTeam} on ${request.preferredDate}.`

    for (const accountId of [request.requesterAccountId, request.recipientAccountId]) {
      if (accountId && mongoose.isValidObjectId(accountId.toString())) {
        await createNotification({
          accountId: accountId.toString(),
          type: status === 'accepted' ? 'friendly-accepted' : 'friendly-declined',
          title: status === 'accepted' ? 'Referee confirmed' : 'Referee unavailable',
          message,
          relatedFriendlyRequestId: requestId,
        })
      }
    }

    return { status: 'updated' as const, booking: updated }
  },
  submitRefereeReport: async (
    requestId: string,
    refereeAccountId: string,
    refereeName: string,
    payload: { homeScore: number; awayScore: number; notes?: string },
  ) => {
    const request = await FriendlyRequestModel.findOne({ id: requestId }).lean<FriendlyRequestRecord | null>()
    if (!request) {
      return { status: 'not-found' as const }
    }

    const linkedById = request.refereeAccountId?.toString() === refereeAccountId
    const linkedByName =
      Boolean(request.referee) &&
      request.referee!.trim().toLowerCase() === refereeName.trim().toLowerCase()
    if (!linkedById && !linkedByName) {
      return { status: 'forbidden' as const }
    }

    const report = {
      homeScore: payload.homeScore,
      awayScore: payload.awayScore,
      notes: payload.notes?.trim() ?? '',
      createdAt: new Date().toISOString(),
    }

    const updated = await FriendlyRequestModel.findOneAndUpdate(
      { id: requestId },
      { report },
      { returnDocument: 'after' },
    ).lean<FriendlyRequestRecord | null>()

    if (!updated) {
      return { status: 'not-found' as const }
    }

    const result = await ResultModel.create({
      id: makeEntityId(),
      homeTeam: request.requesterTeam,
      awayTeam: request.recipientTeam,
      homeScore: report.homeScore,
      awayScore: report.awayScore,
      venue: request.location,
      playedOn: request.preferredDate,
      reportedBy: `${refereeName} (referee)`,
      engagement: { likes: 0, comments: 0, rating: 0, ratingCount: 0 },
    })

    for (const accountId of [request.requesterAccountId, request.recipientAccountId]) {
      if (accountId && mongoose.isValidObjectId(accountId.toString())) {
        await createNotification({
          accountId: accountId.toString(),
          type: 'friendly-accepted',
          title: 'Match report submitted',
          message: `${refereeName} reported ${request.requesterTeam} ${report.homeScore} - ${report.awayScore} ${request.recipientTeam}.`,
          relatedFriendlyRequestId: requestId,
        })
      }
    }

    return { status: 'updated' as const, booking: updated, result: result.toObject() }
  },
  acceptFriendlyRequest: async (requestId: string, ownerAccountId: string) => {
    const request = await FriendlyRequestModel.findOne({ id: requestId }).lean<FriendlyRequestRecord | null>()
    if (!request || request.recipientAccountId.toString() !== ownerAccountId) {
      return null
    }

    const updatedRequest = await FriendlyRequestModel.findOneAndUpdate(
      { id: requestId, recipientAccountId: ownerAccountId, status: 'pending' },
      {
        status: 'accepted',
        respondedAt: new Date().toISOString(),
      },
      { returnDocument: 'after' },
    ).lean<FriendlyRequestRecord | null>()

    if (!updatedRequest) {
      return null
    }

    const match = await MatchModel.create({
      id: makeEntityId(),
      homeTeam: updatedRequest.requesterTeam,
      awayTeam: updatedRequest.recipientTeam,
      venue: updatedRequest.location,
      kickoff: buildKickoffIso(updatedRequest.preferredDate, updatedRequest.preferredTime),
      durationMinutes: 90,
      category: 'Friendly',
      sport: 'Football',
      createdByTeam: updatedRequest.recipientTeam,
      createdByAccountId: ownerAccountId,
      status: 'scheduled',
      comments: [],
      engagement: {
        likes: 0,
        comments: 0,
        rating: 0,
        ratingCount: 0,
      },
    })

    await createNotification({
      accountId: updatedRequest.requesterAccountId.toString(),
      type: 'friendly-accepted',
      title: 'Friendly request accepted',
      message: `${updatedRequest.recipientTeam} accepted your friendly request. The match is now scheduled at ${updatedRequest.location}.`,
      relatedFriendlyRequestId: updatedRequest.id,
      relatedMatchId: match.id,
    })

    return { request: updatedRequest, match: match.toObject() }
  },
  declineFriendlyRequest: async (requestId: string, ownerAccountId: string) => {
    const updatedRequest = await FriendlyRequestModel.findOneAndUpdate(
      { id: requestId, recipientAccountId: ownerAccountId, status: 'pending' },
      {
        status: 'declined',
        respondedAt: new Date().toISOString(),
      },
      { returnDocument: 'after' },
    ).lean<FriendlyRequestRecord | null>()

    if (!updatedRequest) {
      return null
    }

    await createNotification({
      accountId: updatedRequest.requesterAccountId.toString(),
      type: 'friendly-declined',
      title: 'Friendly request declined',
      message: `${updatedRequest.recipientTeam} declined your friendly request.`,
      relatedFriendlyRequestId: updatedRequest.id,
    })

    return updatedRequest
  },
  updateFriendlyRequestStatus: async (
    requestId: string,
    status: 'pending' | 'accepted' | 'declined',
    accountId: string,
  ) => {
    if (status === 'accepted') {
      const accepted = await store.acceptFriendlyRequest(requestId, accountId)
      return accepted ? accepted.request : null
    }

    if (status === 'declined') {
      return store.declineFriendlyRequest(requestId, accountId)
    }

    // Re-open a request: only a participant may reset it back to pending.
    return FriendlyRequestModel.findOneAndUpdate(
      {
        id: requestId,
        $or: [{ requesterAccountId: accountId }, { recipientAccountId: accountId }],
      },
      { status: 'pending', respondedAt: null },
      { returnDocument: 'after' },
    ).lean<FriendlyRequestRecord | null>()
  },
}
