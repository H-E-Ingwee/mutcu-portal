# MUTCU Digital Management System v2.0

## Stack
- **Frontend**: React + Vite + TailwindCSS → Vercel
- **Backend**: Node.js + Express → Render
- **Database**: Supabase (PostgreSQL)
- **Storage**: Cloudinary
- **Email**: Gmail SMTP

## Setup

### 1. Database (Supabase)
Run `backend/src/db/schema.sql` in Supabase SQL Editor.

### 2. Backend (Render)
1. Push to GitHub
2. Create new Web Service on Render → connect GitHub repo
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables from `.env.example`

### 3. Frontend (Vercel)
1. Create new project on Vercel → connect GitHub repo
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable: `VITE_API_URL=https://your-render-url.onrender.com/api`

### 4. Domain
Point `portal.mutcu.org` to Vercel in Hostinger DNS settings.

## Login
- Email: admin@mutcu.org
- Password: MutcuAdmin@2026!
