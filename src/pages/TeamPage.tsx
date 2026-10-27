import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../lib/api'
import { LoadingBar } from '../components/LoadingBar'
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

const levels = ['All Levels', 'Junior', 'Amateur', 'Semi-Pro'] as const
const teamsPerPage = 9

function StatTile({ label, value, accent = '#edf2f7' }: { label: string; value: number; accent?: string }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 1.6,
        borderColor: 'rgba(159,176,201,0.14)',
        background: 'linear-gradient(180deg, rgba(21,31,51,0.72) 0%, rgba(14,22,38,0.72) 100%)',
      }}
    >
      <CardContent sx={{ py: 0.8, px: 1.2, '&:last-child': { pb: 0.8 } }}>
        <Typography sx={{ fontSize: '0.52rem', letterSpacing: '0.14em', fontWeight: 800, color: '#66708a' }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.2, color: accent }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

function Meta({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          display: { xs: 'block', md: 'none' },
          fontSize: '0.5rem',
          letterSpacing: '0.12em',
          fontWeight: 800,
          color: '#5f6a84',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.76rem',
          fontWeight: 700,
          color: accent ? '#9dff20' : '#c3cbdc',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function TeamRow({ team, highlighted }: { team: TeamSummary; highlighted: boolean }) {
  const status = team.status ?? 'inactive'

  return (
    <Box
      sx={{
        display: { xs: 'block', md: 'grid' },
        gridTemplateColumns: {
          md: 'minmax(0,2.2fr) minmax(0,1fr) minmax(0,1fr) 88px minmax(0,1.2fr)',
        },
        gap: { md: 1.4 },
        px: { xs: 1.4, md: 1.8 },
        py: { xs: 1.1, md: 0.85 },
        alignItems: 'center',
        borderLeft: highlighted ? '2px solid #adff0f' : '2px solid transparent',
        bgcolor: highlighted ? 'rgba(173,255,15,0.025)' : 'transparent',
        transition: 'background-color 120ms ease',
        '&:hover': { bgcolor: 'rgba(76,227,163,0.03)' },
      }}
    >
      <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 1.4,
            border: '1px solid rgba(159,176,201,0.28)',
            bgcolor: 'rgba(30,34,50,0.9)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            boxShadow: '0 0 0 2px rgba(76,227,163,0.07)',
          }}
        >
          {team.logoUrl ? (
            <Avatar
              src={team.logoUrl}
              alt={`${team.name} logo`}
              sx={{ width: 40, height: 40, borderRadius: 1.1 }}
            />
          ) : (
            <Typography sx={{ color: '#9dff20', fontWeight: 800, fontSize: '1rem' }}>
              {team.name.charAt(0).toUpperCase()}
            </Typography>
          )}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.82rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {team.name}
            </Typography>
            <Chip
              size="small"
              label={status.toUpperCase()}
              sx={{
                height: 15,
                fontSize: '0.46rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: status === 'active' ? '#4ce3a3' : '#9fa9c0',
                bgcolor: status === 'active' ? 'rgba(76,227,163,0.08)' : 'rgba(159,176,201,0.06)',
                border: `1px solid ${status === 'active' ? 'rgba(76,227,163,0.35)' : 'rgba(159,176,201,0.2)'}`,
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
          </Stack>
          <Typography
            sx={{
              fontSize: '0.6rem',
              color: '#7f8aa3',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontStyle: team.bio?.trim() ? 'normal' : 'italic',
            }}
          >
            {team.bio?.trim() || 'No team motto yet'}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          display: { xs: 'grid', md: 'contents' },
          gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))' },
          gap: { xs: 0.8, md: 0 },
          mt: { xs: 1, md: 0 },
        }}
      >
        <Meta label="MANAGER" value={team.manager || 'Not set'} />
        <Meta label="COUNTY" value={team.county || 'Not set'} />
        <Meta label="LEVEL" value={team.level || 'Amateur'} accent />
        <Meta label="GROUND" value={team.homeGround || 'Not set'} />
      </Box>
    </Box>
  )
}

export function TeamPage() {
  const { loggedInUser, loggedInRole, loggedInTeam } = useOutletContext<AuthOutletContext>()
  const normalizedRole = loggedInRole?.trim().toLowerCase() ?? ''
  const canAddTeam =
    Boolean(loggedInUser) &&
    (normalizedRole === 'tm' ||
      normalizedRole === 'coach' ||
      normalizedRole === 'captain' ||
      normalizedRole === 'admin' ||
      normalizedRole === 'superadmin')

  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('All Levels')
  const [selectedCounty, setSelectedCounty] = useState('All Counties')
  const [selectedSort, setSelectedSort] = useState<'Recently Active' | 'A-Z'>('Recently Active')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let cancelled = false

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
          const safeLevel =
            row.level === 'Junior' || row.level === 'Amateur' || row.level === 'Semi-Pro'
              ? row.level
              : undefined
          const safeStatus =
            row.status === 'active' || row.status === 'inactive' ? row.status : undefined
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

        if (!cancelled) {
          setTeams(safeTeams)
          setLoadError('')
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load teams.')
          setTeams([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTeams(false)
        }
      }
    }

    void loadTeams()
    return () => {
      cancelled = true
    }
  }, [])

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
    const term = searchQuery.trim().toLowerCase()

    const next = teams.filter((row) => {
      const levelMatch = selectedLevel === 'All Levels' || row.level === selectedLevel
      const countyMatch = selectedCounty === 'All Counties' || row.county === selectedCounty
      if (!levelMatch || !countyMatch) {
        return false
      }

      if (!term) {
        return true
      }

      return [row.name, row.manager, row.county, row.homeGround, row.bio]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
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
  }, [searchQuery, selectedCounty, selectedLevel, selectedSort, teams])

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / teamsPerPage))

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const visibleTeams = useMemo(() => {
    const startIndex = (currentPage - 1) * teamsPerPage
    return filteredTeams.slice(startIndex, startIndex + teamsPerPage)
  }, [currentPage, filteredTeams])

  const stats = useMemo(
    () => ({
      total: teams.length,
      active: teams.filter((team) => (team.status ?? 'inactive') === 'active').length,
      counties: new Set(teams.map((team) => team.county).filter(Boolean)).size,
    }),
    [teams],
  )

  const resetPage = () => setCurrentPage(1)

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}
      >
        <Box>
          <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', mb: 0.3 }}>
            <GroupsOutlinedIcon sx={{ fontSize: '0.9rem', color: '#4ce3a3' }} />
            <Typography sx={{ fontSize: '0.56rem', letterSpacing: '0.18em', fontWeight: 800, color: '#5f6a84' }}>
              CLUB DIRECTORY
            </Typography>
          </Stack>
          <Typography
            sx={{ fontSize: { xs: '1.2rem', md: '1.45rem' }, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}
          >
            Teams
          </Typography>
          <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mt: 0.25 }}>
            Browse every team in the community — no account needed.
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.8 }}>
          {canAddTeam && (
            <Button
              component={Link}
              to="/team-dashboard?create=team"
              variant="contained"
              size="small"
              startIcon={<PersonAddAltRoundedIcon sx={{ fontSize: '0.9rem' }} />}
              sx={{
                fontSize: '0.7rem',
                py: 0.35,
                px: 1.1,
              }}
            >
              Add team
            </Button>
          )}
          <StatTile label="TEAMS" value={stats.total} />
          <StatTile label="ACTIVE" value={stats.active} accent="#4ce3a3" />
          <StatTile label="COUNTIES" value={stats.counties} accent="#adff0f" />
        </Stack>
      </Stack>

      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: 'rgba(159,176,201,0.14)',
          background: 'linear-gradient(180deg, rgba(21,31,51,0.55) 0%, rgba(13,21,36,0.55) 100%)',
        }}
      >
        <CardContent sx={{ p: 1.3, '&:last-child': { pb: 1.3 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
          >
            <TextField
              size="small"
              placeholder="Search teams, managers, grounds…"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                resetPage()
              }}
              sx={{
                width: { xs: '100%', md: 300 },
                '& .MuiInputBase-input': { fontSize: '0.76rem', py: 0.6 },
                '& .MuiOutlinedInput-root': { borderRadius: 1.4 },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ fontSize: '0.95rem', color: '#6b7590' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                value={selectedLevel}
                onChange={(event) => {
                  setSelectedLevel(event.target.value)
                  resetPage()
                }}
                sx={{ minWidth: 128, '& .MuiInputBase-input': { fontSize: '0.74rem', py: 0.6 } }}
              >
                {levels.map((level) => (
                  <MenuItem key={level} value={level} sx={{ fontSize: '0.76rem' }}>
                    {level.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                value={selectedCounty}
                onChange={(event) => {
                  setSelectedCounty(event.target.value)
                  resetPage()
                }}
                sx={{ minWidth: 140, '& .MuiInputBase-input': { fontSize: '0.74rem', py: 0.6 } }}
              >
                {countyOptions.map((county) => (
                  <MenuItem key={county} value={county} sx={{ fontSize: '0.76rem' }}>
                    {county}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                value={selectedSort}
                onChange={(event) => {
                  setSelectedSort(event.target.value as 'Recently Active' | 'A-Z')
                  resetPage()
                }}
                sx={{ minWidth: 148, '& .MuiInputBase-input': { fontSize: '0.74rem', py: 0.6 } }}
              >
                <MenuItem value="Recently Active" sx={{ fontSize: '0.76rem' }}>
                  RECENTLY ACTIVE
                </MenuItem>
                <MenuItem value="A-Z" sx={{ fontSize: '0.76rem' }}>
                  A-Z
                </MenuItem>
              </TextField>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loadError && (
        <Alert severity="error" sx={{ fontSize: '0.75rem', py: 0.35 }}>
          {loadError}
        </Alert>
      )}

      {isLoadingTeams ? (
        <Stack spacing={1} sx={{ py: 3 }}>
          <LoadingBar label="Loading teams…" />
          <Typography sx={{ fontSize: '0.76rem', color: '#8b97ad' }}>Loading teams…</Typography>
        </Stack>
      ) : visibleTeams.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'rgba(159,176,201,0.14)' }}>
          <Stack sx={{ alignItems: 'center', py: 6, gap: 0.6 }}>
            <SearchOffRoundedIcon sx={{ fontSize: '1.5rem', color: '#3f4a63' }} />
            <Typography sx={{ fontSize: '0.76rem', color: '#66708a' }}>
              No teams match your filters.
            </Typography>
          </Stack>
        </Card>
      ) : (
        <>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '0.56rem', letterSpacing: '0.14em', fontWeight: 800, color: '#5f6a84' }}>
              SHOWING {visibleTeams.length} OF {filteredTeams.length} TEAMS
            </Typography>
            <Typography sx={{ fontSize: '0.56rem', letterSpacing: '0.14em', fontWeight: 800, color: '#5f6a84' }}>
              PAGE {currentPage} / {totalPages}
            </Typography>
          </Stack>

          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: 'rgba(159,176,201,0.14)',
              background: 'linear-gradient(180deg, rgba(21,31,51,0.6) 0%, rgba(13,21,36,0.6) 100%)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: 'minmax(0,2.2fr) minmax(0,1fr) minmax(0,1fr) 88px minmax(0,1.2fr)',
                gap: 1.4,
                px: 1.8,
                py: 0.6,
                borderBottom: '1px solid rgba(159,176,201,0.1)',
                bgcolor: 'rgba(255,255,255,0.012)',
              }}
            >
              {['TEAM', 'MANAGER', 'COUNTY', 'LEVEL', 'GROUND'].map((label) => (
                <Typography
                  key={`team-head-${label}`}
                  sx={{ fontSize: '0.52rem', letterSpacing: '0.12em', fontWeight: 800, color: '#5f6a84' }}
                >
                  {label}
                </Typography>
              ))}
            </Box>

            <Stack divider={<Box sx={{ height: '1px', bgcolor: 'rgba(159,176,201,0.07)' }} />}>
              {visibleTeams.map((team) => (
                <TeamRow key={`team-${team.name}`} team={team} highlighted={loggedInTeam === team.name} />
              ))}
            </Stack>
          </Card>
        </>
      )}

      {totalPages > 1 && (
        <Stack direction="row" spacing={0.6} sx={{ justifyContent: 'center', alignItems: 'center', pt: 0.5 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            sx={{ minWidth: 32, width: 32, height: 32, p: 0, borderColor: 'rgba(159,176,201,0.25)' }}
          >
            <ChevronLeftRoundedIcon sx={{ fontSize: '1rem' }} />
          </Button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => {
            const isActive = page === currentPage
            return (
              <Button
                key={`team-page-${page}`}
                size="small"
                onClick={() => setCurrentPage(page)}
                sx={{
                  minWidth: 32,
                  width: 32,
                  height: 32,
                  p: 0,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  bgcolor: isActive ? '#4ce3a3' : 'transparent',
                  color: isActive ? '#07111f' : '#a7afc2',
                  border: '1px solid rgba(159,176,201,0.18)',
                  '&:hover': { bgcolor: isActive ? '#3ecf92' : 'rgba(255,255,255,0.04)' },
                }}
              >
                {page}
              </Button>
            )
          })}

          <Button
            variant="outlined"
            size="small"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            sx={{ minWidth: 32, width: 32, height: 32, p: 0, borderColor: 'rgba(159,176,201,0.25)' }}
          >
            <ChevronRightRoundedIcon sx={{ fontSize: '1rem' }} />
          </Button>
        </Stack>
      )}
    </Stack>
  )
}
