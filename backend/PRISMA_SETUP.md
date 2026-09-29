# MUTCU DMS — Prisma Setup Guide

## Step 1 — Get DB Password from Supabase
Go to Supabase Dashboard → Settings → Database → copy your database password

## Step 2 — Add to backend/.env
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.whghoonpfceqkhagnexk.supabase.co:5432/postgres"
```

## Step 3 — Install & Generate (run in backend/ folder)
```bash
npm install
npx prisma generate
npm run dev
```

You should see: [PRISMA] ✅ Database connection verified

## Step 4 — Deploy to Render
Add DATABASE_URL as environment variable in Render dashboard.
The build command `npm run build` now includes `npx prisma generate` automatically.

## Prisma Error Codes
- P2002 = Unique constraint (duplicate email/student_id)
- P2025 = Record not found
- P1008 = Query timeout
- P1001 = Cannot reach database (check DATABASE_URL)

## Files Changed
- backend/prisma/schema.prisma — Full DB schema
- backend/src/lib/prisma.js — Prisma client singleton
- backend/src/middleware/auth.js — Migrated to Prisma
- backend/src/routes/auth.js — Migrated to Prisma
- backend/src/routes/nominations.js — Migrated to Prisma
- backend/src/routes/members.js — Migrated to Prisma

## Remaining routes still use Supabase (works fine alongside Prisma)
admin.js, analytics.js, nc.js, treasury.js, users.js — migrate gradually
