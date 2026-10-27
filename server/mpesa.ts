/**
 * Safaricom M-Pesa Daraja (STK push) helper.
 *
 * Configure with:
 *   MPESA_ENV=sandbox|production
 *   MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET
 *   MPESA_SHORTCODE (Paybill or Till)
 *   MPESA_PASSKEY
 *   MPESA_CALLBACK_URL (public HTTPS URL, e.g. https://kambumbu.com/api/payments/mpesa/callback)
 *
 * Without credentials the app still records the payment as pending and an admin
 * can confirm it manually from the tournament ledger.
 */
const BASE_URL =
  process.env.MPESA_ENV?.trim() === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim() ?? ''
const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim() ?? ''
const shortcode = process.env.MPESA_SHORTCODE?.trim() ?? ''
const passkey = process.env.MPESA_PASSKEY?.trim() ?? ''
const callbackUrl = process.env.MPESA_CALLBACK_URL?.trim() ?? ''

export const isMpesaConfigured = () =>
  Boolean(consumerKey && consumerSecret && shortcode && passkey && callbackUrl)

const timestamp = () => {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

const getAccessToken = async (): Promise<string | null> => {
  try {
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const response = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    if (!response.ok) {
      return null
    }
    const body = (await response.json()) as { access_token?: string }
    return body.access_token ?? null
  } catch {
    return null
  }
}

export interface StkPushResult {
  initiated: boolean
  reference?: string
  message?: string
}

/** Sends an STK push to the payer's phone. Returns `initiated: false` when unconfigured. */
export const initiateStkPush = async (payload: {
  phone: string
  amount: number
  accountReference: string
  description: string
}): Promise<StkPushResult> => {
  if (!isMpesaConfigured()) {
    return { initiated: false, message: 'M-Pesa is not configured on this server.' }
  }

  const token = await getAccessToken()
  if (!token) {
    return { initiated: false, message: 'Could not authenticate with M-Pesa.' }
  }

  const time = timestamp()
  const password = Buffer.from(`${shortcode}${passkey}${time}`).toString('base64')

  try {
    const response = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: time,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.max(1, Math.round(payload.amount)),
        PartyA: payload.phone,
        PartyB: shortcode,
        PhoneNumber: payload.phone,
        CallBackURL: callbackUrl,
        AccountReference: payload.accountReference.slice(0, 12),
        TransactionDesc: payload.description.slice(0, 60),
      }),
    })

    const body = (await response.json()) as {
      CheckoutRequestID?: string
      ResponseDescription?: string
      errorMessage?: string
    }

    if (!response.ok) {
      return { initiated: false, message: body.errorMessage ?? 'M-Pesa rejected the request.' }
    }

    return {
      initiated: true,
      reference: body.CheckoutRequestID,
      message: body.ResponseDescription ?? 'Payment prompt sent.',
    }
  } catch (error) {
    return {
      initiated: false,
      message: error instanceof Error ? error.message : 'Could not reach M-Pesa.',
    }
  }
}
