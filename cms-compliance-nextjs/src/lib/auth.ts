import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/types/cms'

const COOKIE_NAME = 'cms_session'
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production'
)

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}

import { isAuthEnabledForEnvironment } from '@/lib/app-config'

export function isAuthEnabled(): boolean {
  return isAuthEnabledForEnvironment()
}

export async function hashPassword(password: string): Promise<string> {
  const { hash } = await import('bcryptjs')
  return hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const { compare } = await import('bcryptjs')
  return compare(password, hash)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '24h')
    .sign(JWT_SECRET)
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.sub || !payload.email || !payload.role) return null
    return {
      id: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name || payload.email),
      role: payload.role as UserRole,
    }
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isAuthEnabled()) {
    return {
      id: 'system',
      email: 'system@localhost',
      name: 'System',
      role: 'admin',
    }
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive || !user.passwordHash) return null

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return null

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  }
}

export { COOKIE_NAME }
