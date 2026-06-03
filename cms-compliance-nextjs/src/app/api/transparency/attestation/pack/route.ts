import { NextRequest, NextResponse } from 'next/server'
import { generateAttestationPackPdf } from '@/lib/attestation-pack-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())

    const pdf = await generateAttestationPackPdf({
      programYear,
      attesterName: searchParams.get('attesterName') || undefined,
      attesterTitle: searchParams.get('attesterTitle') || undefined,
      companyName: searchParams.get('companyName') || undefined,
    })

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="attestation-pack-${programYear}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Attestation pack error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate attestation pack' }, { status: 500 })
  }
}
