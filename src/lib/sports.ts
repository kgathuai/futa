export const SPORTS = [
  'Football',
  'Handball',
  'Volleyball',
  'Basketball',
  'Rugby',
  'Tennis',
  'Pool Table',
] as const

export type Sport = (typeof SPORTS)[number]

/** Sports that can be played by an individual rather than a team. */
export const INDIVIDUAL_SPORTS: Sport[] = ['Tennis', 'Pool Table']

export const isIndividualSport = (sport: string | null | undefined) =>
  INDIVIDUAL_SPORTS.includes((sport ?? '').trim() as Sport)
