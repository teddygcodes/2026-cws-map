# Vercel migration setup

This repo now contains a Next.js shell (under `app/`) alongside the original
static app (`index.html` + sibling files at the repo root). Both can coexist
during the cutover — the legacy site keeps deploying to GitHub Pages until
Vercel is verified.

## What is already in place

| Piece | Location |
| --- | --- |
| Next.js app shell (App Router, JS) | `app/layout.jsx`, `app/page.jsx`, `app/LegacyApp.jsx`, `app/AuthHeader.jsx` |
| Auth.js v5 config | `auth.js` (Google OAuth only, pg adapter, database sessions) |
| Auth HTTP handler | `app/api/auth/[...nextauth]/route.js` |
| Pick sync API | `app/api/picks/route.js` (GET/PUT, session-guarded) |
| Postgres pool | `lib/db.js` |
| Ported worker validators | `lib/pick-validators.js` |
| Database schema | `db/schema.sql` (Auth.js tables + `user_picks`) |
| Legacy app, ready to serve | `public/legacy/app.css`, `app.js` (with sync shim), `data.js`, `photos.js`, `schedule.js`, `bracket.js` |
| Static assets | `public/images/`, `public/docs/og-card.png` |
| Worker CORS | `worker/worker.js` already allows `http://localhost:3000` |
| Build config | `package.json`, `next.config.mjs`, `jsconfig.json` |
| Env template | `.env.example` |

The legacy IIFE (`public/legacy/app.js`) now contains a small sync shim:
`syncPush()` debounce-PUTs to `/api/picks` whenever the user is signed in,
and `reconcileWithServer()` pulls the cloud copy on boot (first-login migration
or last-write-wins reconciliation). When signed out, nothing changes — picks
stay in `localStorage` like before.

## One-time external setup (you do this)

### 1. Google OAuth
- [Google Cloud Console](https://console.cloud.google.com/) → *APIs & Services* → *Credentials*.
- Create an OAuth 2.0 Client ID (Web application).
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - `https://<your-vercel-domain>/api/auth/callback/google` (prod)
- Copy the client ID + secret.

### 2. Vercel project + Postgres
- Push this repo (you do not need to remove `index.html` yet).
- [vercel.com](https://vercel.com) → *Add New* → import this GitHub repo.
- In the Vercel dashboard → *Storage* → create a **Postgres** database, attach
  it to the project. Vercel injects `POSTGRES_URL` automatically.
- Open the Vercel Postgres dashboard → SQL editor → paste the contents of
  `db/schema.sql` and run it. This creates the four Auth.js tables and
  `user_picks`.

### 3. Project environment variables (Vercel → Settings → Environment Variables)

```
AUTH_SECRET        # generate with: npx auth secret
AUTH_GOOGLE_ID     # from step 1
AUTH_GOOGLE_SECRET # from step 1
# POSTGRES_URL is auto-injected by the Vercel Postgres integration
```

For local dev, copy `.env.example` to `.env.local` and fill in the same
values.

### 4. Add the Vercel origin(s) to the Worker CORS allow-list
- After Vercel assigns your preview/prod URL, edit
  `worker/worker.js` → `ALLOWED_ORIGINS` and add them (the `localhost:3000`
  entry is already there).
- `cd worker && wrangler deploy`.

## Local dev

```bash
npm install         # already done once; rerun if package.json changes
npm run dev         # next dev — http://localhost:3000
```

The first request renders the legacy app with `window.__session.signedIn=false`;
sign-in flows hit `/api/auth/*`. Picks made signed-in PUT to `/api/picks` and
follow you across devices via the same login.

## When to cut over to Vercel-only

The legacy `index.html` + `data.js` at the repo root still deploys to GitHub
Pages via `.github/workflows/ci.yml`. Keep them until:
- You can sign in on the Vercel preview and your picks sync to a second
  device, and
- The Daily/Bracket views look right on the Vercel domain.

Then, in one commit:
- Delete `index.html`, `data.js`, `photos.js`, `schedule.js`, `bracket.js`,
  `images/` at the repo root (now duplicates of `public/legacy/` and
  `public/images/`).
- Remove the `deploy` job from `.github/workflows/ci.yml`.
- Update `scripts/smoke.mjs` default `BASE` to `http://localhost:3000` and
  the CI step to use `npm run build && npm run start` instead of
  `python3 -m http.server 4173`.
- Update `scripts/refresh-stats.mjs` and `scripts/validate.mjs` to read
  `public/legacy/data.js` and `public/legacy/app.js` / `public/images/`.
- Update `.github/workflows/refresh.yml` to `git add public/legacy/data.js`.
- Drop `https://teddygcodes.github.io` and `http://localhost:4173` from the
  Worker `ALLOWED_ORIGINS` and `wrangler deploy`.

Each of these is a small, isolated edit. They are deliberately left for the
cutover commit so the legacy deploy keeps working until you flip the switch.
