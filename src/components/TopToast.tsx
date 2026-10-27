import { Alert, Snackbar } from '@mui/material'

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error'

export interface ToastMessage {
  message: string
  severity?: ToastSeverity
}

/**
 * Top-of-screen notification. Shown above the page content (below the app bar on
 * desktop) and dismissed automatically after `autoHideDuration`.
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
  return (
    <Snackbar
      open={Boolean(toast?.message)}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        zIndex: 3000,
        top: { xs: '10px', sm: '66px' },
        width: { xs: 'calc(100% - 24px)', sm: 'auto' },
        maxWidth: '520px',
      }}
    >
      <Alert
        severity={toast?.severity ?? 'info'}
        onClose={onClose}
        variant="outlined"
        sx={{
          alignItems: 'center',
          borderRadius: 2,
          bgcolor: '#0d1728',
          color: '#e7edf9',
          fontSize: { xs: '0.8rem', sm: '0.86rem' },
          fontWeight: 600,
          boxShadow: '0 14px 30px rgba(4,8,18,0.55)',
          border: '1px solid rgba(76,227,163,0.4)',
          '& .MuiAlert-icon': { color: '#4ce3a3' },
          '& .MuiAlert-message': { py: 0.4 },
        }}
      >
        {toast?.message}
      </Alert>
    </Snackbar>
  )
}
