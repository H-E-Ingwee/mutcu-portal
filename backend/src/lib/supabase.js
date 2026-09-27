const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
    global: {
      headers: { 'x-application-name': 'mutcu-dms' },
    },
  }
)

// ─── Query timeout wrapper ────────────────────────────────────────────────────
// Prevents Supabase queries from hanging indefinitely under load
function withTimeout(promise, ms = 8000, label = 'query') {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Database ${label} timed out after ${ms}ms. Please try again.`)), ms)
  )
  return Promise.race([promise, timeout])
}

// ─── Keep-alive ping (call this from index.js on startup) ────────────────────
async function pingDatabase() {
  try {
    await supabase.from('users').select('id', { count: 'exact', head: true })
    console.log('[DB] ✅ Supabase connection verified')
  } catch (err) {
    console.warn('[DB] ⚠️ Supabase ping failed:', err.message)
  }
}

module.exports = supabase
module.exports.withTimeout = withTimeout
module.exports.pingDatabase = pingDatabase
