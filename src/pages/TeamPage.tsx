import type { FormEvent } from 'react'
import { useState } from 'react'
import { useAppData } from '../context/AppContext'
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useOutletContext } from 'react-router-dom'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
}

export function TeamPage() {
  const { team, createTeam } = useAppData()
  const { loggedInUser, loggedInRole } = useOutletContext<AuthOutletContext>()
  const [teamName, setTeamName] = useState(team.name)
  const [manager, setManager] = useState(team.manager)
  const [county, setCounty] = useState(team.county)
  const [homeGround, setHomeGround] = useState(team.homeGround)
  const [level, setLevel] = useState(team.level)
  const [bio, setBio] = useState(team.bio)
  const [logoUrl, setLogoUrl] = useState(team.logoUrl ?? '')
  const [isDragOver, setIsDragOver] = useState(false)
  const [teamMessage, setTeamMessage] = useState('')
  const [showCreateTeamForm, setShowCreateTeamForm] = useState(false)
  const canCreateHere = false

  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canCreateTeam = Boolean(loggedInUser && (normalizedRole === 'tm' || normalizedRole === 'coach' || normalizedRole === 'captain'))

  const handleLogoFile = (file: File | null) => {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setTeamMessage('Please upload an image file for the team logo.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result)
        setTeamMessage('Team logo selected.')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCreateTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await createTeam({
        name: teamName,
        manager,
        county,
        homeGround,
        level,
        bio,
        logoUrl: logoUrl.trim() || undefined,
      })
      setTeamMessage('Team saved successfully.')
      setShowCreateTeamForm(false)
    } catch (error) {
      setTeamMessage(error instanceof Error ? error.message : 'Failed to save team.')
    }
  }

  return (
    <Stack spacing={3}>

      {canCreateTeam ? (
        canCreateHere && showCreateTeamForm ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card variant="outlined" sx={{ width: '100%', maxWidth: 680 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Team setup
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.2 }}>
                  Create a team
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Logged in as {loggedInUser} ({loggedInRole}). You can create or update a team profile.
                </Typography>
                <Box component="form" onSubmit={handleCreateTeam} sx={{ display: 'grid', gap: 1.4 }}>
                  <TextField label="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
                  <TextField label="Manager" value={manager} onChange={(event) => setManager(event.target.value)} required />
                  <TextField label="County" value={county} onChange={(event) => setCounty(event.target.value)} required />
                  <TextField label="Home ground" value={homeGround} onChange={(event) => setHomeGround(event.target.value)} required />
                  <TextField select label="Level" value={level} onChange={(event) => setLevel(event.target.value as typeof level)} required>
                    <MenuItem value="Junior">Junior</MenuItem>
                    <MenuItem value="Amateur">Amateur</MenuItem>
                    <MenuItem value="Semi-Pro">Semi-Pro</MenuItem>
                  </TextField>
                  <TextField
                    label="Team logo file (optional)"
                    type="file"
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { accept: 'image/*' } }}
                    onChange={(event) => {
                      const input = event.target as HTMLInputElement
                      handleLogoFile(input.files?.[0] ?? null)
                    }}
                    helperText="Upload an image to use as the team logo."
                  />
                  <Box
                    onDragOver={(event) => {
                      event.preventDefault()
                      setIsDragOver(true)
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(event) => {
                      event.preventDefault()
                      setIsDragOver(false)
                      handleLogoFile(event.dataTransfer.files[0] ?? null)
                    }}
                    sx={{
                      border: '1px dashed',
                      borderColor: isDragOver ? 'primary.main' : 'rgba(159,176,201,0.38)',
                      borderRadius: 2,
                      p: 2,
                      textAlign: 'center',
                      bgcolor: isDragOver ? 'rgba(76,227,163,0.08)' : 'transparent',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Or drag and drop the logo image here
                    </Typography>
                  </Box>
                  <TextField
                    label="Team logo URL (optional)"
                    type="url"
                    value={logoUrl}
                    onChange={(event) => setLogoUrl(event.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <TextField label="Bio" value={bio} onChange={(event) => setBio(event.target.value)} multiline rows={3} required />
                  <Button type="submit" variant="contained" sx={{ justifySelf: 'start' }}>
                    Save team
                  </Button>
                  {teamMessage && (
                    <Alert severity="info">{teamMessage}</Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ) : null
      ) : (
        <Alert severity="info">
          Only users logged in as TM, Coach, or captain can create a team.
        </Alert>
      )}

      {!showCreateTeamForm && (
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" sx={{ mb: 1.2, justifyContent: 'space-between' }}>
              <Chip label="Team" size="small" />
              <Chip label="active" color="primary" size="small" sx={{ color: '#07111f' }} />
            </Stack>
            {team.logoUrl && (
              <Box sx={{ mb: 1.25 }}>
                <Box
                  component="img"
                  src={team.logoUrl}
                  alt={`${team.name} logo`}
                  sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover', border: '1px solid rgba(159,176,201,0.28)' }}
                />
              </Box>
            )}
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {team.name}
            </Typography>
            <Typography color="text.secondary" sx={{ my: 1 }}>
              {team.bio}
            </Typography>
            <Typography>{team.homeGround}</Typography>
            <Typography color="text.secondary">{team.county}</Typography>
            <Typography color="text.secondary">{team.manager}</Typography>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" sx={{ mb: 1.2, justifyContent: 'space-between' }}>
              <Chip label="Profile" size="small" />
              <Chip label={team.level} size="small" />
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Club details
            </Typography>
            <Typography color="text.secondary">Manager</Typography>
            <Typography sx={{ mb: 1 }}>{team.manager}</Typography>
            <Typography color="text.secondary">Home ground</Typography>
            <Typography sx={{ mb: 1 }}>{team.homeGround}</Typography>
            <Typography color="text.secondary">County</Typography>
            <Typography sx={{ mb: 1 }}>{team.county}</Typography>
            <Typography color="text.secondary">Level</Typography>
            <Typography>{team.level}</Typography>
          </CardContent>
        </Card>
      </Box>
      )}
    </Stack>
  )
}
