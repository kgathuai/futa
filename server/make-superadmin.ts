import 'dotenv/config'
import { connectDatabase, store } from './store.ts'

const email = process.argv[2]?.trim().toLowerCase() ?? ''
const requestedRole = (process.argv[3] ?? '').trim().toLowerCase()
const role = requestedRole === 'admin' ? 'admin' : 'superadmin'

if (!email) {
  console.error('Usage: npm run make-superadmin -- you@example.com [admin|superadmin]')
  process.exit(1)
}

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/futa_monolith'

try {
  await connectDatabase(mongoUri)
  const account = await store.setAccountRoleByEmail(email, role)

  if (!account) {
    console.error(`No account found with email: ${email}`)
    console.error('Register the account in the app first, then run this again.')
    process.exit(1)
  }

  console.log(`Updated ${account.name} <${account.email}> to role: ${account.role}`)
  process.exit(0)
} catch (error) {
  console.error('Failed to update account role:', error)
  process.exit(1)
}
