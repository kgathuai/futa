import type { FriendlyRequest, NotificationItem, ResultReport, TeamProfile, TournamentItem, TournamentStatus } from '../types'
import type { TeamSummary } from '../types'
import type { MatchAnnouncement } from '../types'

const AUTH_TOKEN_KEY = 'futa_auth_token'

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: RequestMethod
  body?: unknown
  token?: string | null
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the API. Ensure the backend server is running and reachable.')
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
  getTournaments: () => request<TournamentItem[]>('/api/tournaments'),
  getTeam: () => request<TeamProfile | null>('/api/team'),
  getTeams: () => request<{ teams: TeamSummary[] }>('/api/teams'),
  getGrounds: () => request<{ grounds: string[] }>('/api/grounds'),
  getFriendlies: () => request<FriendlyRequest[]>('/api/friendlies'),
  getNotifications: (token: string) => request<NotificationItem[]>('/api/notifications', { token }),
  markNotificationRead: (notificationId: string, token: string) =>
    request<NotificationItem>(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
      token,
    }),
  register: (payload: { name: string; team: string; role: string; sport: string; email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; team: string; role: string; sport: string; email: string } }>('/api/auth/register', {
      method: 'POST',
      body: payload,
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; team: string; role: string; sport: string; email: string } }>('/api/auth/login', {
      method: 'POST',
      body: payload,
    }),
  me: (token: string) =>
    request<{ user: { id: string; name: string; team: string; role: string; sport: string; email: string } }>('/api/auth/me', {
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
      venue: string
      status: TournamentStatus
      registeredTeams?: string[]
    },
    token: string,
  ) =>
    request<TournamentItem>('/api/tournaments', {
      method: 'POST',
      body: payload,
      token,
    }),
  registerTournamentTeam: (tournamentId: string, token: string) =>
    request<TournamentItem>(`/api/tournaments/${tournamentId}/register`, {
      method: 'POST',
      token,
    }),
  createFriendly: (
    payload: {
      homeTeam: string
      awayTeam: string
      preferredDate: string
      contactPerson: string
      phoneNumber: string
      email: string
    },
    token: string,
  ) =>
    request('/api/friendlies', {
      method: 'POST',
      body: payload,
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
  updateMatchKickoff: (matchId: string, kickoff: string, token: string) =>
    request<MatchAnnouncement>(`/api/matches/${matchId}/kickoff`, {
      method: 'PATCH',
      body: { kickoff },
      token,
    }),
  updateMatchScore: (matchId: string, homeScore: number, awayScore: number, token: string) =>
    request<MatchAnnouncement>(`/api/matches/${matchId}/score`, {
      method: 'PATCH',
      body: { homeScore, awayScore },
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
