# HireHub Starter

LinkedIn-like starter app with:
- Landing / role selection / signup / login
- Home feed with profile slide-in panel
- Node.js + Express API
- MySQL schema for users and profile data

## Option A: Run locally (manual)
1. `cp .env.example .env`
2. Update DB credentials
3. `npm install`
4. `npm run dev`
5. Open `http://localhost:3000`

## Option B: Run automatically with Docker (recommended)
This runs MySQL + app and keeps them running in background with restart policy.

1. `cp .env.example .env`
2. `docker compose up -d --build`
3. Open `http://localhost:3000`

Stop services:
- `docker compose down`

After first setup, containers auto-restart (because `restart: unless-stopped`) so you do not need to manually run `npm run dev` every time.

## GitHub Pages
- `.github/workflows/pages.yml` deploys only `frontend/` static files.
- GitHub Pages does not run Node.js or MySQL backend.
- To make signup/login work on Pages, host backend separately and set `window.HIREHUB_API_BASE` in `frontend/config.js`.
