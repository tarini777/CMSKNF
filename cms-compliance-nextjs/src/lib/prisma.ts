import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient()
}

/** Dev hot-reload can keep a PrismaClient from before `prisma generate`; recreate if lineage models are missing. */
function isStalePrismaClient(client: PrismaClient | undefined): boolean {
  if (!client) return true
  return typeof (client as PrismaClient & { dataSource?: { upsert?: unknown } }).dataSource?.upsert !== 'function'
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (!isStalePrismaClient(cached)) {
    return cached!
  }

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = getPrismaClient()
