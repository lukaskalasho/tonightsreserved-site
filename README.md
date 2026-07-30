# Tonight's Reserved

A marketplace web app where **businesses hire verified marketers**. Marketers set their own service prices; Tonight's Reserved takes a **20% commission** on every booking (handled entirely on the backend — it's never shown to businesses or marketers).

This is **MVP milestone 1: the working foundation.** It runs today with zero setup and simulated payments, and is built to grow into the full product (real Stripe payouts, messaging, reviews) without rewrites.

---

## What works right now

- **Accounts** — businesses and marketers can sign up and log in.
- **Browse** — businesses see verified marketers, filter by category, and search.
- **Profiles & services** — each marketer has a profile and lists services *with their own prices*.
- **Booking & checkout** — a business books a service; the 20% commission is recorded behind the scenes.
- **Marketer dashboard** — earnings, bookings, and a form to publish new services.
- **Payments** — Stripe Checkout in test mode when you add a key; a safe *simulated* checkout until then, so everything is clickable out of the box.

---

## Run it on your computer (2 steps)

You need **Node.js 18 or newer** installed ([nodejs.org](https://nodejs.org)). Then, in this folder:

```bash
npm run seed     # creates starter data (5 demo marketers + a demo business)
npm start        # starts the app
```

Open **http://localhost:3000** in your browser.

> No `npm install` is required to run — the server has no mandatory dependencies. You only run `npm install` later, when you add Stripe.

### Demo logins (password for all: `password123`)

| Role | Email |
|------|-------|
| Business (buyer) | `business@demo.com` |
| Marketer (seller) | `kayla@demo.com` |
| Admin (you — reviews & approves marketers) | `admin@demo.com` |

**Try the approval flow:** sign up as a new marketer → you'll be asked to fill out an application → submit it → log out → log in as `admin@demo.com` → approve it → that marketer is now live and hireable.

Or just create a fresh account from the opening screen — toggle **I'm a business** or **I'm a marketer**.

---

## How the money works

- A business pays the marketer's listed price. Nothing extra is added on top.
- On each booking the backend records a **20% platform fee** and an **80% marketer payout**. These numbers are stored for your accounting but are **never sent to the app UI**.
- Change the rate anytime with the `PLATFORM_FEE_PCT` setting (e.g. `0.15` for 15%).

### Turning on real payments (Stripe)

1. Create a [Stripe account](https://stripe.com) and grab your **test** secret key (`sk_test_…`).
2. Copy `.env.example` to `.env` and set `STRIPE_SECRET_KEY`.
3. Run `npm install` (this pulls in the Stripe library), then `npm start`.

The app will now send buyers to real Stripe Checkout (in test mode — no real money) and mark the booking paid on return. Going fully live later means switching to a live key and setting up **Stripe Connect** so payouts split automatically to marketers — that's milestone 2 (see below).

---

## Putting it online

Because it's one small Node app, it deploys almost anywhere. The easiest path:

1. Push this folder to a **GitHub** repo.
2. Connect the repo to a host like **Render**, **Railway**, or **Fly.io** (all have free/cheap tiers). Set the start command to `npm start`.
3. Add your environment variables (from `.env`) in the host's dashboard.
4. Point your domain at it.

That same live URL is your **website**. To also ship it as an **iPhone/Android app** later, the same code gets wrapped with a tool like Capacitor — no rewrite needed.

> Note on data: this milestone stores data in a single `data/db.json` file, which is perfect for testing but resets on some hosts' redeploys. Milestone 2 swaps that for a real database (e.g. Postgres) — only `src/db.js` changes.

---

## Project layout

```
tonights-reserved/
├── server.js          # the backend (accounts, marketplace, bookings, Stripe)
├── package.json
├── .env.example       # settings (copy to .env)
├── src/
│   ├── db.js          # the data store (swap this for Postgres later)
│   ├── password.js    # password hashing
│   └── seed.js        # creates starter demo data
└── public/            # the app people see (UI)
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── logo.png
    └── wordmark.png
```

---

## What's next (milestone 2 and beyond)

- **Stripe Connect** — automatic 80/20 payout splitting and marketer payout accounts.
- **Real database** — swap the JSON file for Postgres so data is durable at scale.
- **Verification workflow** — the admin flow to review and approve marketers.
- **Messaging & reviews** — in-app chat and post-booking ratings.
- **Notifications** — email/SMS on new bookings.

Built as milestone 1 of the Tonight's Reserved build.
