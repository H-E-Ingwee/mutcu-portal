const { PrismaClient } = require('@prisma/client')

// ─── Singleton Prisma Client ──────────────────────────────────────────────────
// NOTE: connection_limit in DATABASE_URL must be >= 10 for concurrent users
// Remove connection_limit=1 from DATABASE_URL or set it to 10+
const globalForPrisma = global

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  errorFormat: 'minimal',
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    }
  }
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// ─── Connection health check ──────────────────────────────────────────────────
// Use simple findFirst instead of $queryRaw to avoid prepared statement issues
async function pingPrisma() {
  try {
    await prisma.user.findFirst({ select: { id: true }, take: 1 })
    console.log('[PRISMA] ✅ Database connection verified')
    return true
  } catch (err) {
    console.error('[PRISMA] ❌ Database connection failed:', err.message)
    return false
  }
}

process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

module.exports = prisma
module.exports.pingPrisma = pingPrisma
