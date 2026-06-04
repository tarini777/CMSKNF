import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import type { Readable } from 'stream'
import type { ResolvedDatasetSource } from '@/types/dataset-manifest'
import { openDatasetReadStream, describeDatasetSource } from '@/lib/storage/dataset-resolver'

const CSV_PARSE_OPTIONS = {
  columns: true,
  bom: true,
  relax_quotes: true,
  relax_column_count: true,
  skip_empty_lines: true,
  trim: true,
} as const

function pipeCsvParser(input: Readable) {
  return input.pipe(parse(CSV_PARSE_OPTIONS))
}

export async function* streamCsvRecordsFromReadable(input: Readable): AsyncGenerator<Record<string, string>> {
  const parser = pipeCsvParser(input)
  for await (const record of parser) {
    yield record as Record<string, string>
  }
}

export async function* streamCsvRecords(filePath: string): AsyncGenerator<Record<string, string>> {
  yield* streamCsvRecordsFromReadable(createReadStream(filePath))
}

export async function* streamCsvRecordsFromDataset(
  source: ResolvedDatasetSource
): AsyncGenerator<Record<string, string>> {
  const input = await openDatasetReadStream(source)
  try {
    yield* streamCsvRecordsFromReadable(input)
  } finally {
    input.destroy?.()
  }
}

export async function openDatasetCsvStream(source: ResolvedDatasetSource) {
  const input = await openDatasetReadStream(source)
  return {
    label: describeDatasetSource(source),
    stream: pipeCsvParser(input),
  }
}

export async function* batchAsync<T>(iterable: AsyncIterable<T>, size: number): AsyncGenerator<T[]> {
  let batch: T[] = []
  for await (const item of iterable) {
    batch.push(item)
    if (batch.length >= size) {
      yield batch
      batch = []
    }
  }
  if (batch.length > 0) {
    yield batch
  }
}

export function pickField(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key]) return row[key]
    const match = Object.entries(row).find(([k]) => k.toLowerCase() === key.toLowerCase())
    if (match?.[1]) return match[1]
  }
  return ''
}
