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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
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
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          borderRadius: 0,
          bgcolor: '#0d1728',
          color: '#e7edf9',
          fontSize: { xs: '0.64rem', sm: '0.68rem' },
          fontWeight: 600,
          lineHeight: 1,
          minHeight: 0,
          height: { xs: 18, sm: 20 },
          py: 0,
          boxShadow: '0 8px 18px rgba(4,8,18,0.45)',
          border: 'none',
          borderTop: '1px solid rgba(76,227,163,0.45)',
          borderBottom: '1px solid rgba(76,227,163,0.45)',
          px: { xs: 1, sm: 1.6 },
          '& .MuiAlert-icon': { color: '#4ce3a3', mr: 0.6, fontSize: '0.8rem', py: 0 },
          '& .MuiAlert-message': { py: 0, lineHeight: 1, textAlign: 'center' },
          '& .MuiAlert-action': { mr: 0, py: 0, pl: 0.4, alignItems: 'center' },
          '& .MuiAlert-action .MuiIconButton-root': { p: 0.1, fontSize: '0.8rem' },
        }}
      >
        {toast.message}
      </Alert>
    </Box>
  )
}
