import { Button, Stack } from '@mui/material'
import { SPORT_FILTERS } from '../lib/sports'

export interface SportFilterBarProps {
  selected: string
  onSelect: (sport: string) => void
  ariaLabel?: string
}

/**
 * Shared sport filter row — a single horizontally scrolling line of pill
 * buttons, identical on Home and Tournaments.
 */
export function SportFilterBar({ selected, onSelect, ariaLabel = 'Sport filters' }: SportFilterBarProps) {
  return (
    <Stack
      direction="row"
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        pb: 0.4,
      }}
    >
      <Stack
        direction="row"
        spacing={{ xs: 0.7, sm: 0.9 }}
        sx={{
          mx: 'auto',
          '& > *': { flexShrink: 0 },
        }}
      >
      {SPORT_FILTERS.map((sport) => (
        <Button
          key={sport}
          type="button"
          onClick={() => onSelect(sport)}
          aria-pressed={sport === selected}
          variant="contained"
          sx={{
            flex: '0 0 auto',
            width: 'auto',
            minWidth: 'auto',
            whiteSpace: 'nowrap',
            borderRadius: 999,
            px: { xs: 1.1, sm: 1.4 },
            py: 0.55,
            fontSize: { xs: '0.66rem', sm: '0.75rem' },
            cursor: 'pointer',
            color: sport === selected ? '#07111f' : '#e7ebf3',
            backgroundColor: sport === selected ? '#4ce3a3' : '#2d3545',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: sport === selected ? '#4ce3a3' : '#3a4558',
              boxShadow: 'none',
            },
          }}
        >
          {sport}
        </Button>
      ))}
      </Stack>
    </Stack>
  )
}
