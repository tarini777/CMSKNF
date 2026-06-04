import { NextRequest, NextResponse } from 'next/server'
import {
  loadDatasetManifest,
  resolveCmsPufDatasetSources,
  summarizeManifest,
} from '@/lib/storage/dataset-manifest-service'
import { isGDriveConfigured } from '@/lib/storage/gdrive-client'
import { describeDatasetSource } from '@/lib/storage/dataset-resolver'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'manifest'

    if (action === 'manifest') {
      const manifest = loadDatasetManifest()
      return NextResponse.json({
        success: true,
        data: {
          ...summarizeManifest(manifest),
          gdriveConfigured: isGDriveConfigured(),
        },
      })
    }

    if (action === 'sources') {
      const backend = searchParams.get('backend') as 'local' | 'gdrive' | null
      const { sources } = resolveCmsPufDatasetSources(undefined, backend || undefined)
      return NextResponse.json({
        success: true,
        data: {
          profiles: { ...sources.profiles, label: describeDatasetSource(sources.profiles) },
          years: Object.fromEntries(
            Object.entries(sources.years).map(([year, files]) => [
              year,
              {
                general: { ...files.general, label: describeDatasetSource(files.general) },
                research: { ...files.research, label: describeDatasetSource(files.research) },
                ownership: { ...files.ownership, label: describeDatasetSource(files.ownership) },
                removed: files.removed
                  ? { ...files.removed, label: describeDatasetSource(files.removed) }
                  : undefined,
              },
            ])
          ),
        },
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Dataset API failed',
      },
      { status: 500 }
    )
  }
}
