import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, COOKIE_NAME, createSessionToken, isAuthEnabled } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    if (!isAuthEnabled()) {
      return NextResponse.json({
        success: true,
        data: { email: 'system@localhost', name: 'System', role: 'admin' },
        message: 'Auth disabled in development',
      })
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 })
    }

    const user = await authenticateUser(email, password)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSessionToken(user)
    const response = NextResponse.json({ success: true, data: user })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 })
  }
}
