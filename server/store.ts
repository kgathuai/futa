import crypto from 'node:crypto'
import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import type { TeamLevel, TournamentItem, TournamentStatus } from '../src/types.ts'

export interface AccountRecord {
  id: string
  name: string
  team: string
  role: string
  sport: string
  email: string
  password: string
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
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  respondedAt?: string | null
}

export interface NotificationRecord {
  id: string
  accountId: string
  type: 'friendly-request' | 'friendly-accepted' | 'friendly-declined'
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
    status: { type: String, required: true },
    comments: [{ type: String, required: true }],
    engagement: { type: engagementSchema, required: true },
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
    venue: { type: String, required: true },
    status: { type: String, required: true },
    ownerTeam: { type: String, required: false },
    registeredTeams: { type: [String], required: true, default: [] },
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

const accountSchema = new Schema(
  {
    name: { type: String, required: true },
    team: { type: String, required: true },
    role: { type: String, required: true },
    sport: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { versionKey: false, timestamps: true },
)

const sessionSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    accountId: { type: Schema.Types.ObjectId, required: true, ref: 'Account' },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
)


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
    status: { type: String, required: true, default: 'pending' },
    respondedAt: { type: String, required: false },
  },
  { versionKey: false, timestamps: true },
)

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

const MatchModel = mongoose.models.Match || mongoose.model('Match', matchSchema)
const ResultModel = mongoose.models.Result || mongoose.model('Result', resultSchema)
const TournamentModel = mongoose.models.Tournament || mongoose.model('Tournament', tournamentSchema)
const TeamModel = mongoose.models.Team || mongoose.model('Team', teamSchema)
const AccountModel = mongoose.models.Account || mongoose.model('Account', accountSchema)
const SessionModel = mongoose.models.Session || mongoose.model('Session', sessionSchema)
const FriendlyRequestModel = mongoose.models.FriendlyRequest || mongoose.model('FriendlyRequest', friendlyRequestSchema)
const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)

type AccountDoc = InferSchemaType<typeof accountSchema> & { _id: mongoose.Types.ObjectId }

type SessionDoc = InferSchemaType<typeof sessionSchema> & { accountId: mongoose.Types.ObjectId }

const toPublicAccount = (account: AccountDoc): AccountRecord => ({
  id: account._id.toString(),
  name: account.name,
  team: account.team,
  role: account.role,
  sport: account.sport,
  email: account.email,
  password: account.password,
})

const makeEntityId = () => `${Date.now()}-${Math.floor(Math.random() * 10_000)}`

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
  getMatches: async () => MatchModel.find().sort({ kickoff: 1 }).lean(),
  getMatchesForTeam: async (teamName: string) =>
    MatchModel.find({ $or: [{ homeTeam: teamName }, { awayTeam: teamName }] }).sort({ kickoff: 1 }).lean(),
  getMatchForTeam: async (matchId: string, teamName: string) =>
    MatchModel.findOne({ id: matchId, $or: [{ homeTeam: teamName }, { awayTeam: teamName }] }).lean(),
  getResults: async () => ResultModel.find().sort({ playedOn: -1 }).lean(),
  getTournaments: async () => TournamentModel.find().sort({ createdAt: -1 }).lean<TournamentRecord[]>(),
  getTeam: async () => TeamModel.findOne().sort({ updatedAt: -1 }).lean(),
  getTeams: async () => {
    const [accountTeams, savedTeams] = await Promise.all([
      AccountModel.distinct('team'),
      TeamModel.find({}, { name: 1, logoUrl: 1, _id: 0 }).lean<Array<{ name?: string; logoUrl?: string }>>(),
    ])

    const teamsByName = new Map<string, { name: string; logoUrl?: string }>()
    for (const teamName of accountTeams) {
      const trimmed = teamName?.trim()
      if (trimmed) {
        teamsByName.set(trimmed, { name: trimmed })
      }
    }

    for (const team of savedTeams) {
      const trimmed = team.name?.trim()
      if (trimmed) {
        teamsByName.set(trimmed, { name: trimmed, logoUrl: team.logoUrl?.trim() || undefined })
      }
    }

    return Array.from(teamsByName.values()).sort((a, b) => a.name.localeCompare(b.name))
  },
  getGrounds: async () => {
    const [venues, homeGrounds] = await Promise.all([
      MatchModel.distinct('venue'),
      TeamModel.find({}, { homeGround: 1, _id: 0 }).lean<Array<{ homeGround?: string }>>(),
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

    return Array.from(grounds).sort((a, b) => a.localeCompare(b))
  },
  setTeam: async (payload: TeamPayload, ownerAccountId: string) => {
    const updated = await TeamModel.findOneAndUpdate(
      {},
      {
        name: payload.name.trim(),
        manager: payload.manager.trim(),
        county: payload.county.trim(),
        homeGround: payload.homeGround.trim(),
        level: payload.level,
        bio: payload.bio.trim(),
        logoUrl: payload.logoUrl?.trim() || undefined,
        ownerAccountId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean()

    return updated
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
      role: payload.role,
      sport: payload.sport,
      email: payload.email.toLowerCase(),
      password: payload.password,
    })

    return toPublicAccount(account.toObject() as AccountDoc)
  },
  createSession: async (accountId: string) => {
    const session = await SessionModel.create({
      token: crypto.randomUUID(),
      accountId,
      createdAt: new Date(),
    })

    return {
      token: session.token,
      accountId: session.accountId.toString(),
      createdAt: session.createdAt.toISOString(),
    } satisfies SessionRecord
  },
  getSession: async (token: string) => {
    const session = await SessionModel.findOne({ token }).lean<SessionDoc | null>()
    if (!session) {
      return null
    }

    return {
      token: session.token,
      accountId: session.accountId.toString(),
      createdAt: session.createdAt.toISOString(),
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
      { new: true },
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
    venue: string
    status: TournamentStatus
    ownerTeam?: string
    registeredTeams?: string[]
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
      venue: payload.venue,
      status: payload.status,
      ownerTeam: payload.ownerTeam?.trim() || undefined,
      registeredTeams,
    })

    return tournament.toObject() as TournamentRecord
  },
  registerTeamForTournament: async (tournamentId: string, teamName: string) => {
    const safeTeamName = teamName.trim()
    if (!safeTeamName) {
      return null
    }

    return TournamentModel.findOneAndUpdate(
      { id: tournamentId },
      { $addToSet: { registeredTeams: safeTeamName } },
      { new: true },
    ).lean<TournamentRecord | null>()
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
      status: 'scheduled',
      comments: payload.comment?.trim() ? [payload.comment.trim()] : ['Match announced.'],
      engagement: {
        likes: 0,
        comments: 0,
        rating: 0,
        ratingCount: 0,
      },
    })

    return match.toObject()
  },
  getFriendlyRequests: async () => {
    return FriendlyRequestModel.find().sort({ createdAt: -1 }).lean()
  },
  updateMatchKickoff: async (matchId: string, teamName: string, kickoff: string) => {
    return MatchModel.findOneAndUpdate(
      {
        id: matchId,
        $or: [{ homeTeam: teamName }, { awayTeam: teamName }],
      },
      { kickoff },
      { new: true },
    ).lean()
  },
  updateMatchScore: async (matchId: string, teamName: string, homeScore: number, awayScore: number) => {
    return MatchModel.findOneAndUpdate(
      {
        id: matchId,
        $or: [{ homeTeam: teamName }, { awayTeam: teamName }],
      },
      {
        homeScore,
        awayScore,
        status: 'played',
      },
      { new: true },
    ).lean()
  },
  deleteMatchForTeam: async (matchId: string, teamName: string) => {
    const result = await MatchModel.deleteOne({
      id: matchId,
      $or: [{ homeTeam: teamName }, { awayTeam: teamName }],
    })
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
      status: 'pending',
      respondedAt: null,
    })

    await createNotification({
      accountId: recipientAccountId,
      type: 'friendly-request',
      title: 'New friendly match request',
      message: `${senderAccount.name} wants a friendly against ${recipientTeamName} on ${payload.preferredDate} at ${payload.preferredTime}.`,
      relatedFriendlyRequestId: request.id,
    })

    return request.toObject()
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
      { new: true },
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
      { new: true },
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
}
