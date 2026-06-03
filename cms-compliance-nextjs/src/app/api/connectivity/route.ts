import { NextResponse } from 'next/server'
import { runConnectivityChecks } from '@/lib/connectivity-service'

export async function GET() {
  try {
    const report = await runConnectivityChecks()
    return NextResponse.json({ success: true, data: report })
  } catch (error) {
    console.error('Connectivity check failed:', error)
    return NextResponse.json(
      { success: false, error: 'Connectivity check failed' },
      { status: 500 }
    )
  }
}
