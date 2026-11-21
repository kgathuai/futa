export const SPORTS = [
  'Football',
  'Handball',
  'Volleyball',
  'Basketball',
  'Rugby',
  'Tennis',
  'Paddle Tennis',
  'Table Tennis',
  'Pool Table',
  'Darts',
  'Golf',
  'Chess',
  'Fifa',
] as const

export type Sport = (typeof SPORTS)[number]

/** Sports filters shown on Home and Tournaments, including the reset option. */
export const SPORT_FILTERS = ['All sports', ...SPORTS] as const

/** Sports that can be played by an individual rather than a team. */
export const INDIVIDUAL_SPORTS: Sport[] = ['Tennis', 'Table Tennis', 'Pool Table', 'Darts', 'Golf', 'Chess', 'Fifa']

export const isIndividualSport = (sport: string | null | undefined) =>
  INDIVIDUAL_SPORTS.includes((sport ?? '').trim() as Sport)
