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
  'FIFA',
] as const

export type Sport = (typeof SPORTS)[number]

/** Sports that can be played by an individual rather than a team. */
export const INDIVIDUAL_SPORTS: Sport[] = ['Tennis', 'Table Tennis', 'Pool Table', 'Darts', 'Golf', 'Chess', 'FIFA']

export const isIndividualSport = (sport: string | null | undefined) =>
  INDIVIDUAL_SPORTS.includes((sport ?? '').trim() as Sport)
