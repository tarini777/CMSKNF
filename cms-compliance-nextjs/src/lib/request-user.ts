import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'

export async function getPerformedBy(): Promise<string> {
  const user = await getSessionUser()
  if (user) return user.email

  const headerStore = await headers()
  return headerStore.get('x-user-email') || 'system'
}
