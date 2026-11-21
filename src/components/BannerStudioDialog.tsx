import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'

const WIDTH = 1200
const HEIGHT = 630

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    if (/^https?:/i.test(src)) {
      image.crossOrigin = 'anonymous'
    }
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('That photo could not be loaded.'))
    image.src = src
  })

const roundedRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) => {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate
    } else {
      lines.push(line)
      line = word
      if (lines.length === maxLines) {
        break
      }
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line)
  }
  if (words.length > 0 && lines.length === maxLines) {
    const last = lines[maxLines - 1]
    if (context.measureText(last).width > maxWidth) {
      let trimmed = last
      while (trimmed.length > 1 && context.measureText(`${trimmed}…`).width > maxWidth) {
        trimmed = trimmed.slice(0, -1)
      }
      lines[maxLines - 1] = `${trimmed}…`
    }
  }
  return lines
}

export interface BannerStudioDialogProps {
  open: boolean
  onClose: () => void
  name: string
  team?: string
  sport?: string
  avatar?: string
}

/**
 * Client-side "create a banner" studio: composes the player's photo, name and
 * team into a 1200×630 PNG that can be downloaded and shared. Everything is
 * drawn locally — nothing is uploaded.
 */
export function BannerStudioDialog({ open, onClose, name, team, sport, avatar }: BannerStudioDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    let frame = 0

    const draw = async () => {
      const canvas = canvasRef.current
      if (!canvas) {
        // MUI mounts dialog content a frame after opening — retry until ready.
        frame = window.requestAnimationFrame(() => {
          void draw()
        })
        return
      }
      const context = canvas.getContext('2d')
      if (!context) {
        setError('Could not prepare the banner canvas.')
        return
      }

      setReady(false)
      setError('')

      const background = context.createLinearGradient(0, 0, WIDTH, HEIGHT)
      background.addColorStop(0, '#12233a')
      background.addColorStop(0.55, '#16324a')
      background.addColorStop(1, '#0d1524')
      context.fillStyle = background
      context.fillRect(0, 0, WIDTH, HEIGHT)

      // Soft green glow behind the portrait.
      const glow = context.createRadialGradient(920, 300, 40, 920, 300, 420)
      glow.addColorStop(0, 'rgba(76,227,163,0.28)')
      glow.addColorStop(1, 'rgba(76,227,163,0)')
      context.fillStyle = glow
      context.fillRect(0, 0, WIDTH, HEIGHT)

      // Faint texture stripes.
      context.save()
      context.globalAlpha = 0.05
      context.strokeStyle = '#ffffff'
      context.lineWidth = 2
      for (let x = -HEIGHT; x < WIDTH; x += 44) {
        context.beginPath()
        context.moveTo(x, HEIGHT)
        context.lineTo(x + HEIGHT, 0)
        context.stroke()
      }
      context.restore()

      // Portrait disc.
      const portraitX = 920
      const portraitY = 305
      const portraitRadius = 168
      context.save()
      context.beginPath()
      context.arc(portraitX, portraitY, portraitRadius, 0, Math.PI * 2)
      context.closePath()
      context.clip()

      let drewPhoto = false
      if (avatar) {
        try {
          // Never let a slow/blocked photo leave the studio stuck.
          const image = await Promise.race([
            loadImage(avatar),
            new Promise<null>((resolve) => {
              window.setTimeout(() => resolve(null), 2500)
            }),
          ])
          if (cancelled) {
            return
          }
          if (!image) {
            throw new Error('Photo timed out.')
          }
          const scale = Math.max((portraitRadius * 2) / image.width, (portraitRadius * 2) / image.height)
          const drawWidth = image.width * scale
          const drawHeight = image.height * scale
          context.drawImage(
            image,
            portraitX - drawWidth / 2,
            portraitY - drawHeight / 2,
            drawWidth,
            drawHeight,
          )
          drewPhoto = true
        } catch {
          drewPhoto = false
        }
      }
      if (!drewPhoto) {
        context.fillStyle = 'rgba(76,227,163,0.16)'
        context.fillRect(portraitX - portraitRadius, portraitY - portraitRadius, portraitRadius * 2, portraitRadius * 2)
        context.fillStyle = '#4ce3a3'
        context.font = '800 140px "Plus Jakarta Sans", "Segoe UI", sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText((name.trim().charAt(0) || 'K').toUpperCase(), portraitX, portraitY + 6)
      }
      context.restore()

      // Portrait ring.
      context.save()
      context.strokeStyle = 'rgba(76,227,163,0.85)'
      context.lineWidth = 6
      context.beginPath()
      context.arc(portraitX, portraitY, portraitRadius + 4, 0, Math.PI * 2)
      context.stroke()
      context.restore()

      // Copy block.
      context.textAlign = 'left'
      context.textBaseline = 'alphabetic'
      context.fillStyle = '#4ce3a3'
      context.font = '800 26px "Plus Jakarta Sans", "Segoe UI", sans-serif'
      context.fillText('KAMBUMBU PLAYER', 72, 120)

      context.fillStyle = '#f4f7fb'
      const nameFont = 86
      context.font = `800 ${nameFont}px "Plus Jakarta Sans", "Segoe UI", sans-serif`
      let lines = wrapText(context, name.trim() || 'Your name', 640, 2)
      if (lines.length === 2) {
        context.font = `800 ${Math.round(nameFont * 0.82)}px "Plus Jakarta Sans", "Segoe UI", sans-serif`
        lines = wrapText(context, name.trim() || 'Your name', 640, 2)
      }
      lines.forEach((line, index) => {
        context.fillText(line, 72, 250 + index * (nameFont * 0.95))
      })

      const meta = [team?.trim(), sport?.trim()].filter(Boolean).join('  ·  ')
      context.fillStyle = '#aeb9cb'
      context.font = '600 32px "Plus Jakarta Sans", "Segoe UI", sans-serif'
      context.fillText(meta || 'Kambumbu community', 72, 512)

      // Footer.
      context.fillStyle = '#4ce3a3'
      roundedRect(context, 72, 552, 178, 44, 22)
      context.fill()
      context.fillStyle = '#07111f'
      context.font = '800 22px "Plus Jakarta Sans", "Segoe UI", sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText('kambumbu.com', 72 + 89, 552 + 22)

      if (!cancelled) {
        setReady(true)
      }
    }

    void draw().catch(() => {
      if (!cancelled) {
        setError('Could not build the banner. Try again.')
      }
    })

    return () => {
      cancelled = true
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [open, name, team, sport, avatar])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    try {
      const safeName = (name.trim() || 'player').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      canvas.toBlob((blob) => {
        if (!blob) {
          setError('Could not export the banner image.')
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `kambumbu-${safeName || 'player'}-banner.png`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch {
      setError('This photo cannot be exported because it comes from another site. Re-upload it to your account.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem' }}>Create your banner</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Your photo, name, team and sport are composed locally into a shareable banner. Nothing is uploaded.
          </Typography>
          <Box
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid rgba(159,176,201,0.22)',
              bgcolor: '#0d1524',
              lineHeight: 0,
            }}
          >
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              aria-label="Banner preview"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Box>
          {error && (
            <Alert severity="warning" sx={{ fontSize: '0.78rem' }}>
              {error}
            </Alert>
          )}
          {!ready && !error && (
            <Typography variant="caption" color="text.secondary">
              Preparing preview…
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={handleDownload}
          disabled={!ready}
          startIcon={<DownloadRoundedIcon />}
        >
          Download PNG
        </Button>
      </DialogActions>
    </Dialog>
  )
}
