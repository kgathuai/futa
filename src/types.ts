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
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  respondedAt?: string | null
}

export interface NotificationItem {
  id: string
  accountId: string
  type: 'friendly-request' | 'friendly-accepted' | 'friendly-declined' | 'match-score-reminder'
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
