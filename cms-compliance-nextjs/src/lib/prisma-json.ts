import type { Prisma } from '@prisma/client'

/** Serialize arbitrary values for Prisma JSON columns. */
export function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/** Safely read a nested key from a Prisma JsonValue. */
export function readJsonField(
  json: Prisma.JsonValue | null | undefined,
  key: string
): unknown {
  if (json == null || typeof json !== 'object' || Array.isArray(json)) return undefined
  return (json as Record<string, unknown>)[key]
}
