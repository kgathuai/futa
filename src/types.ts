export type TeamLevel = 'Junior' | 'Amateur' | 'Semi-Pro'

export type TournamentStatus = 'upcoming' | 'registration open' | 'ongoing' | 'finished'

export type TournamentType = 'open' | 'closed'

export interface TournamentItem {
  id: string
  sport: string
  format: string
  name: string
  period: string
  startDate?: string
  endDate?: string
  venue: string
  status: TournamentStatus
  type?: TournamentType
  ownerTeam?: string
  registeredTeams: string[]
  maxTeams?: number
  entryFee?: number
}

export interface TournamentPayment {
  id: string
  tournamentId: string
  team: string
  amount: number
  phone?: string
  status: 'pending' | 'paid' | 'failed'
  provider: string
  reference?: string
  receipt?: string
  notes?: string
  createdAt: string
  paidAt?: string | null
}

export interface MatchCommentReply {
  id: string
  text: string
  authorName: string
  likes: number
  likedByMe?: boolean
  createdAt: string
}

export interface MatchComment {
  id: string
  text: string
  authorName: string
  likes: number
  likedByMe?: boolean
  createdAt: string
  replies: MatchCommentReply[]
}

export interface MatchGoal {
  id: string
  team: string
  scorer: string
  assist?: string
}

export type MatchGoalInput = Omit<MatchGoal, 'id'>

export interface RescheduleRequest {
  id: string
  matchId: string
  requestedBy: string
  currentKickoff: string
  newKickoff: string
  reason?: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export interface MatchEvent {
  id: string
  team: string
  type: 'goal' | 'yellow' | 'red' | 'sub'
  player: string
  assist?: string
  minute?: number
  note?: string
  createdAt: string
}

export interface MatchAnnouncement {
  id: string
  homeTeam: string
  awayTeam: string
  venue: string
  kickoff: string
  durationMinutes?: number
  homeScore?: number
  awayScore?: number
  category: 'League' | 'Friendly' | 'Cup'
  sport: 'Football' | 'Handball' | 'Volleyball' | 'Basketball' | 'Rugby' | 'Tennis' | 'Pool Table'
  createdByTeam?: string
  createdByAccountId?: string
  likedByMe?: boolean
  ratedByMe?: boolean
  status: 'scheduled' | 'playing' | 'finished' | 'postponed'
  comments: MatchComment[]
  goals?: MatchGoal[]
  events?: MatchEvent[]
  tournamentId?: string
  round?: number
  engagement: {
    likes: number
    comments: number
    rating: number
    ratingCount: number
  }
}

export interface FriendlyRequest {
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

export interface Player {
  id: string
  team: string
  name: string
  number?: number
  position?: string
  createdAt?: string
}

export interface RefereeSummary {
  id: string
  name: string
}

export interface NotificationItem {
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

export interface CommunityComment {
  id: string
  author: string
  phoneNumber: string
  teamName: string
  message: string
  createdAt: string
}

export interface ResultReport {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  venue: string
  playedOn: string
  reportedBy: string
  engagement: {
    likes: number
    comments: number
    rating: number
    ratingCount: number
  }
}

export interface TeamProfile {
  name: string
  manager: string
  county: string
  homeGround: string
  level: TeamLevel
  bio: string
  logoUrl?: string
  ownerAccountId?: string
}

export interface TeamSummary {
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

export interface AdminAccount {
  id: string
  name: string
  team: string
  county?: string
  homeGround?: string
  role: string
  sport: string
  email: string
  createdAt?: string | null
}
