# Site Tracker

Minimal custom-events tracker for the 10 demo sites: an ingest endpoint,
a Postgres table (Supabase), and a one-page dashboard.

## 1. Create the Supabase project

1. Go to supabase.com → New project (free tier is enough).
2. Once it's up, open the SQL Editor and paste in the contents of `schema.sql`, then Run.
3. Go to Project Settings → API and copy three values:
   - `Project URL` → this is `SUPABASE_URL`
   - `anon public` key → this is `SUPABASE_ANON_KEY`
   - `service_role` key → this is `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret, never put it in client-side code)

## 2. Deploy this project to Vercel

1. Push this folder to a new GitHub repo (e.g. `site-tracker`).
2. Import it into Vercel (github.com login already connected).
3. In Vercel → Project → Settings → Environment Variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DASHBOARD_SECRET` — pick any random string, this protects your dashboard from strangers guessing the URL
4. Deploy. Vercel will give you a URL like `https://site-tracker-xyz.vercel.app`.

## 3. View the dashboard

Go to `https://site-tracker-xyz.vercel.app/dashboard.html?key=YOUR_DASHBOARD_SECRET`

(The key is saved in the browser session after the first load, so you won't need it in the URL every time on the same device.)

## 4. Point the 10 demo sites at it

Replace the `window.va(...)` calls in each site's engagement script with a
`fetch()` to `https://site-tracker-xyz.vercel.app/api/track`. See
`snippet-example.html` for the exact block — same 30s/2min/5min visibility-aware
timer, just posting to your endpoint instead of Vercel Insights.

Each site should pass its own identifier as `site` so the dashboard can tell
them apart (e.g. `"drummnonds"`, `"pidgeon-judd"`, etc).
