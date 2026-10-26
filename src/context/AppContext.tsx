import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useState,
} from 'react'
import type {
  CommunityComment,
  FriendlyRequest,
  MatchAnnouncement,
  ResultReport,
  TeamProfile,
} from '../types'
import { api } from '../lib/api'

interface NewFriendlyRequest {
  teamName: string
  contact: string
  preferredDate: string
  preferredTime: string
  location: string
  note: string
}

interface NewResultReport {
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
}

interface NewTeamProfile {
  name: string
  manager: string
  county: string
  homeGround: string
  level: TeamProfile['level']
  bio: string
  logoUrl?: string
}

interface AppContextValue {
  team: TeamProfile
  matches: MatchAnnouncement[]
  friendlies: FriendlyRequest[]
  comments: CommunityComment[]
  results: ResultReport[]
  addComment: (
    author: string,
    phoneNumber: string,
    teamName: string,
    message: string,
  ) => void
  addFriendlyRequest: (payload: NewFriendlyRequest) => void
  addResultReport: (payload: NewResultReport) => Promise<void>
  createTeam: (payload: NewTeamProfile) => Promise<void>
  refreshTeam: () => Promise<void>
  updateMatch: (updated: MatchAnnouncement) => void
  removeMatch: (matchId: string) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

const makeId = () => `${Date.now()}-${Math.floor(Math.random() * 10_000)}`

export function AppProvider({ children }: PropsWithChildren) {
  const [matches, setMatches] = useState<MatchAnnouncement[]>([])
  const [team, setTeam] = useState<TeamProfile>({
    name: '',
    manager: '',
    county: '',
    homeGround: '',
    level: 'Amateur',
    bio: '',
  })
  const [friendlies, setFriendlies] = useState<FriendlyRequest[]>([])
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [results, setResults] = useState<ResultReport[]>([])

  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const [remoteMatches, remoteResults, remoteTeam, remoteFriendlies] = await Promise.all([
          api.getMatches() as Promise<MatchAnnouncement[]>,
          api.getResults() as Promise<ResultReport[]>,
          api.getTeam() as Promise<TeamProfile | null>,
          api.getFriendlies() as Promise<FriendlyRequest[]>,
        ])

        setMatches(remoteMatches)
        setResults(remoteResults)
        setFriendlies(remoteFriendlies)
        if (remoteTeam) {
          setTeam(remoteTeam)
        }
      } catch {
        // Keep seeded local state when backend is unavailable.
      }
    }

    void loadBackendData()
  }, [])

  const addComment = useCallback(
    (
      author: string,
      phoneNumber: string,
      teamName: string,
      message: string,
    ) => {
      const safeAuthor = author.trim()
      const safePhoneNumber = phoneNumber.trim()
      const safeTeamName = teamName.trim()
      const safeMessage = message.trim()
      if (!safeAuthor || !safePhoneNumber || !safeTeamName || !safeMessage) {
        return
      }

      setComments((prev) => [
        {
          id: makeId(),
          author: safeAuthor,
          phoneNumber: safePhoneNumber,
          teamName: safeTeamName,
          message: safeMessage,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
    },
    [],
  )

  const addFriendlyRequest = useCallback((payload: NewFriendlyRequest) => {
    setFriendlies((prev) => [
      {
        id: makeId(),
        requesterAccountId: 'local',
        requesterName: 'Local user',
        requesterTeam: payload.teamName,
        recipientAccountId: 'local',
        recipientTeam: payload.teamName,
        contact: payload.contact,
        preferredDate: payload.preferredDate,
        preferredTime: payload.preferredTime,
        location: payload.location,
        note: payload.note,
        status: 'pending',
        createdAt: new Date().toISOString(),
        respondedAt: null,
      },
      ...prev,
    ])
  }, [])

  const addResultReport = useCallback(async (payload: NewResultReport) => {
    const token = api.getToken()
    if (!token) {
      throw new Error('Please log in before submitting a result.')
    }

    const created = (await api.createResult({
      ...payload,
      engagement: payload.engagement ?? {
        likes: 0,
        comments: 0,
        rating: 0,
        ratingCount: 0,
      },
    }, token)) as ResultReport

    setResults((prev) => [created, ...prev])
  }, [])

  const createTeam = useCallback(async (payload: NewTeamProfile) => {
    const token = api.getToken()
    if (!token) {
      throw new Error('Please log in first.')
    }

    const response = await api.createTeam(
      {
        name: payload.name,
        manager: payload.manager,
        county: payload.county,
        homeGround: payload.homeGround,
        level: payload.level,
        bio: payload.bio,
        logoUrl: payload.logoUrl,
      },
      token,
    )

    setTeam(response.team)
  }, [])

  const refreshTeam = useCallback(async () => {
    try {
      const remoteTeam = await api.getTeam()
      if (remoteTeam) {
        setTeam(remoteTeam)
      }
    } catch {
      // Keep the current profile when the backend is unavailable.
    }
  }, [])

  const updateMatch = useCallback((updated: MatchAnnouncement) => {
    setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }, [])

  const removeMatch = useCallback((matchId: string) => {
    setMatches((prev) => prev.filter((match) => match.id !== matchId))
  }, [])

  const value = useMemo(
    () => ({
      team,
      matches,
      friendlies,
      comments,
      results,
      addComment,
      addFriendlyRequest,
      addResultReport,
      createTeam,
      refreshTeam,
      updateMatch,
      removeMatch,
    }),
    [
      addComment,
      addFriendlyRequest,
      addResultReport,
      comments,
      createTeam,
      friendlies,
      matches,
      refreshTeam,
      removeMatch,
      results,
      team,
      updateMatch,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppData() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppData must be used within AppProvider')
  }

  return context
}
