import { NextResponse } from 'next/server'
import { getImplementedTransparencyRuleIds } from '@/lib/rule-registry'
import { getTransparencyRuleRegistry } from '@/lib/rule-citation-service'

export async function GET() {
  try {
    const registry = await getTransparencyRuleRegistry()
    const implementedIds = getImplementedTransparencyRuleIds()
    const implemented = implementedIds
      .map((id) => registry.find((r) => r.id === id))
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        registry,
        implemented,
        implementedIds,
        count: registry.length,
      },
    })
  } catch (error) {
    console.error('Error loading rule registry:', error)
    return NextResponse.json({ success: false, error: 'Failed to load rule registry' }, { status: 500 })
  }
}
