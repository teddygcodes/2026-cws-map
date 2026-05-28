# Private-league backend (Cloudflare Worker + KV)

This optional backend powers **private leagues** for the Bracket Challenge (and,
later, the daily per-game pick'em). The main app is a static site on GitHub
Pages and works fully without it — leagues simply stay disabled until you deploy
this Worker and point the app at it.

**What it is:** a ~150-line Cloudflare Worker backed by one KV namespace. It's a
*dumb store* — it holds leagues + member entries and enforces a first-pitch
lock. It never fetches ESPN and never scores brackets; **all scoring happens in
the browser** (the app already has the resolver), so the Worker stays tiny.

**What it is NOT:** secure auth. A member's `memberId` is a random token the
browser generates so you can edit your own entry — anyone who obtains it could
overwrite that entry, and clearing browser storage forfeits edit ability. This
is a casual, clearly-"unofficial" private-league feature, not a system of record.

## One-time setup (you own the Cloudflare account)

1. **Create a free Cloudflare account** and install Wrangler:
   ```bash
   npm install -g wrangler        # or use: npx wrangler ...
   wrangler login
   ```
2. **Create the KV namespace** and copy the returned id:
   ```bash
   cd worker
   wrangler kv namespace create LEAGUES
   ```
3. **Edit `wrangler.toml`:** paste the id into `[[kv_namespaces]] id = "..."`.
   Optionally adjust `[vars] LOCK_TS` (epoch ms of first pitch; default is
   `1780070400000` = 2026-05-29T16:00:00Z). After this instant the Worker
   rejects new/edited bracket entries (so deploy *before* first pitch for the
   bracket-league to be usable).
4. **Deploy:**
   ```bash
   wrangler deploy
   ```
   Copy the deployed URL, e.g. `https://cws-map-leagues.<your-subdomain>.workers.dev`.
5. **Point the app at it:** in `../index.html`, set the one config line near the
   top of the script:
   ```js
   var LEAGUE_API = "https://cws-map-leagues.<your-subdomain>.workers.dev";
   ```
   Commit + push — CI deploys Pages and leagues go live. To disable again, set
   `LEAGUE_API = ""`.

## Local development

```bash
cd worker
wrangler dev          # serves the Worker at http://localhost:8787
```
Temporarily set `LEAGUE_API = "http://localhost:8787"` in `index.html`, serve the
app (`npm run serve`), and exercise create/join/standings. (CORS already allows
`localhost:4173`/`127.0.0.1:4173`.)

## Endpoints

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/league` | `{name}` | `{code,name,lockTs}` |
| `GET` | `/league/<code>` | — | `{name,lockTs,members:[{displayName,bracket,updated}]}` |
| `POST` | `/league/<code>/member` | `{memberId,displayName,bracket}` | the member, or `409 {error:"locked"}` after first pitch |
| `POST` | `/league/<code>/games` | `{memberId,displayName,picks:{gameKey:teamId}}` | `{games,updated}` — merges per-game picks, stamping `ts` per pick (NOT lock-gated) |

`bracket` is the app's opaque 26-char pick code (`encodePicks`); `games` keys are
`siteId_G#` / `super-<sd>_G#`. The `/games` endpoint stays open all tournament —
per-game fairness is enforced client-side at scoring time (a pick counts only if
its server `ts` predates that game's first pitch). CORS is locked to the app
origins (`https://teddygcodes.github.io` + localhost dev).

## Guardrails

- Per-IP league-creation cap and per-league member cap (best-effort; KV is
  eventually consistent). For stronger protection, add a **Rate Limiting Rule**
  in the Cloudflare dashboard for the Worker route.
- Display names are stripped of control characters and capped server-side, and
  HTML-escaped again on render in the app (defense in depth).
- Request bodies over ~2 KB are rejected.

## Teardown

It's seasonal. After Omaha you can `wrangler delete` the Worker and delete the
KV namespace in the dashboard, then set `LEAGUE_API = ""` in `index.html`.
