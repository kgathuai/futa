import { useEffect, useRef } from 'react'
import { Alert, Box } from '@mui/material'

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error'

export interface ToastMessage {
  message: string
  severity?: ToastSeverity
}

/**
 * Full-width notification bar pinned to the top of the screen. It slides in from
 * the top edge and clears itself after `autoHideDuration`.
 */
export function TopToast({
  toast,
  onClose,
  autoHideDuration = 5000,
}: {
  toast: ToastMessage | null
  onClose: () => void
  autoHideDuration?: number
}) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!toast?.message) {
      return
    }
    const timer = window.setTimeout(() => closeRef.current(), autoHideDuration)
    return () => window.clearTimeout(timer)
  }, [toast?.message, toast?.severity, autoHideDuration])

  if (!toast?.message) {
    return null
  }

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        // In flow (not fixed) so the bar sits above the app bar instead of
        // covering the logo, and sticks to the top while scrolling.
        position: 'sticky',
        top: 0,
        width: '100%',
        flexShrink: 0,
        zIndex: 3000,
        animation: 'futa-toast-in 220ms ease-out',
        '@keyframes futa-toast-in': {
          '0%': { opacity: 0, transform: 'translateY(-100%)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Alert
        severity={toast.severity ?? 'info'}
        onClose={onClose}
        variant="outlined"
        sx={{
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          borderRadius: 0,
          // Brand-green notification bar with white text for readability.
          bgcolor: 'success.dark',
          color: 'success.contrastText',
          fontSize: { xs: '0.64rem', sm: '0.68rem' },
          fontWeight: 600,
          lineHeight: 1,
          minHeight: 0,
          height: { xs: 18, sm: 20 },
          py: 0,
          boxShadow: 'none',
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.18)',
          borderBottom: '1px solid rgba(0,0,0,0.25)',
          px: { xs: 4, sm: 5 },
          // Icon and close button sit at the edges so the message is truly centred.
          '& .MuiAlert-icon': {
            color: 'success.contrastText',
            position: 'absolute',
            left: { xs: 8, sm: 14 },
            top: '50%',
            transform: 'translateY(-50%)',
            mr: 0,
            py: 0,
            fontSize: '0.8rem',
          },
          '& .MuiAlert-message': { py: 0, lineHeight: 1, textAlign: 'center', width: '100%' },
          '& .MuiAlert-action': {
            position: 'absolute',
            right: { xs: 4, sm: 10 },
            top: '50%',
            transform: 'translateY(-50%)',
            m: 0,
            p: 0,
            alignItems: 'center',
          },
          '& .MuiAlert-action .MuiIconButton-root': {
            color: 'success.contrastText',
            p: 0.1,
            fontSize: '0.8rem',
          },
        }}
      >
        {toast.message}
      </Alert>
    </Box>
  )
}
