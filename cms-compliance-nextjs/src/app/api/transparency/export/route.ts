import { NextRequest, NextResponse } from 'next/server'
import { generateCmsOpenPaymentsCsv } from '@/lib/cms-export-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || undefined
    const csv = await generateCmsOpenPaymentsCsv(programYear || undefined)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="cms-open-payments-${programYear || new Date().getFullYear()}.csv"`,
      },
    })
  } catch (error) {
    console.error('CMS export error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate CMS export' }, { status: 500 })
  }
}
