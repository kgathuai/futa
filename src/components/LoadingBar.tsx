import { Box, LinearProgress } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'

/** The single luminous green used for every loading indicator. */
export const LOADING_GREEN = '#4ce3a3'

const GLOW = '0 0 10px rgba(76,227,163,0.85), 0 0 22px rgba(76,227,163,0.45)'

/**
 * App-wide indeterminate progress bar. Render it inline wherever data is still
 * loading, or pass `fixed` to pin it to the top of the viewport during requests.
 *
 * The bar sweeps the whole track (left edge → right edge) instead of MUI's
 * default short segment, so it visibly runs end to end.
 */
export function LoadingBar({
  fixed = false,
  height = 4,
  sx,
  label = 'Loading…',
}: {
  fixed?: boolean
  height?: number
  sx?: SxProps<Theme>
  label?: string
}) {
  const progress = (
    <LinearProgress
      aria-label={label}
      sx={[
        {
          height,
          borderRadius: fixed ? 0 : 999,
          bgcolor: 'rgba(76,227,163,0.18)',
          overflow: 'hidden',
          '& .MuiLinearProgress-bar': {
            bgcolor: LOADING_GREEN,
            boxShadow: GLOW,
            width: '100%',
            transformOrigin: 'left center',
            animation: 'futa-bar-fill 1.35s cubic-bezier(0.35, 0, 0.35, 1) infinite',
          },
          '& .MuiLinearProgress-bar2': {
            display: 'none',
            animation: 'none',
          },
          // The green fill grows from the left edge until it covers the full width.
          '@keyframes futa-bar-fill': {
            '0%': { transform: 'scaleX(0)' },
            '70%': { transform: 'scaleX(1)' },
            '100%': { transform: 'scaleX(1)' },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )

  if (!fixed) {
    return progress
  }

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000, width: '100%' }}>
      {progress}
    </Box>
  )
}
