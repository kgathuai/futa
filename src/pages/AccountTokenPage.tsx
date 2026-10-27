import { useEffect, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { api } from '../lib/api'
import { LoadingBar } from '../components/LoadingBar'

/**
 * Handles both `/reset-password` and `/verify-email`, driven by the token in the
 * query string that was emailed to the account owner.
 */
export function AccountTokenPage({ mode }: { mode: 'reset' | 'verify' }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(mode === 'verify' && Boolean(token))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode !== 'verify' || !token) {
      return
    }

    let active = true
    void api
      .verifyEmail(token)
      .then((response) => {
        if (active) {
          setMessage(response.message)
        }
      })
      .catch((failure) => {
        if (active) {
          setError(failure instanceof Error ? failure.message : 'Could not verify that link.')
        }
      })
      .finally(() => {
        if (active) {
          setIsSubmitting(false)
        }
      })

    return () => {
      active = false
    }
  }, [mode, token])

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError('Choose a password with at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      const response = await api.resetPassword(token, password)
      setMessage(response.message)
      setPassword('')
      setConfirmPassword('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not reset your password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = mode === 'reset' ? 'Choose a new password' : 'Email verification'

  return (
    <Box sx={{ maxWidth: 460, mx: 'auto', py: { xs: 3, md: 6 } }}>
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2.2, md: 3 } }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', md: '1.2rem' }, mb: 0.6 }}>
            {title}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mb: 2 }}>
            {mode === 'reset'
              ? 'Pick a password with at least 6 characters. Every other session will be signed out.'
              : 'Confirming the email address attached to your Futa account.'}
          </Typography>

          {!token && (
            <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
              This link is missing its token. Request a new one from the login screen.
            </Alert>
          )}

          {isSubmitting && (
            <Stack spacing={0.8} sx={{ mb: 2 }}>
              <LoadingBar label={mode === 'reset' ? 'Updating password…' : 'Verifying email…'} />
            </Stack>
          )}

          {message && (
            <Alert severity="success" sx={{ mb: 2, fontSize: '0.8rem' }}>
              {message}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>
              {error}
            </Alert>
          )}

          {mode === 'reset' && !message && (
            <Stack spacing={1.4}>
              <TextField
                type="password"
                label="New password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                type="password"
                label="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                size="small"
                fullWidth
              />
              <Button variant="contained" onClick={() => void handleSubmit()} disabled={isSubmitting || !token}>
                {isSubmitting ? 'Saving…' : 'Save new password'}
              </Button>
            </Stack>
          )}

          <Button component={RouterLink} to="/" variant="text" size="small" sx={{ mt: 2 }}>
            Back to Futa
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}
