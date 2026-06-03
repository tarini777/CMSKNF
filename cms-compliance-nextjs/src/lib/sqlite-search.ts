/**
 * Text search filters compatible with SQLite (no `mode: 'insensitive'`).
 * Prisma SQLite provider rejects insensitive mode and returns 500.
 */
export function buildContainsSearch(
  fields: string[],
  search: string
): { OR: Record<string, { contains: string }>[] } {
  const trimmed = search.trim()
  if (!trimmed) return { OR: [] }

  const variants = [...new Set([trimmed, trimmed.toLowerCase(), trimmed.toUpperCase()])]

  return {
    OR: fields.flatMap((field) =>
      variants.map((term) => ({
        [field]: { contains: term },
      }))
    ),
  }
}
