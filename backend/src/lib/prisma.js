const { PrismaClient } = require('@prisma/client')

// ─── Singleton Prisma Client ──────────────────────────────────────────────────
const globalForPrisma = global

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  errorFormat: 'minimal',
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
