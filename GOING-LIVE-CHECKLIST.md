# Tonight's Reserved — Everything Needed to Become a Real, Live Website

A complete checklist to go from "code that works" to "a real website where people register, data is stored, payments flow, and you're legally covered." Grouped by area. **Not legal advice — have a lawyer review the legal section, especially because this is a marketplace handling payments.**

---

## 1. Getting it online (infrastructure)

- [ ] **A host** to run the app 24/7 (Render, Railway, Fly.io). This is the server that keeps the site up.
- [ ] **A real database (Postgres)** — RIGHT NOW data is stored in a file that resets. Without a real database, *registrations don't truly persist.* This is the #1 thing needed for "people actually register." (Swap `src/db.js` for Postgres.)
- [ ] **Domain pointed at it** — `app.tonightsreserved.com` (subdomain; leave your existing site alone).
- [ ] **HTTPS / SSL certificate** — the padlock in the browser. Required for security and for taking payments. Usually automatic on modern hosts.
- [ ] **Secrets management** — keep keys (Stripe, database) in the host's environment settings, never in the code.
- [ ] **File storage** (Amazon S3 or Cloudflare R2) — a place to hold files marketers upload (portfolios, images, documents in their application).
- [ ] **Automatic database backups** — so you never lose users' data.

## 2. Real user registration & accounts

- [ ] **Signup / login** — built already; needs to run against the real database.
- [ ] **Email verification** — confirm the email is real when someone registers (sends a "click to confirm" link).
- [ ] **Password reset** — a "forgot password" flow.
- [ ] **Secure passwords & sessions** — passwords are already hashed; keep sessions secure.
- [ ] **Bot / spam protection** — a CAPTCHA + rate limiting on signup so bots can't flood you.
- [ ] **Roles & permissions** — business vs marketer vs admin (you).
- [ ] **Terms acceptance at signup** — a checkbox recording that they agreed to your Terms, with a timestamp.

## 3. Where the forms & data actually go

- [ ] **Forms → backend → database.** Every form (signup, create service, booking) sends data to the backend, which validates it and saves it to the database. (This flow is already built — it just needs the real database from #1.)
- [ ] **A transactional email service** (SendGrid, Postmark, Resend) so the app can actually *send* email: verification links, password resets, booking confirmations, receipts, and "you've been hired" alerts to marketers.
- [ ] **A sending address on your domain** (`noreply@tonightsreserved.com`) plus email authentication (SPF/DKIM records) so your emails don't land in spam.
- [ ] **Admin notifications** — you get an email/text when someone registers or books.
- [ ] **Validation on every field** — reject bad or malicious input before it's saved.

## 4. Payments — the money (has legal weight)

- [ ] **A fully verified Stripe account** — business identity + bank account confirmed.
- [ ] **Stripe Connect** — so marketers connect their own payout accounts and the **20% split happens automatically** (business pays, marketer gets 80%, you keep 20% — invisible to users).
- [ ] **Marketer identity verification (KYC)** — Stripe legally must verify anyone it pays out (collects their SSN/EIN + bank info). Stripe runs this flow for you.
- [ ] **Refunds, failed payments, and disputes/chargebacks** — handling for when a payment goes wrong.
- [ ] **Tax reporting (1099s)** — you (the platform) are responsible for issuing tax forms to marketers who earn over the threshold. Stripe can generate and file these.
- [ ] **Sales tax** — whether it applies depends on your state and service type. Ask an accountant.
- [ ] **PCI compliance** — using Stripe Checkout keeps card numbers off your servers, which keeps you compliant. Never store card data yourself.

## 5. Legal & compliance (get a lawyer — here's the list)

- [ ] **Form a business entity (LLC)** — so the *business*, not you personally, holds the liability. Get an **EIN** (tax ID).
- [ ] **Business bank account** — for the LLC, linked to Stripe.
- [ ] **Terms of Service** — the rules of using the site; limits your liability.
- [ ] **Privacy Policy** — legally required (California's CCPA; GDPR if any EU users; also required by Apple/Google for app stores). States what data you collect and how it's used.
- [ ] **Marketplace / User Agreement** — the terms between you, businesses, and marketers: who's responsible if a job goes badly, that marketers are **independent contractors (not your employees)**, payment terms, the 20% commission disclosure, and the dispute process.
- [ ] **Independent contractor agreement** for marketers — protects you on taxes and liability.
- [ ] **Refund & cancellation policy** — clear rules shown *before* someone pays.
- [ ] **Dispute resolution policy** — how disagreements between a business and marketer are settled (often an arbitration clause in the Terms).
- [ ] **Acceptable use / content policy** — what marketers may and may not offer.
- [ ] **Cookie consent banner** — if you use analytics or cookies (needed for GDPR/CCPA).
- [ ] **DMCA / copyright policy** — since marketers upload portfolios and images.
- [ ] **Data security & breach obligations** — you're storing personal and payment data; the law requires you to protect it and notify people if it's breached.
- [ ] **Age requirement** — state that users must be 18+ (they're forming contracts and paying).
- [ ] **Insurance** — general liability, and consider professional liability + cyber insurance for a platform holding money and data.
- [ ] **Trademark** — register "Tonight's Reserved" to protect the brand (far more worthwhile than a patent).

## 6. Marketer application & approval (the verification flow — your core promise)

This is the gate that makes marketers "verified." No marketer is visible to businesses until you approve them.

- [ ] **Application form** — after signing up as a marketer, the person fills out an application: business/contact info, the services + prices they want to offer, a **portfolio / proof of work** (links + uploaded images/files), past results, and agreement to the marketer/contractor terms.
- [ ] **Pending state** — on submit, the application is saved as **"pending review"** and the marketer stays **hidden from businesses** (can't be found or hired).
- [ ] **It's sent to you** — the application lands in an **admin review queue**, and you get an **email/text alert** that a new marketer applied.
- [ ] **Admin dashboard** — a private, admin-only area where you see the queue and each application's details + portfolio.
- [ ] **Approve / Reject** — you click Approve or Reject (with a reason).
  - **Approved →** marketer becomes **verified (✦)**, profile + services go **live**, they get a **"You're approved" email**.
  - **Rejected →** they get an email with the reason and can **fix and reapply**.
- [ ] **Payout verification (KYC)** — before they can be paid, the marketer completes **Stripe's identity + bank verification**. Can be required as part of approval or right after.
- [ ] **File storage** for the uploaded portfolio items (see infrastructure — S3 / Cloudflare R2).

## 7. Trust, safety & quality

- [ ] **Content moderation** — review profiles/services before they go public.
- [ ] **Reviews & ratings** — with a policy against fake reviews.
- [ ] **Fraud prevention** — Stripe Radar for payment fraud; watch for users trying to take deals off-platform.
- [ ] **Report & suspend** — a way for users to report problems and for you to remove bad actors.
- [ ] **Support channel** — a help email or simple help desk.

## 8. Running it (operations)

- [ ] **Uptime monitoring** — get alerted if the site goes down.
- [ ] **Error tracking** (e.g., Sentry) — catch bugs users hit.
- [ ] **Analytics** — see how people use the site.
- [ ] **Database backups + a recovery plan.**
- [ ] **A test/staging version** separate from the live site.
- [ ] **Ongoing maintenance** — someone (me + a bit of a person's time) keeping it patched and running.

---

## If you only do the essentials first (minimum to launch legally & safely)

1. Host + **real database** + domain + HTTPS.
2. Email verification + a transactional email service.
3. **Marketer application + admin approval flow** (with file storage for portfolios) — no unverified marketers go live.
4. Stripe Connect fully set up (payments + payouts + KYC).
5. **LLC + EIN + business bank account.**
6. **Terms of Service + Privacy Policy + Marketplace/Contractor Agreement** (lawyer-reviewed).
7. Refund policy + basic support email.

Everything else can be layered on after you have real users. Don't let the long list stall you — this order gets you legally open for business.
