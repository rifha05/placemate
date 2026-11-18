# PlaceMate backend (Express + PostgreSQL)

Serves the frontend from /public and exposes a REST API under /api.
Tables are created automatically on first start, and sample jobs are seeded.

## Folder layout
    server.js  db.js  analyzer.js  package.json  .env.example
    public/  index.html  api.js  style.css (yours)  script.js (yours)

## 1. Free database (Neon)
1. Sign up at https://neon.tech (free, no card, does not expire).
2. Create a project -> Dashboard -> "Connect" -> copy the connection string.
3. Paste it as DATABASE_URL in .env (local) or in your host's environment variables.

## 2. Run locally
    npm install
    cp .env.example .env      # then edit DATABASE_URL and JWT_SECRET
    npm start                 # http://localhost:3000

## 3. Host free on Render
1. Push this folder to GitHub (.env is git-ignored).
2. render.com -> New -> Web Service -> pick the repo.
3. Build command: npm install      Start command: npm start
4. Environment variables: NODE_ENV=production, DATABASE_URL, JWT_SECRET, ADMIN_EMAILS
5. Deploy. Health check path: /healthz

Free Render services sleep after ~15 min idle (first request takes ~30s). Data is safe in Neon.

## API
POST /api/auth/login  {email,password}  (creates account on first use)
GET  /api/me | /api/dashboard | /api/jobs | /api/roadmap | /api/interview/questions
POST /api/resume (multipart "resume", PDF <=5MB) | /api/jobs/:id/save | /api/interview/answer
PUT  /api/roadmap/:week {status}
GET  /api/admin/stats (admin only)
