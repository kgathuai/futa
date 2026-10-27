import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'

export type Language = 'en' | 'sw'

const STORAGE_KEY = 'futa_language'

const dictionary = {
  en: {
    home: 'Home',
    friendlies: 'Friendlies',
    teams: 'Teams',
    tournaments: 'Tournaments',
    dashboard: 'Dashboard',
    admin: 'Admin',
    account: 'Account',
    accountTab: 'Account',
    notifications: 'Notifications',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    team: 'Team',
    county: 'County / Eneo',
    homeGround: 'Home ground',
    role: 'Role',
    sport: 'Sport',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    loading: 'Loading…',
    language: 'Language',
    schedule: 'Match schedule',
    allFriendlies: 'All Friendlies',
    standings: 'Standings',
    fixtures: 'Fixtures',
    stats: 'Stats',
    played: 'Played',
    upcoming: 'Upcoming',
    live: 'Live',
    teamDashboard: 'Team dashboard',
    archive: 'Archive',
    myTeam: 'My team',
    bookedGames: 'Booked games',
    upcomingGames: 'Upcoming games',
    following: 'Following',
    replies: 'Replies & activity',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign in',
    create: 'Create',
    delete: 'Delete',
    confirm: 'Confirm',
  },
  sw: {
    home: 'Nyumbani',
    friendlies: 'Mechi za Kirafiki',
    teams: 'Timu',
    tournaments: 'Mashindano',
    dashboard: 'Dashibodi',
    admin: 'Msimamizi',
    account: 'Akaunti',
    accountTab: 'Akaunti',
    notifications: 'Taarifa',
    login: 'Ingia',
    register: 'Jisajili',
    logout: 'Toka',
    email: 'Barua pepe',
    password: 'Neno la siri',
    name: 'Jina',
    team: 'Timu',
    county: 'Kaunti / Eneo',
    homeGround: 'Uwanja wa nyumbani',
    role: 'Wajibu',
    sport: 'Mchezo',
    save: 'Hifadhi',
    cancel: 'Ghairi',
    search: 'Tafuta',
    loading: 'Inapakia…',
    language: 'Lugha',
    schedule: 'Ratiba ya mechi',
    allFriendlies: 'Mechi zote za kirafiki',
    standings: 'Msimamo',
    fixtures: 'Ratiba',
    stats: 'Takwimu',
    played: 'Zilizochezwa',
    upcoming: 'Zijazo',
    live: 'Moja kwa moja',
    teamDashboard: 'Dashibodi ya timu',
    archive: 'Kumbukumbu',
    myTeam: 'Timu yangu',
    bookedGames: 'Mechi zilizowekwa',
    upcomingGames: 'Mechi zijazo',
    following: 'Unafuatilia',
    replies: 'Majibu na shughuli',
    forgotPassword: 'Umesahau neno la siri?',
    signIn: 'Ingia',
    create: 'Unda',
    delete: 'Futa',
    confirm: 'Thibitisha',
  },
} as const

export type TranslationKey = keyof typeof dictionary.en

interface I18nValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nValue | undefined>(undefined)

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') {
      return 'en'
    }
    return window.localStorage.getItem(STORAGE_KEY) === 'sw' ? 'sw' : 'en'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language)
      document.documentElement.lang = language
    }
  }, [language])

  const setLanguage = useCallback((next: Language) => setLanguageState(next), [])
  const t = useCallback((key: TranslationKey) => dictionary[language][key] ?? dictionary.en[key], [language])

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used inside a LanguageProvider')
  }
  return context
}
