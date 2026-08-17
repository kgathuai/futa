import { useState } from 'react'
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'

interface CommentFormProps {
  onSubmit: (author: string, phoneNumber: string, teamName: string, message: string) => void
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [author, setAuthor] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [teamName, setTeamName] = useState('')
  const [message, setMessage] = useState('')

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(author, phoneNumber, teamName, message)
        setAuthor('')
        setPhoneNumber('')
        setTeamName('')
        setMessage('')
      }}
    >
      <Card variant="outlined">
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Community chat
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            Add a comment
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              label="Name"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Name"
              required
            />
            <TextField
              label="Phone number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="07..."
              required
            />
            <TextField
              label="Team you play for"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Team name"
              required
            />
            <TextField
              label="Message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Share your thoughts"
              multiline
              rows={3}
              required
            />
            <Button type="submit" variant="contained">
              Register and post comment
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
