import type { AdminAccount, FriendlyRequest, MatchGoalInput, NotificationItem, Player, RefereeSummary, RescheduleRequest, ResultReport, TeamProfile, TournamentItem, TournamentPayment, TournamentStatus } from '../types'
import type { TeamSummary } from '../types'
import type { MatchAnnouncement } from '../types'

export interface AuthUser {
  id: string
  name: string
  team: string
  county?: string
  homeGround?: string
  role: string
  sport: string
  email: string
  avatar?: string
  emailVerified?: boolean
}

const AUTH_TOKEN_KEY = 'futa_auth_token'
const loadingListeners = new Set<(loading: boolean) => void>()
const apiBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env.VITE_API_BASE_URL) || ''
let activeRequests = 0

const setRequestLoading = (loading: boolean) => {
  activeRequests += loading ? 1 : -1
  const isLoading = activeRequests > 0
  loadingListeners.forEach((listener) => listener(isLoading))
}

export const subscribeToApiLoading = (listener: (loading: boolean) => void) => {
  loadingListeners.add(listener)
  listener(activeRequests > 0)
  return () => {
    loadingListeners.delete(listener)
  }
}

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: RequestMethod
  body?: unknown
  token?: string | null
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response
  const url = path.startsWith('http') ? path : `${apiBaseUrl}${path}`

  try {
    setRequestLoading(true)
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    setRequestLoading(false)
    throw new Error('Cannot reach the API. Ensure the backend server is running and reachable.')
  }
  setRequestLoading(false)

  if (response.status === 401) {
    const isAuthAttempt =
      path.includes('/api/auth/login') || path.includes('/api/auth/register')
    if (!isAuthAttempt && typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      window.dispatchEvent(new Event('futa:unauthorized'))
    }
  }

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null
    if (errorPayload?.error) {
      throw new Error(errorPayload.error)
    }

    if (response.status === 502) {
      throw new Error('Request failed: 502. Backend is unavailable. Ensure MongoDB and the API server are running.')
    }

    throw new Error(`Request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const api = {
  getToken: () => localStorage.getItem(AUTH_TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(AUTH_TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(AUTH_TOKEN_KEY),
  getMatches: () => request<MatchAnnouncement[]>('/api/matches', { token: localStorage.getItem(AUTH_TOKEN_KEY) }),
  getMyMatches: (token: string) => request<MatchAnnouncement[]>('/api/matches/my', { token }),
  createMatch: (
    payload: {
      awayTeam: string
      venue: string
      kickoff: string
      durationMinutes: number
      category: 'League' | 'Friendly' | 'Cup'
      sport: 'Football' | 'Handball' | 'Volleyball' | 'Basketball' | 'Rugby' | 'Tennis' | 'Pool Table'
      comment?: string
    },
    token: string,
  ) =>
    request<MatchAnnouncement>('/api/matches', {
      method: 'POST',
      body: payload,
      token,
    }),
  getResults: () => request<ResultReport[]>('/api/results'),
  getTournamentPayments: (tournamentId: string, token: string) =>
    request<{ payments: TournamentPayment[]; entryFee: number; mpesaConfigured: boolean }>(
      `/api/tournaments/${encodeURIComponent(tournamentId)}/payments`,
      { token },
    ),
  payTournamentEntry: (tournamentId: string, phone: string, token: string) =>
    request<{ payment: TournamentPayment | null; mpesa: { initiated: boolean; message?: string }; message?: string }>(
      `/api/tournaments/${encodeURIComponent(tournamentId)}/payments`,
      { method: 'POST', body: { phone }, token },
    ),
  confirmTournamentPayment: (paymentId: string, token: string, receipt?: string) =>
    request<{ payment: TournamentPayment }>(
      `/api/payments/${encodeURIComponent(paymentId)}/confirm`,
      { method: 'POST', body: { receipt }, token },
    ),
  getTournaments: () => request<TournamentItem[]>('/api/tournaments'),
  getTeam: (token: string | null = localStorage.getItem(AUTH_TOKEN_KEY)) =>
    request<TeamProfile | null>('/api/team', { token }),
  getTeams: () => request<{ teams: TeamSummary[] }>('/api/teams'),
  getGrounds: () => request<{ grounds: string[] }>('/api/grounds'),
  getAdminAccounts: (token: string) => request<AdminAccount[]>('/api/admin/accounts', { token }),
  createAccount: (
    payload: {
      name: string
      team: string
      county: string
      homeGround: string
      role: string
      sport: string
      email: string
      password: string
    },
    token: string,
  ) =>
    request<AdminAccount>('/api/admin/accounts', {
      method: 'POST',
      body: payload,
      token,
    }),
  updateAccountRole: (accountId: string, role: string, token: string) =>
    request<AdminAccount>(`/api/admin/accounts/${accountId}/role`, {
      method: 'PATCH',
      body: { role },
      token,
    }),
  deleteAccount: (accountId: string, token: string) =>
    request<void>(`/api/admin/accounts/${accountId}`, {
      method: 'DELETE',
      token,
    }),
  getFriendlies: () => request<FriendlyRequest[]>('/api/friendlies'),
  getReferees: () => request<{ referees: RefereeSummary[] }>('/api/referees'),
  getFollowedTeams: (token: string) => request<{ teams: string[] }>('/api/follows', { token }),
  followTeam: (team: string, token: string) =>
    request<{ team: string }>('/api/follows', { method: 'POST', body: { team }, token }),
  unfollowTeam: (team: string, token: string) =>
    request<void>(`/api/follows/${encodeURIComponent(team)}`, { method: 'DELETE', token }),
  getSquad: (team: string) =>
    request<{ squad: Player[] }>(`/api/squad?team=${encodeURIComponent(team)}`),
  addPlayer: (payload: { team: string; name: string; number?: number; position?: string }, token: string) =>
    request<{ player: Player }>('/api/squad', { method: 'POST', body: payload, token }),
  deletePlayer: (playerId: string, team: string, token: string) =>
    request<void>(`/api/squad/${encodeURIComponent(playerId)}?team=${encodeURIComponent(team)}`, {
      method: 'DELETE',
      token,
    }),
  getRefereeBookings: (token: string) =>
    request<FriendlyRequest[]>('/api/referee/bookings', { token }),
  respondToRefereeBooking: (bookingId: string, status: 'accepted' | 'declined', token: string) =>
    request<{ booking: FriendlyRequest }>(
      `/api/referee/bookings/${encodeURIComponent(bookingId)}/respond`,
      { method: 'POST', body: { status }, token },
    ),
  submitRefereeReport: (
    bookingId: string,
    payload: { homeScore: number; awayScore: number; notes?: string },
    token: string,
  ) =>
    request<{ booking: FriendlyRequest; result: ResultReport }>(
      `/api/referee/bookings/${encodeURIComponent(bookingId)}/report`,
      { method: 'POST', body: payload, token },
    ),
  getNotifications: (token: string) => request<NotificationItem[]>('/api/notifications', { token }),
  markNotificationRead: (notificationId: string, token: string) =>
    request<NotificationItem>(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
      token,
    }),
  register: (payload: { name: string; team: string; county: string; homeGround: string; role: string; sport: string; email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: payload,
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: payload,
    }),
  forgotPassword: (email: string) =>
    request<{ message: string; deliveryConfigured: boolean }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),
  verifyEmail: (token: string) =>
    request<{ message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: { token },
    }),
  resendVerification: (token: string) =>
    request<{ message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      token,
    }),
  me: (token: string) =>
    request<{ user: AuthUser }>('/api/auth/me', {
      token,
    }),
  updateProfile: (
    payload: { team?: string; county?: string; homeGround?: string; avatar?: string },
    token: string,
  ) =>
    request<{ user: AuthUser }>('/api/auth/me', {
      method: 'PATCH',
      body: payload,
      token,
    }),
  logout: (token: string) =>
    request('/api/auth/logout', {
      method: 'POST',
      token,
    }),
  createTeam: (
    payload: {
      name: string
      manager: string
      county: string
      homeGround: string
      level: 'Junior' | 'Amateur' | 'Semi-Pro'
      bio: string
      logoUrl?: string
    },
    token: string,
  ) => request<{ team: { name: string; manager: string; county: string; homeGround: string; level: 'Junior' | 'Amateur' | 'Semi-Pro'; bio: string; logoUrl?: string } }>('/api/team', {
    method: 'POST',
    body: payload,
    token,
  }),
  createResult: (
    payload: {
      homeTeam: string
      awayTeam: string
      homeScore: number
      awayScore: number
      playedOn: string
      venue: string
      reportedBy: string
      engagement?: {
        likes: number
        comments: number
        rating: number
        ratingCount: number
      }
    },
    token?: string | null,
  ) =>
    request('/api/results', {
      method: 'POST',
      body: payload,
      token,
    }),
  createTournament: (
    payload: {
      sport: string
      format: string
      name: string
      period: string
      startDate?: string
      endDate?: string
      venue: string
      status: TournamentStatus
      type?: 'open' | 'closed'
      registeredTeams?: string[]
      maxTeams?: number
      entryFee?: number
    },
    token: string,
  ) =>
    request<TournamentItem>('/api/tournaments', {
      method: 'POST',
      body: payload,
      token,
    }),
  setTournamentTeams: (tournamentId: string, teams: string[], token: string) =>
    request<TournamentItem>(`/api/tournaments/${tournamentId}/teams`, {
      method: 'PATCH',
      body: { teams },
      token,
    }),
  registerTournamentTeam: (tournamentId: string, token: string) =>
    request<TournamentItem>(`/api/tournaments/${tournamentId}/register`, {
      method: 'POST',
      token,
    }),
  getFixtures: (tournamentId: string) =>
    request<MatchAnnouncement[]>(`/api/tournaments/${tournamentId}/fixtures`, {
      token: localStorage.getItem(AUTH_TOKEN_KEY),
    }),
  generateFixtures: (tournamentId: string, token: string) =>
    request<MatchAnnouncement[]>(`/api/tournaments/${tournamentId}/generate-fixtures`, {
      method: 'POST',
      token,
    }),
  createFriendlyRequest: (
    payload: {
      teamName: string
      contact: string
      preferredDate: string
      preferredTime: string
      location: string
      note: string
      referee?: string
    },
    token?: string | null,
  ) =>
    request('/api/friendlies', {
      method: 'POST',
      body: payload,
      token,
    }),
  acceptFriendlyRequest: (requestId: string, token: string) =>
    request(`/api/friendlies/${requestId}/accept`, {
      method: 'POST',
      token,
    }),
  declineFriendlyRequest: (requestId: string, token: string) =>
    request(`/api/friendlies/${requestId}/decline`, {
      method: 'POST',
      token,
    }),
  updateFriendlyRequestStatus: (requestId: string, status: 'pending' | 'accepted' | 'declined', token: string) =>
    request(`/api/friendlies/${requestId}/status`, {
      method: 'PATCH',
      body: { status },
      token,
    }),
  updateMatchKickoff: (matchId: string, kickoff: string, token: string) =>
    request<MatchAnnouncement>(`/api/matches/${matchId}/kickoff`, {
      method: 'PATCH',
      body: { kickoff },
      token,
    }),
  requestReschedule: (matchId: string, payload: { newKickoff: string; reason?: string }, token: string) =>
    request<RescheduleRequest>(`/api/matches/${encodeURIComponent(matchId)}/reschedule`, {
      method: 'POST',
      body: payload,
      token,
    }),
  getReschedule: (matchId: string) =>
    request<{ request: RescheduleRequest | null }>(
      `/api/matches/${encodeURIComponent(matchId)}/reschedule`,
    ),
  respondReschedule: (requestId: string, accept: boolean, token: string) =>
    request<{ request: RescheduleRequest }>(
      `/api/reschedules/${encodeURIComponent(requestId)}/respond`,
      { method: 'POST', body: { accept }, token },
    ),
  addMatchEvent: (
    matchId: string,
    payload: { type: 'goal' | 'yellow' | 'red' | 'sub'; player: string; assist?: string; minute?: number; note?: string },
    token: string,
  ) =>
    request<MatchAnnouncement>(`/api/matches/${encodeURIComponent(matchId)}/events`, {
      method: 'POST',
      body: payload,
      token,
    }),
  deleteMatchEvent: (matchId: string, eventId: string, token: string) =>
    request<MatchAnnouncement>(
      `/api/matches/${encodeURIComponent(matchId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE', token },
    ),
  updateMatchScore: (
    matchId: string,
    homeScore: number,
    awayScore: number,
    goals: MatchGoalInput[],
    token: string,
  ) =>
    request<MatchAnnouncement>(`/api/matches/${matchId}/score`, {
      method: 'PATCH',
      body: { homeScore, awayScore, goals },
      token,
    }),
  likeMatch: (matchId: string, token: string) =>
    request<MatchAnnouncement>(`/api/matches/${matchId}/like`, {
      method: 'POST',
      token,
    }),
  commentOnMatch: (matchId: string, comment: string, token: string) =>
    request<MatchAnnouncement>(`/api/matches/${matchId}/comment`, {
      method: 'POST',
      body: { comment },
      token,
    }),
  likeMatchComment: (matchId: string, commentId: string, token: string) =>
    request<MatchAnnouncement>(`/api/matches/${matchId}/comments/${commentId}/like`, {
      method: 'POST',
      token,
    }),
  replyToMatchComment: (matchId: string, commentId: string, comment: string, token: string) =>
    request<MatchAnnouncement>(`/api/matches/${matchId}/comments/${commentId}/reply`, {
      method: 'POST',
      body: { comment },
      token,
    }),
  rateMatch: (matchId: string, rating: number, token: string) =>
    request<MatchAnnouncement>(`/api/matches/${matchId}/rate`, {
      method: 'POST',
      body: { rating },
      token,
    }),
  deleteMatch: (matchId: string, token: string) =>
    request(`/api/matches/${matchId}`, {
      method: 'DELETE',
      token,
    }),
}
