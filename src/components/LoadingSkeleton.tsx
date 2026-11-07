import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material'

/** MUI skeleton used while a list or card is loading. */
export function RowSkeleton({ rows = 3, height = 54 }: { rows?: number; height?: number }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={height} sx={{ borderRadius: 1.6 }} />
      ))}
    </Stack>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.4, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} variant="outlined">
          <CardContent>
            <Skeleton variant="text" width="45%" height={18} />
            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', my: 1.2 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Skeleton variant="text" width="60%" height={26} />
              <Skeleton variant="circular" width={36} height={36} />
            </Stack>
            <Skeleton variant="text" width="70%" height={16} />
            <Skeleton variant="rounded" height={34} sx={{ mt: 1, borderRadius: 1.4 }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Stack spacing={0.8}>
      <Skeleton variant="rounded" height={28} sx={{ borderRadius: 1 }} />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={42} sx={{ borderRadius: 1 }} />
      ))}
    </Stack>
  )
}
