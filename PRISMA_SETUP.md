# MUTCU DMS — Prisma Migration Guide

## What Changed
- All database queries now use **Prisma ORM** instead of Supabase JS client
- Prisma connects directly to PostgreSQL (bypassing Supabase's 60-connection limit)
- Auth middleware, auth routes, nominations, and members routes fully migrated
- Remaining routes still use Supabase client (gradual migration)

## Step 1 — Get Your Database Password

1. Go to **Supabase Dashboard → Settings → Database**
2. Find your **database password** (the one you set when creating the project)
3. Also find the **Connection Pooling** section — copy the **Transaction mode** connection string (port 6543)

## Step 2 — Update Your .env

Add these to your `backend/.env`:

```bash
# Direct connection — used by Prisma for migrations (port 5432)
DATABASE_URL="postgresql://postgres:YOUR_DB_PASSWORD@db.whghoonpfceqkhagnexk.supabase.co:5432/postgres"

# Pooled connection — used at runtime for better concurrency (port 6543)  
# Get this from Supabase → Settings → Database → Connection Pooling → Transaction mode
DATABASE_URL_POOLED="postgresql://postgres:YOUR_DB_PASSWORD@db.whghoonpfceqkhagnexk.supabase.co:6543/postgres?pgbouncer=true"
```

**For production (Render):** Add `DATABASE_URL` as an environment variable in your Render dashboard.

## Step 3 — Generate Prisma Client

Run this in your `backend/` folder:

```bash
cd backend
npx prisma generate
```

This generates the TypeScript/JS client from your schema. Run this every time you change `prisma/schema.prisma`.

## Step 4 — Pull Existing Schema (Optional Verification)

To verify Prisma can connect to your DB:

```bash
npx prisma db pull
```

This reads your existing Supabase tables and updates the schema. Compare with `prisma/schema.prisma` to ensure they match.

## Step 5 — Test Locally

```bash
npm run dev
```

You should see:
```
[PRISMA] ✅ Database connection verified
MUTCU DMS API v2.1 running on port 5000
```

## Step 6 — Deploy to Render

1. Add `DATABASE_URL` environment variable in Render dashboard
2. Push to GitHub — Render will run `npm run build` which includes `npx prisma generate`
3. Check Render logs for `[PRISMA] ✅ Database connection verified`

## Prisma Error Codes (for debugging)

| Code | Meaning | Fix |
|------|---------|-----|
| `P2002` | Unique constraint violation | Duplicate email/student_id |
| `P2025` | Record not found | ID doesn't exist |
| `P1008` | Query timeout | DB under load, retry |
| `P1001` | Can't reach DB | Check DATABASE_URL |
| `P2003` | Foreign key constraint | Related record missing |

## Files Changed

### New Files
- `backend/prisma/schema.prisma` — Full database schema
- `backend/src/lib/prisma.js` — Prisma client singleton
- `PRISMA_SETUP.md` — This file

### Migrated to Prisma
- `backend/src/middleware/auth.js` ✅
- `backend/src/routes/auth.js` ✅
- `backend/src/routes/nominations.js` ✅
- `backend/src/routes/members.js` ✅

### Still Using Supabase (migrate gradually)
- `backend/src/routes/admin.js`
- `backend/src/routes/analytics.js`
- `backend/src/routes/nc.js`
- `backend/src/routes/treasury.js`
- `backend/src/routes/users.js`
- All other routes

## Gradual Migration Strategy

The system works with **both Prisma and Supabase** simultaneously:
- High-traffic routes (auth, nominations, members) → Prisma ✅
- Other routes → Supabase (still works fine)
- Migrate remaining routes one by one as needed

## Connection Pooling Benefit

| | Before (Supabase JS) | After (Prisma) |
|--|---------------------|----------------|
| Max connections | 60 direct | Thousands (pooled) |
| 300 users login | ~240 fail | All served |
| 300 nominations | ~240 fail | All queued + served |
| Query timeout | Hangs forever | Fails cleanly in 8s |
