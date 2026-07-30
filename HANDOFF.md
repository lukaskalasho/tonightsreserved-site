# HANDOFF — Tonight's Reserved app

**Read me first.** This document is written for the person or AI assistant who is going to finish setting this project up (get it onto GitHub, deploy it live, and connect the domain). It explains what the project is, what state it's in, and the exact remaining steps.

---

## 1. What this is

**Tonight's Reserved** is a marketplace web app. Businesses browse and hire **verified marketers** who offer any kind of marketing (social, photo/video, ads, SEO, web, etc.). Marketers set their own service prices. The platform takes a **20% commission on every booking**, handled entirely on the backend — **the commission must never be displayed to businesses or marketers in the UI.**

The owner is non-technical. Please do the account/deploy clicks *for* them where possible, and explain in plain language otherwise.

## 2. Current state — MVP milestone 1 (COMPLETE and tested)

Working today, out of the box, with no setup:

- Accounts: businesses and marketers can sign up and log in (token auth).
- Browse: businesses see verified marketers, filter by category, search.
- Profiles + services: each marketer lists services with their own prices.
- Booking + checkout: a business books; the 20% fee is recorded server-side only.
- Marketer dashboard: earnings, bookings, and a form to publish new services.
- Payments: **simulated** by default; real **Stripe Checkout** turns on when `STRIPE_SECRET_KEY` is set.

It has been run and tested end-to-end. Demo logins (password `password123`): `business@demo.com` (business), `kayla@demo.com` (marketer).

## 3. Tech stack (deliberately simple)

- **Backend:** one Node.js file, `server.js`, using only Node built-ins — **zero required npm dependencies**, so it runs with just `npm start`. (Stripe is an *optional* dependency, installed by `npm install`, loaded only when a key is present.)
- **Data:** a single JSON file, `data/db.json`, via `src/db.js`. Good for MVP; see limitations.
- **Frontend:** static files in `public/` (`index.html`, `app.js`, `styles.css`, logo images) — a single-page app that calls the backend API. Auth token stored in `localStorage`.
- **One codebase = website + (later) phone app.** It's a normal web app now; can be wrapped with Capacitor for the App/Play stores later without a rewrite.

## 4. Repo layout

```
server.js          backend: auth, marketplace, bookings, Stripe
package.json       start/seed scripts; stripe is an optionalDependency
render.yaml        one-click deploy config for Render
.env.example       all settings (copy to .env)
src/db.js          data store  (SWAP THIS for Postgres at scale)
src/password.js    password hashing (Node crypto scrypt)
src/seed.js        creates starter demo data
public/            the UI (index.html, app.js, styles.css, logo.png, wordmark.png)
data/db.json       seeded starter data (committed so first deploy isn't empty)
```

## 5. Remaining steps to finish (please do these)

### Step A — Put it on GitHub
The owner already has a GitHub account (their existing site tonightsreserved.com is on GitHub). Create a **private** repo named `tonights-reserved` and push this project to it. From the project folder:
```bash
git init && git add -A && git commit -m "Tonight's Reserved — MVP milestone 1"
git branch -M main
git remote add origin https://github.com/<their-username>/tonights-reserved.git
git push -u origin main
```

### Step B — Deploy it live (recommended: Render, free tier)
1. On https://render.com, **New + → Blueprint**, connect the `tonights-reserved` repo. It will read `render.yaml`.
2. Or **New + → Web Service**: runtime Node, build `npm install`, start `npm start`.
3. You'll get a live URL like `https://tonights-reserved.onrender.com`. Confirm the app loads and you can log in with the demo accounts.

### Step C — Connect the subdomain `app.tonightsreserved.com`
The owner wants the app at **app.tonightsreserved.com** and wants their **existing tonightsreserved.com site left untouched** (subdomain approach — do NOT change the root domain).
1. In Render → the service → **Settings → Custom Domains → Add** `app.tonightsreserved.com`. Render will show a CNAME target.
2. In wherever the domain's **DNS** is managed (need to confirm with owner — the domain is on GitHub Pages for the root site, so DNS is at their registrar/DNS host), add a **CNAME** record: name `app`, value = the target Render gives.
3. Set the `BASE_URL` env var in Render to `https://app.tonightsreserved.com` (needed for Stripe redirects).

### Step D — (When ready) Turn on real payments
Set `STRIPE_SECRET_KEY` in Render to a Stripe **test** key first (`sk_test_…`). The app then uses real Stripe Checkout in test mode. Going fully live = a live key **plus** Stripe Connect (milestone 2, below).

## 6. Environment variables (all optional; app runs without them)

| Var | Purpose |
|-----|---------|
| `PORT` | Server port (default 3000). Render sets this automatically. |
| `BASE_URL` | Public URL, e.g. `https://app.tonightsreserved.com`. Used for Stripe redirects. |
| `STRIPE_SECRET_KEY` | Turns on real Stripe Checkout. Use `sk_test_…` first. |
| `PLATFORM_FEE_PCT` | Commission rate, default `0.20` (20%). Backend only. |

## 7. Known limitations → milestone 2 (next build)

- **Data durability:** `data/db.json` is a file. On hosts with ephemeral disks (incl. Render free) it resets on redeploy. **Fix:** replace `src/db.js` with Postgres. This is the only file that needs to change — the rest of the app calls its helper functions.
- **Payouts / the 20% split:** currently the fee is *recorded* but money isn't actually split/paid out. **Fix:** integrate **Stripe Connect** (marketers onboard connected accounts; charge with `application_fee_amount` = 20% and `transfer_data.destination` = the marketer). Keep the fee invisible in the UI.
- **Marketer application + approval flow (IMPORTANT — owner emphasized this):** marketers already sign up as `verified: false` and are hidden from browse. Still to build: (1) an **application form** the marketer fills out after signup — business info, services + prices, and a **portfolio/proof-of-work upload** (needs **file storage** like S3/Cloudflare R2); (2) the application is saved as "pending" and **sent to the admin** (email alert + a review queue); (3) an **admin-only dashboard** where the owner reviews and clicks **Approve/Reject (with reason)**; (4) on approve → marketer becomes verified, goes live, gets a confirmation email; on reject → emailed a reason, can reapply. Marketer payout KYC is handled via Stripe Connect onboarding.
- **Also planned:** in-app messaging, post-booking reviews, email/SMS notifications.

## 8. Important product rule (do not break)

The **20% commission is backend-only**. The business pays the marketer's listed price; the marketer's dashboard shows earnings/bookings but **no fee line**. Client-facing API responses in `server.js` already strip `platformFee`/`marketerPayout` — keep it that way.
