<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4575aed9-046b-475c-abce-1db4e6194975

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Authentication

The Storage Sharing / device-pairing features (`src/api-client.ts`) call the real backend
(`backend/`, `VITE_API_BASE_URL`, default `http://localhost:8080`), which requires a signed-in
session — every route except `/api/v1/auth/{register,login,refresh}` needs a valid JWT.

**Sign in through the UI, not devtools.** Visiting the app with no session redirects you to
`/login`, which has both a **Log In** and a **Sign Up** tab (toggle at the top of the form):

- **Sign Up** — name, email, password (min. 8 characters) → `POST /api/v1/auth/register`.
- **Log In** — email, password → `POST /api/v1/auth/login`.
- On success you're redirected to `/`. On failure, the backend's error message (e.g. "An account
  with this email already exists.") is shown inline.
- Appending `?demo=1` to `/login` pre-fills a demo email/password in the form fields — it doesn't
  create or guarantee that account exists; register it once locally if you want to reuse it.

**Where the session lives.** A successful login/register stores the access token under the
`peervault_token` localStorage key (plus a refresh token and a small `{id, email, name}` user
record under two adjacent keys) via `src/api/client.ts`'s `setSession()`. Every request made
through `apiFetch` (`src/api/client.ts`) or the `src/api-client.ts` wrappers built on it reads
`peervault_token` and attaches `Authorization: Bearer <token>` automatically — there is no manual
`localStorage.setItem('peervault_token', ...)` step anymore.

**Session expiry.** Access tokens are short-lived (15 minutes server-side); a 401 from any request
clears the stored session and redirects to `/login?reason=unauthorized`. There's no silent
token-refresh yet — expiry just means signing in again, which is the same UX as a first-time visit.

**Relevant files:** `src/api/client.ts` (shared `apiFetch`, token storage, 401 → `/login` redirect),
`src/api/authApi.ts` (`register`/`login` calls), `src/pages/LoginPage.tsx` (the form), `src/App.tsx`
(routes `/login` vs. the dashboard, and redirects unauthenticated visitors).

## Cross-device / LAN setup

Device pairing (`src/components/QrPairingModal.tsx`) is meant to be used from two separate devices —
generate a QR on one, scan it on the other. That only works once three things line up; skipping any
one of them is what "I scanned the QR and nothing happened" almost always turns out to be.

**1. The QR is scanned *inside the app*, not with your phone's camera.** The QR encodes a
`peervault://pair?session=...&fp=...` link — a made-up URI scheme with no OS-level handler on any
phone, and **not an HTTP(S) URL** — it is only ever parsed (read back into plain `sessionId`/
`fingerprint` strings by `parsePairingUri` in `QrPairingModal.tsx`), never navigated to or fetched.
Scanning it with the stock Camera/QR app, or pasting the raw string into a browser or search box,
doesn't open anything PeerVault-related. If you've seen a generic "here's what this string looks
like" page or search result after scanning it that way — that page isn't part of PeerVault and isn't
malfunctioning; it's just the browser's fallback for a link scheme it doesn't recognize, and it means
you scanned with the wrong tool. The joining device needs this same PeerVault web app open in a
browser, on its own **Scan QR** tab (or its "enter details manually" fallback, which accepts either
the two values separately or the whole pasted link) — that's the only thing that knows how to read
this QR. A QR that doesn't decode to a `peervault://pair?...` link at all shows "This QR code is not
a valid PeerVault pairing code" right there in the Scan tab — it never falls through to any other
page.

**2. Both devices need to reach the backend by your PC's LAN IP, not `localhost`.** On a phone,
`localhost` means the phone itself. Find your PC's LAN IP:
```powershell
ipconfig          # Windows — look for "IPv4 Address" under your Wi-Fi/Ethernet adapter
```
```bash
ifconfig          # macOS/Linux, or: ip addr
```
Then:
1. Set `frontend/.env.local` (create it if it doesn't exist — it's gitignored) to that IP:
   ```env
   VITE_API_BASE_URL=http://<LAN-IP>:8080
   VITE_WS_BASE_URL=http://<LAN-IP>:8080
   ```
2. Restart `npm run dev` (env changes aren't picked up live). It already binds `--host=0.0.0.0`, so
   it's reachable from other devices on the same network without any change on that side.
3. On **both** the PC and the phone, open `http://<LAN-IP>:3000` — not `http://localhost:3000` on
   the PC — so both sides share one consistent origin (see CORS below).

**3. The backend's CORS allow-list has to match that same origin.** `backend/config-repo/
api-gateway.yml` and `notification-service`'s WebSocket config both gate on `FRONTEND_ORIGIN`
(default `http://localhost:3000`). Set it to the same LAN origin from step 2 in `backend/.env` (see
`backend/.env.example`) before starting the backend — either `docker compose up` or
`scripts/run-native.ps1` already reads it from there the same way they read `MONGODB_URI`. A single
value like `http://<LAN-IP>:3000` works, or a comma-separated list (`http://localhost:3000,
http://<LAN-IP>:3000`) if you want `localhost` on the PC to keep working alongside the phone.

**4. Firewall.** Windows Firewall blocks inbound LAN connections to dev ports by default. Allow
inbound TCP **3000** (frontend) and **8080** (backend gateway) for your private network — either via
the "Allow an app through Windows Firewall" UI the first time `npm run dev`/the gateway prompts you,
or:
```powershell
New-NetFirewallRule -DisplayName "PeerVault dev (3000/8080)" -Direction Inbound -Protocol TCP -LocalPort 3000,8080 -Profile Private -Action Allow
```

**5. Camera access on a LAN IP.** Browsers only allow `getUserMedia` (the camera the Scan QR tab
needs) on a *secure context* — `https://` or `http://localhost`. A plain `http://<LAN-IP>:3000`
origin is not one, and some mobile browsers will refuse camera access there. If the Scan tab reports
a camera error:
- Enter the pairing details manually instead — the Scan tab has a "Camera not working? Enter details
  manually" fallback that takes the same `session`/`fp` values the QR encodes, typed by hand.
- Or get a real HTTPS origin with a tunnel, e.g. [ngrok](https://ngrok.com/):
  ```bash
  ngrok http 3000
  ```
  Open the resulting `https://<subdomain>.ngrok-free.app` URL on the phone instead of the LAN IP,
  and set `FRONTEND_ORIGIN` (backend) to that same ngrok URL so CORS still matches. `VITE_API_BASE_URL`/
  `VITE_WS_BASE_URL` can stay pointed at the LAN IP for the backend, or get their own tunnel too if the
  backend also needs to be reachable over HTTPS (rarely necessary — only the frontend origin needs to
  be secure for the camera).

If pairing still fails after all of this, open devtools on the scanning device: `QrPairingModal`
logs the exact `API_BASE_URL` it's using to the console when the modal opens, and the modal's footer
always shows it too — confirm it's the LAN IP (or tunnel URL), not `localhost`.
