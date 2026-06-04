#!/usr/bin/env tsx
import path from 'path'
import { PrismaClient } from '@prisma/client'
import {
  applyRemovedDeletedRecords,
  importCmsPufDataset,
  importCmsRecipientProfiles,
  loadCmsPufDatasetSources,
  type BulkImportOptions,
} from '@/lib/lineage/cms-puf-bulk-import'
import { describeDatasetSource } from '@/lib/storage/dataset-resolver'

const prisma = new PrismaClient()

function parseArgs(argv: string[]) {
  const args = new Map<string, string | boolean>()
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args.set(key, true)
    } else {
      args.set(key, next)
      i += 1
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const manifestPath = args.get('manifest')
    ? path.resolve(String(args.get('manifest')))
    : undefined
  const phase = String(args.get('phase') || 'all')
  const batchSize = Number(args.get('batch-size') || 200)
  const resume = args.has('resume')
  const backend = args.get('backend') ? (String(args.get('backend')) as 'local' | 'gdrive') : undefined

  const { manifest, sources } = loadCmsPufDatasetSources(manifestPath, backend)

  const options: BulkImportOptions = {
    batchSize,
    resume,
    onProgress: (message) => console.log(`[cms-puf-import] ${message}`),
  }

  console.log(`[cms-puf-import] Manifest: ${manifest.publication.label}`)
  console.log(`[cms-puf-import] Storage backend: ${manifest.storage.backend}`)
  console.log(`[cms-puf-import] Profiles source: ${describeDatasetSource(sources.profiles)}`)
  console.log(`[cms-puf-import] Phase: ${phase} | batchSize=${batchSize} | resume=${resume}`)

  const { mkdirSync } = await import('fs')
  mkdirSync(path.join(process.cwd(), 'logs'), { recursive: true })

  const job = await prisma.jobRun.create({
    data: {
      jobKey: 'cms_puf_bulk_import',
      status: 'running',
      triggeredBy: 'scripts/import-cms-puf.ts',
      resultSummary: {
        phase,
        manifestPath: manifestPath || 'default',
        batchSize,
        resume,
        backend: backend || manifest.storage.backend,
      },
    },
  })

  try {
    let summary

    if (phase === 'profiles') {
      const profileResult = await importCmsRecipientProfiles(prisma, sources.profiles, options)
      summary = { profilesImported: profileResult.imported, profilesSkipped: profileResult.skipped }
    } else if (phase === 'removed') {
      let removedApplied = 0
      for (const files of Object.values(sources.years)) {
        if (files.removed) {
          removedApplied += await applyRemovedDeletedRecords(prisma, files.removed, options)
        }
      }
      summary = { removedApplied }
    } else {
      summary = await importCmsPufDataset(prisma, sources, options)
    }

    await prisma.jobRun.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        resultSummary: summary as object,
      },
    })

    console.log('[cms-puf-import] Complete:', JSON.stringify(summary, null, 2))
  } catch (error) {
    await prisma.jobRun.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

main()
  .catch((error) => {
    console.error('[cms-puf-import] Failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
