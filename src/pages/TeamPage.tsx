import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../context/AppContext'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useOutletContext } from 'react-router-dom'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { api } from '../lib/api'
import type { TeamSummary } from '../types'

interface AuthOutletContext {
  loggedInUser: string | null
  loggedInRole: string | null
  loggedInTeam: string | null
}

const KENYA_COUNTIES = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo-Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  'Murang\'a',
  'Nairobi',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyamira',
  'Nyandarua',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita-Taveta',
  'Tana River',
  'Tharaka-Nithi',
  'Trans Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
] as const

export function TeamPage() {
  const { team: teamProfile, createTeam } = useAppData()
  const { loggedInUser, loggedInRole, loggedInTeam } = useOutletContext<AuthOutletContext>()
  const [teamName, setTeamName] = useState(teamProfile.name)
  const [manager, setManager] = useState(teamProfile.manager)
  const [county, setCounty] = useState(teamProfile.county)
  const [homeGround, setHomeGround] = useState(teamProfile.homeGround)
  const [level, setLevel] = useState(teamProfile.level)
  const [bio, setBio] = useState(teamProfile.bio)
  const [logoUrl, setLogoUrl] = useState(teamProfile.logoUrl ?? '')
  const [isDragOver, setIsDragOver] = useState(false)
  const [teamMessage, setTeamMessage] = useState('')
  const [showCreateTeamForm, setShowCreateTeamForm] = useState(false)
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState('All Levels')
  const [selectedCounty, setSelectedCounty] = useState('All Counties')
  const [selectedSort, setSelectedSort] = useState<'Recently Active' | 'A-Z'>('Recently Active')
  const [currentPage, setCurrentPage] = useState(1)
  const canCreateHere = false
  const teamsPerPage = 3

  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canCreateTeam = Boolean(loggedInUser && (normalizedRole === 'tm' || normalizedRole === 'coach' || normalizedRole === 'captain'))

  const loadTeams = async () => {
    setIsLoadingTeams(true)
    try {
      const response = await api.getTeams()
      const safeTeams = (response.teams ?? []).reduce<TeamSummary[]>((acc, row) => {
          const safeName = typeof row?.name === 'string' ? row.name.trim() : ''
          if (!safeName) {
            return acc
          }

          const safeCounty = typeof row.county === 'string' ? row.county.trim() : undefined
          const safeManager = typeof row.manager === 'string' ? row.manager.trim() : undefined
          const safeGround = typeof row.homeGround === 'string' ? row.homeGround.trim() : undefined
          const safeBio = typeof row.bio === 'string' ? row.bio.trim() : undefined
          const safeLogo = typeof row.logoUrl === 'string' ? row.logoUrl.trim() : undefined
          const safeLevel = row.level === 'Junior' || row.level === 'Amateur' || row.level === 'Semi-Pro'
            ? row.level
            : undefined
          const safeStatus = row.status === 'active' || row.status === 'inactive'
            ? row.status
            : undefined
          const safeUpdatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : undefined

          acc.push({
            name: safeName,
            logoUrl: safeLogo,
            manager: safeManager,
            county: safeCounty,
            homeGround: safeGround,
            level: safeLevel,
            bio: safeBio,
            status: safeStatus,
            updatedAt: safeUpdatedAt,
          })

          return acc
        }, [])

      setTeams(safeTeams)
      setTeamMessage('')
    } catch (error) {
      setTeamMessage(error instanceof Error ? error.message : 'Failed to load teams.')
      setTeams([])
    } finally {
      setIsLoadingTeams(false)
    }
  }

  useEffect(() => {
    if (!loggedInUser) {
      setTeams([])
      setIsLoadingTeams(false)
      return
    }

    void loadTeams()
  }, [loggedInUser])

  const countyOptions = useMemo(() => {
    const counties = new Set<string>()
    for (const countyName of KENYA_COUNTIES) {
      counties.add(countyName)
    }

    for (const row of teams) {
      if (row.county) {
        counties.add(row.county)
      }
    }

    return ['All Counties', ...Array.from(counties).sort((a, b) => a.localeCompare(b))]
  }, [teams])

  const filteredTeams = useMemo(() => {
    const next = teams.filter((row) => {
      const levelMatch = selectedLevel === 'All Levels' || row.level === selectedLevel
      const countyMatch = selectedCounty === 'All Counties' || row.county === selectedCounty
      return levelMatch && countyMatch
    })

    if (selectedSort === 'Recently Active') {
      next.sort((a, b) => {
        const aStamp = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const bStamp = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        if (bStamp !== aStamp) {
          return bStamp - aStamp
        }

        if ((a.status ?? 'inactive') !== (b.status ?? 'inactive')) {
          return (b.status ?? 'inactive') === 'active' ? 1 : -1
        }

        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })
      return next
    }

    next.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    return next
  }, [selectedCounty, selectedLevel, selectedSort, teams])

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / teamsPerPage))

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const visibleTeams = useMemo(() => {
    const startIndex = (currentPage - 1) * teamsPerPage
    return filteredTeams.slice(startIndex, startIndex + teamsPerPage)
  }, [currentPage, filteredTeams])

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
      await loadTeams()
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
                  <TextField
                    select
                    label="County"
                    value={county}
                    onChange={(event) => setCounty(event.target.value)}
                    required
                  >
                    {KENYA_COUNTIES.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </TextField>
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

      {!showCreateTeamForm && loggedInUser && (
        <Stack spacing={2}>
          <Card
            variant="outlined"
            sx={{
              borderColor: 'rgba(137,151,178,0.2)',
              borderRadius: 2,
              bgcolor: 'rgba(22,24,34,0.96)',
            }}
          >
            <CardContent sx={{ py: 1.5 }}>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.2,
                  gridTemplateColumns: { xs: '1fr', lg: '1fr auto' },
                  alignItems: 'center',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
                  <Typography sx={{ color: '#8d94a8', letterSpacing: '0.08em', fontWeight: 700, fontSize: '0.82rem' }}>
                    FILTER BY:
                  </Typography>
                  <TextField
                    select
                    size="small"
                    value={selectedLevel}
                    onChange={(event) => {
                      setSelectedLevel(event.target.value)
                      setCurrentPage(1)
                    }}
                    sx={{ minWidth: 132 }}
                  >
                    {['All Levels', 'Junior', 'Amateur', 'Semi-Pro'].map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    value={selectedCounty}
                    onChange={(event) => {
                      setSelectedCounty(event.target.value)
                      setCurrentPage(1)
                    }}
                    sx={{ minWidth: 138 }}
                  >
                    {countyOptions.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center', justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}>
                  <Typography sx={{ color: '#8d94a8', letterSpacing: '0.08em', fontWeight: 700, fontSize: '0.82rem' }}>
                    SORT:
                  </Typography>
                  <TextField
                    select
                    size="small"
                    value={selectedSort}
                    onChange={(event) => setSelectedSort(event.target.value as 'Recently Active' | 'A-Z')}
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="Recently Active">Recently Active</MenuItem>
                    <MenuItem value="A-Z">A-Z</MenuItem>
                  </TextField>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {isLoadingTeams ? (
            <Typography color="text.secondary">Loading teams...</Typography>
          ) : visibleTeams.length === 0 ? (
            <Typography color="text.secondary">No teams available for this filter.</Typography>
          ) : (
            <Stack spacing={1.8}>
              {visibleTeams.map((row) => {
                const isHighlighted = Boolean(loggedInTeam && loggedInTeam === row.name)
                const statusLabel = row.status ?? 'inactive'
                return (
                  <Card
                    key={`team-row-${row.name}`}
                    variant="outlined"
                    sx={{
                      borderColor: isHighlighted ? 'rgba(167,255,46,0.58)' : 'rgba(137,151,178,0.22)',
                      borderStyle: isHighlighted ? 'dashed' : 'solid',
                      borderWidth: isHighlighted ? 2 : 1,
                      borderRadius: 2,
                      bgcolor: 'rgba(21,23,33,0.96)',
                    }}
                  >
                    <CardContent sx={{ py: 1.7 }}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            md: 'minmax(0,1.8fr) repeat(4, minmax(0,1fr)) auto',
                          },
                          gap: { xs: 1.2, md: 1.5 },
                          alignItems: 'center',
                        }}
                      >
                        <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 84,
                              height: 84,
                              borderRadius: 1.3,
                              border: '1px solid rgba(137,151,178,0.26)',
                              bgcolor: 'rgba(30,34,50,0.84)',
                              display: 'grid',
                              placeItems: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            {row.logoUrl ? (
                              <Avatar src={row.logoUrl} alt={`${row.name} logo`} sx={{ width: 66, height: 66, borderRadius: 1.1 }} />
                            ) : (
                              <Typography sx={{ color: '#8d94a8', fontWeight: 800 }}>
                                {row.name.slice(0, 1).toUpperCase() || 'T'}
                              </Typography>
                            )}
                          </Box>
                          <Stack spacing={0.2}>
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                              <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.1 }}>{row.name}</Typography>
                              <Chip
                                label={statusLabel}
                                size="small"
                                sx={
                                  statusLabel === 'active'
                                    ? {
                                        textTransform: 'uppercase',
                                        fontWeight: 700,
                                        color: '#41f0bc',
                                        border: '1px solid rgba(66,233,178,0.45)',
                                        bgcolor: 'rgba(41,109,93,0.28)',
                                      }
                                    : {
                                        textTransform: 'uppercase',
                                        fontWeight: 700,
                                        color: '#a0a8bd',
                                        border: '1px solid rgba(137,151,178,0.35)',
                                        bgcolor: 'rgba(65,70,86,0.24)',
                                      }
                                }
                              />
                            </Stack>
                            <Typography sx={{ fontStyle: 'italic', color: '#8d94a8' }}>
                              "{row.bio?.trim() || 'No team motto yet'}"
                            </Typography>
                          </Stack>
                        </Stack>

                        <Box>
                          <Typography sx={{ color: '#666f86', letterSpacing: '0.1em', fontWeight: 700, fontSize: '0.76rem' }}>MANAGER</Typography>
                          <Typography sx={{ fontWeight: 700 }}>{row.manager || 'Not set'}</Typography>
                        </Box>

                        <Box>
                          <Typography sx={{ color: '#666f86', letterSpacing: '0.1em', fontWeight: 700, fontSize: '0.76rem' }}>COUNTY</Typography>
                          <Typography sx={{ fontWeight: 700 }}>{row.county || 'Not set'}</Typography>
                        </Box>

                        <Box>
                          <Typography sx={{ color: '#666f86', letterSpacing: '0.1em', fontWeight: 700, fontSize: '0.76rem' }}>LEVEL</Typography>
                          <Typography sx={{ fontWeight: 800, color: '#9dff20' }}>{row.level || 'Amateur'}</Typography>
                        </Box>

                        <Box>
                          <Typography sx={{ color: '#666f86', letterSpacing: '0.1em', fontWeight: 700, fontSize: '0.76rem' }}>GROUND</Typography>
                          <Typography sx={{ fontWeight: 700 }}>{row.homeGround || 'Not set'}</Typography>
                        </Box>

                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                          <Button variant="outlined" sx={{ minWidth: 100, fontWeight: 700, borderColor: 'rgba(137,151,178,0.3)', color: '#b6bed2' }}>
                            Details
                          </Button>
                          <Button variant="outlined" sx={{ minWidth: 0, width: 40, height: 40, p: 0, borderColor: 'rgba(137,151,178,0.3)', color: '#b6bed2' }}>
                            <OpenInNewRoundedIcon sx={{ fontSize: '1.02rem' }} />
                          </Button>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          )}

          <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', justifyContent: 'center', pt: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              sx={{ minWidth: 0, width: 44, height: 44, p: 0, borderColor: 'rgba(137,151,178,0.35)' }}
            >
              <ChevronLeftRoundedIcon />
            </Button>

            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1
              const isActive = page === currentPage
              return (
                <Button
                  key={`teams-page-${page}`}
                  variant={isActive ? 'contained' : 'outlined'}
                  onClick={() => setCurrentPage(page)}
                  sx={{
                    minWidth: 0,
                    width: 44,
                    height: 44,
                    p: 0,
                    fontWeight: 800,
                    color: isActive ? '#122100' : '#a8b1c7',
                    borderColor: isActive ? 'transparent' : 'rgba(137,151,178,0.35)',
                    bgcolor: isActive ? '#adff0f' : 'transparent',
                    '&:hover': { bgcolor: isActive ? '#99e600' : 'rgba(255,255,255,0.04)' },
                  }}
                >
                  {page}
                </Button>
              )
            })}

            <Button
              variant="outlined"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              sx={{ minWidth: 0, width: 44, height: 44, p: 0, borderColor: 'rgba(137,151,178,0.35)' }}
            >
              <ChevronRightRoundedIcon />
            </Button>
          </Stack>
        </Stack>
      )}

      {!showCreateTeamForm && !loggedInUser && (
        <Alert severity="info">Log in to view the teams list.</Alert>
      )}
    </Stack>
  )
}
