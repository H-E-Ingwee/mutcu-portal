# MUTCU Library — Final Update Package
# Drop each file into your project at the exact path shown, then push to GitHub.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — DATABASE (run ONCE in Supabase SQL Editor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  backend/src/db/schema_library.sql
  → Creates library_books, library_articles, library_bookmarks
  → Seeds all 35 books with real Google Drive links
  → Skip if you already ran this in a previous session

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — COPY FILES (exact paths)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  backend/src/index.js              → backend/src/index.js
  backend/src/routes/library.js     → backend/src/routes/library.js
  frontend/src/App.jsx              → frontend/src/App.jsx
  frontend/src/components/Layout.jsx → frontend/src/components/Layout.jsx
  frontend/src/pages/Dashboard.jsx  → frontend/src/pages/Dashboard.jsx
  frontend/src/pages/Library.jsx    → frontend/src/pages/Library.jsx
  frontend/src/pages/LibraryAnalytics.jsx → frontend/src/pages/LibraryAnalytics.jsx

STEP 3 — Push to GitHub → Render + Vercel auto-deploy ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT CHANGED IN THIS UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. LIBRARY VISIBLE TO ALL MEMBERS
   - E-Library nav link now appears for EVERY logged-in member
     (previously hidden from Treasurer role)
   - Route /library is accessible to all authenticated users

2. ARTICLES SECTION REMOVED
   - Simplified to Books + My Library tabs only
   - Cleaner, more focused experience

3. VICE SECRETARY — FULL PRIVILEGES
   - Dedicated "Vice Secretary" sidebar section with all secretary tools:
     Member Register, Pending Approvals (with badge), Messages,
     Bulk Email, Manage Calendar, Analytics, Disciplinary,
     Requisitions, Library Analytics
   - Pending changes badge now shows for vice_secretary
   - Can add/edit/delete books and view Library Analytics

4. IN-PORTAL BOOK PREVIEW
   - Click any book card → opens a preview modal with Google Drive embed
   - Fullscreen toggle button in preview header
   - Bookmark and Open buttons inside preview
   - Graceful fallback if Drive doesn't allow embedding
   - Admin Edit button visible in preview header

5. COPYRIGHT POLICY NOTICE
   - Amber banner shown at top of library on first visit
   - Dismissible (remembered for the session)
   - Also shown as a small strip at bottom of every preview
   - Text: personal use only, MUTCU doesn't own copyright,
     support authors by buying originals, no redistribution

6. IMPROVED BOOK CARDS
   - Hover overlay shows "Preview" eye icon
   - Admin edit/delete controls appear on hover
   - "Preview & Read" button replaces old "Read" button

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLE PERMISSIONS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  All members          → Browse, search, filter, bookmark, preview
  vice_secretary       → All above + Add/Edit/Delete books + Analytics
  cu_secretary         → All above + Add/Edit/Delete books + Analytics
  ec_admin/super_admin → Full access including all admin tools
