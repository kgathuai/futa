import { Card, CardContent, Stack, Typography } from '@mui/material'

export function ChatPage() {
  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Community Chat
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Chat cards were removed. You can re-enable chat threads anytime.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  )
}
