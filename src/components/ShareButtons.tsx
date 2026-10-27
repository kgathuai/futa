import { useState } from 'react'
import { IconButton, Stack, Tooltip } from '@mui/material'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import XIcon from '@mui/icons-material/X'
import { shareOrCopy, whatsappUrl, twitterUrl, type SharePayload } from '../lib/share'

/**
 * Native share sheet + WhatsApp / X / copy-link shortcuts for a match, result or
 * tournament. Falls back to copying the link when the Web Share API is missing.
 */
export function ShareButtons({
  payload,
  size = 'small',
  onResult,
}: {
  payload: SharePayload
  size?: 'small' | 'medium'
  onResult?: (outcome: 'shared' | 'copied' | 'failed') => void
}) {
  const [copied, setCopied] = useState(false)
  const iconSize = size === 'small' ? '1rem' : '1.2rem'

  const handleNative = async () => {
    const outcome = await shareOrCopy(payload)
    setCopied(outcome === 'copied')
    onResult?.(outcome)
  }

  const handleCopy = async () => {
    const outcome = await shareOrCopy({ ...payload, text: '' })
    setCopied(outcome !== 'failed')
    onResult?.(outcome)
  }

  return (
    <Stack direction="row" spacing={0.1} sx={{ alignItems: 'center' }}>
      <Tooltip title="Share">
        <IconButton size={size} aria-label="Share" onClick={() => void handleNative()}>
          <ShareOutlinedIcon sx={{ fontSize: iconSize }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Share on WhatsApp">
        <IconButton
          size={size}
          aria-label="Share on WhatsApp"
          component="a"
          href={whatsappUrl(payload)}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: '#25d366' }}
        >
          <WhatsAppIcon sx={{ fontSize: iconSize }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Share on X">
        <IconButton
          size={size}
          aria-label="Share on X"
          component="a"
          href={twitterUrl(payload)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <XIcon sx={{ fontSize: iconSize }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={copied ? 'Link copied' : 'Copy link'}>
        <IconButton size={size} aria-label="Copy link" onClick={() => void handleCopy()}>
          <ContentCopyRoundedIcon sx={{ fontSize: iconSize, color: copied ? '#4ce3a3' : undefined }} />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
