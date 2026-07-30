/**
 * Tonight's Reserved — backend server (MVP milestone 1)
 *
 * Zero-dependency Node server (built-in http module) so it runs anywhere with
 * no `npm install` needed. Powers the marketplace:
 *   - accounts (businesses + marketers)
 *   - marketer profiles & their own-priced services
 *   - browsing and booking
 *   - a 20% platform commission recorded on every booking (backend only —
 *     never shown to businesses or marketers)
 *   - Stripe checkout in TEST mode when the `stripe` package + a key are present;
 *     a safe simulated checkout otherwise, so the flow works out of the box.
 *
 * Data lives in data/db.json via src/db.js. No external database required yet.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pw = require('./src/password');
const store = require('./src/db');

const PORT = process.env.PORT || 3000;
const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT || 0.20); // server-side only
const BASE_URL = process.env.BASE_URL || ('http://localhost:' + PORT);

// Stripe is optional. Loaded only if the package is installed AND a key is set.
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); }
  catch (e) { console.warn('STRIPE_SECRET_KEY set but the "stripe" package is not installed — run `npm install`. Falling back to simulated payments.'); }
}

// ---- tiny router ---------------------------------------------------------

const routes = [];
function route(method, pattern, handler) {
  routes.push({ method, parts: pattern.split('/').filter(Boolean), handler });
}
function match(method, urlPath) {
  const parts = urlPath.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.method !== method || r.parts.length !== parts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < r.parts.length; i++) {
      if (r.parts[i].startsWith(':')) params[r.parts[i].slice(1)] = decodeURIComponent(parts[i]);
      else if (r.parts[i] !== parts[i]) { ok = false; break; }
    }
    if (ok) return { handler: r.handler, params };
  }
  return null;
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

// ---- helpers -------------------------------------------------------------

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, role: u.role, name: u.name, email: u.email, marketerId: u.marketerId || null };
}
function publicMarketer(m, services) {
  const out = { id: m.id, name: m.name, specialty: m.specialty, category: m.category,
    location: m.location, rating: m.rating, jobs: m.jobs, responseTime: m.responseTime,
    verified: m.verified, avatar: m.avatar, bio: m.bio };
  if (services) out.services = services.map(publicService);
  return out;
}
function publicService(s) {
  return { id: s.id, marketerId: s.marketerId, title: s.title, description: s.description, price: s.price, active: s.active };
}
function currentUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const db = store.load();
  const session = db.sessions.find(s => s.token === token);
  return session ? (db.users.find(u => u.id === session.userId) || null) : null;
}
function issueSession(db, userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions.push({ token, userId, createdAt: Date.now() });
  return token;
}

// ---- routes: auth --------------------------------------------------------

route('POST', '/api/auth/signup', (req, res) => {
  const { role, name, email, password, businessName } = req.body || {};
  if (!role || !name || !email || !password) return json(res, 400, { error: 'Missing required fields.' });
  if (!['business', 'marketer'].includes(role)) return json(res, 400, { error: 'Invalid role.' });
  const db = store.load();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase()))
    return json(res, 409, { error: 'An account with that email already exists.' });

  const user = { id: store.id('usr'), role, name, email, password: pw.hash(password), createdAt: Date.now() };
  if (role === 'business') {
    user.businessName = businessName || name;
  } else {
    const m = { id: store.id('mkt'), userId: user.id, name, specialty: '', category: 'Other',
      location: '', rating: 0, jobs: 0, responseTime: '—', bio: '', verified: false,
      avatar: name[0] ? name[0].toUpperCase() : 'M',
      application: { status: 'draft', offeredServices: [], portfolioLinks: [], portfolioNote: '',
        submittedAt: null, reviewedAt: null, rejectionReason: '' } };
    user.marketerId = m.id;
    db.marketers.push(m);
  }
  db.users.push(user);
  const token = issueSession(db, user.id);
  store.save(db);
  json(res, 200, { token, user: publicUser(user) });
});

route('POST', '/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const db = store.load();
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || !pw.compare(password || '', user.password)) return json(res, 401, { error: 'Wrong email or password.' });
  const token = issueSession(db, user.id);
  store.save(db);
  json(res, 200, { token, user: publicUser(user) });
});

route('POST', '/api/auth/logout', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) { const db = store.load(); db.sessions = db.sessions.filter(s => s.token !== token); store.save(db); }
  json(res, 200, { ok: true });
});

route('GET', '/api/me', (req, res) => json(res, 200, { user: publicUser(req.user) }));
route('GET', '/api/config', (req, res) => json(res, 200, { paymentMode: stripe ? 'stripe' : 'simulated' }));

// ---- routes: browse ------------------------------------------------------

route('GET', '/api/marketers', (req, res) => {
  const db = store.load();
  const category = req.query.category;
  let marketers = db.marketers.filter(m => m.verified);
  if (category && category !== 'All') marketers = marketers.filter(m => m.category === category);
  const out = marketers.map(m => {
    const services = db.services.filter(s => s.marketerId === m.id && s.active);
    const from = services.length ? Math.min(...services.map(s => s.price)) : null;
    return Object.assign(publicMarketer(m), { startingPrice: from });
  });
  json(res, 200, { marketers: out });
});

route('GET', '/api/marketers/:id', (req, res) => {
  const db = store.load();
  const m = db.marketers.find(x => x.id === req.params.id);
  if (!m) return json(res, 404, { error: 'Marketer not found.' });
  const services = db.services.filter(s => s.marketerId === m.id && s.active);
  json(res, 200, { marketer: publicMarketer(m, services) });
});

// ---- routes: marketer dashboard -----------------------------------------

route('GET', '/api/my/marketer', (req, res) => {
  if (!req.user) return json(res, 401, { error: 'Please log in.' });
  if (req.user.role !== 'marketer') return json(res, 403, { error: 'Marketers only.' });
  const db = store.load();
  const m = db.marketers.find(x => x.id === req.user.marketerId);
  const services = db.services.filter(s => s.marketerId === m.id);
  const paid = db.bookings.filter(b => b.marketerId === m.id && b.status === 'paid');
  const earnings = paid.reduce((sum, b) => sum + b.price, 0);
  json(res, 200, { marketer: publicMarketer(m, services),
    stats: { earnings, bookings: paid.length, avg: paid.length ? Math.round(earnings / paid.length) : 0 } });
});

route('POST', '/api/my/services', (req, res) => {
  if (!req.user) return json(res, 401, { error: 'Please log in.' });
  if (req.user.role !== 'marketer') return json(res, 403, { error: 'Marketers only.' });
  const { title, description, price } = req.body || {};
  const p = Number(price);
  if (!title || !description || !(p > 0)) return json(res, 400, { error: 'Title, description and a price are required.' });
  const db = store.load();
  const svc = { id: store.id('svc'), marketerId: req.user.marketerId, title, description, price: Math.round(p), active: true, createdAt: Date.now() };
  db.services.push(svc);
  store.save(db);
  json(res, 200, { service: publicService(svc) });
});

route('PATCH', '/api/my/services/:id', (req, res) => {
  if (!req.user) return json(res, 401, { error: 'Please log in.' });
  const db = store.load();
  const svc = db.services.find(s => s.id === req.params.id);
  if (!svc || svc.marketerId !== req.user.marketerId) return json(res, 404, { error: 'Service not found.' });
  const { title, description, price, active } = req.body || {};
  if (title !== undefined) svc.title = title;
  if (description !== undefined) svc.description = description;
  if (price !== undefined && Number(price) > 0) svc.price = Math.round(Number(price));
  if (active !== undefined) svc.active = !!active;
  store.save(db);
  json(res, 200, { service: publicService(svc) });
});

// ---- routes: marketer application & admin approval -----------------------

function isAdmin(req) { return req.user && req.user.role === 'admin'; }

// Marketer views their own application + verification status.
route('GET', '/api/my/application', (req, res) => {
  if (!req.user) return json(res, 401, { error: 'Please log in.' });
  if (req.user.role !== 'marketer') return json(res, 403, { error: 'Marketers only.' });
  const db = store.load();
  const m = db.marketers.find(x => x.id === req.user.marketerId);
  json(res, 200, { verified: m.verified, application: m.application || { status: 'draft' } });
});

// Marketer submits (or re-submits) their application for review.
route('POST', '/api/my/application', (req, res) => {
  if (!req.user) return json(res, 401, { error: 'Please log in.' });
  if (req.user.role !== 'marketer') return json(res, 403, { error: 'Marketers only.' });
  const b = req.body || {};
  const services = Array.isArray(b.offeredServices) ? b.offeredServices
    .map(s => ({ title: String(s.title || '').trim(), description: String(s.description || '').trim(), price: Math.round(Number(s.price) || 0) }))
    .filter(s => s.title && s.description && s.price > 0) : [];
  if (!b.category || !b.location || !b.bio) return json(res, 400, { error: 'Please fill in your specialty area, location and a short bio.' });
  if (!services.length) return json(res, 400, { error: 'Add at least one service with a price.' });

  const db = store.load();
  const m = db.marketers.find(x => x.id === req.user.marketerId);
  m.category = b.category;
  m.specialty = b.specialty || b.category;
  m.location = b.location;
  m.bio = b.bio;
  m.responseTime = b.responseTime || m.responseTime;
  m.application = {
    status: 'pending',
    offeredServices: services,
    portfolioLinks: Array.isArray(b.portfolioLinks) ? b.portfolioLinks.filter(Boolean) : [],
    portfolioNote: String(b.portfolioNote || ''),
    submittedAt: Date.now(), reviewedAt: null, rejectionReason: ''
  };
  store.save(db);
  json(res, 200, { ok: true, application: m.application });
});

// Admin: list applications waiting for review (and recently reviewed).
route('GET', '/api/admin/applications', (req, res) => {
  if (!isAdmin(req)) return json(res, 403, { error: 'Admins only.' });
  const db = store.load();
  const apps = db.marketers
    .filter(m => m.application && m.application.status && m.application.status !== 'draft')
    .map(m => ({ marketerId: m.id, name: m.name, category: m.category, location: m.location,
      specialty: m.specialty, bio: m.bio, verified: m.verified, application: m.application }))
    .sort((a, b) => (a.application.status === 'pending' ? -1 : 1) - (b.application.status === 'pending' ? -1 : 1)
      || (b.application.submittedAt || 0) - (a.application.submittedAt || 0));
  json(res, 200, { applications: apps });
});

// Admin: approve — marketer becomes verified and their services go live.
route('POST', '/api/admin/applications/:id/approve', (req, res) => {
  if (!isAdmin(req)) return json(res, 403, { error: 'Admins only.' });
  const db = store.load();
  const m = db.marketers.find(x => x.id === req.params.id);
  if (!m || !m.application) return json(res, 404, { error: 'Application not found.' });
  m.verified = true;
  m.application.status = 'approved';
  m.application.reviewedAt = Date.now();
  m.application.rejectionReason = '';
  // publish the services they applied with (skip duplicates by title)
  for (const s of (m.application.offeredServices || [])) {
    const exists = db.services.find(x => x.marketerId === m.id && x.title === s.title);
    if (!exists) db.services.push({ id: store.id('svc'), marketerId: m.id, title: s.title,
      description: s.description, price: s.price, active: true, createdAt: Date.now() });
  }
  store.save(db);
  json(res, 200, { ok: true });
});

// Admin: reject — with a reason the marketer will see.
route('POST', '/api/admin/applications/:id/reject', (req, res) => {
  if (!isAdmin(req)) return json(res, 403, { error: 'Admins only.' });
  const db = store.load();
  const m = db.marketers.find(x => x.id === req.params.id);
  if (!m || !m.application) return json(res, 404, { error: 'Application not found.' });
  m.verified = false;
  m.application.status = 'rejected';
  m.application.reviewedAt = Date.now();
  m.application.rejectionReason = String((req.body || {}).reason || 'Application did not meet our current standards.');
  store.save(db);
  json(res, 200, { ok: true });
});

// ---- routes: bookings & checkout ----------------------------------------

route('POST', '/api/bookings', async (req, res) => {
  if (!req.user) return json(res, 401, { error: 'Please log in.' });
  if (req.user.role !== 'business') return json(res, 403, { error: 'Only businesses can book.' });
  const db = store.load();
  const svc = db.services.find(s => s.id === (req.body || {}).serviceId && s.active);
  if (!svc) return json(res, 404, { error: 'Service not found.' });
  const marketer = db.marketers.find(m => m.id === svc.marketerId);

  const fee = Math.round(svc.price * PLATFORM_FEE_PCT); // internal accounting only
  const booking = {
    id: store.id('bkg'), serviceId: svc.id, serviceTitle: svc.title,
    marketerId: marketer.id, marketerName: marketer.name,
    businessId: req.user.id, businessName: req.user.businessName || req.user.name,
    price: svc.price, platformFee: fee, marketerPayout: svc.price - fee,
    status: 'pending', createdAt: Date.now()
  };

  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: svc.price * 100,
          product_data: { name: svc.title + ' — ' + marketer.name } } }],
        success_url: BASE_URL + '/?booking=' + booking.id + '&status=success',
        cancel_url: BASE_URL + '/?booking=' + booking.id + '&status=cancel',
        metadata: { bookingId: booking.id }
      });
      booking.stripeSessionId = session.id;
      db.bookings.push(booking); store.save(db);
      return json(res, 200, { bookingId: booking.id, checkoutUrl: session.url, mode: 'stripe' });
    } catch (e) { return json(res, 502, { error: 'Stripe error: ' + e.message }); }
  }
  db.bookings.push(booking); store.save(db);
  json(res, 200, { bookingId: booking.id, checkoutUrl: null, mode: 'simulated' });
});

route('POST', '/api/bookings/:id/confirm', (req, res) => {
  const db = store.load();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return json(res, 404, { error: 'Booking not found.' });
  if (booking.status !== 'paid') {
    booking.status = 'paid'; booking.paidAt = Date.now();
    const m = db.marketers.find(x => x.id === booking.marketerId);
    if (m) m.jobs = (m.jobs || 0) + 1;
    store.save(db);
  }
  json(res, 200, { ok: true, booking: { id: booking.id, status: booking.status } });
});

route('GET', '/api/my/bookings', (req, res) => {
  if (!req.user) return json(res, 401, { error: 'Please log in.' });
  const db = store.load();
  let list = req.user.role === 'business'
    ? db.bookings.filter(b => b.businessId === req.user.id)
    : db.bookings.filter(b => b.marketerId === req.user.marketerId);
  const safe = list.map(b => ({ id: b.id, serviceTitle: b.serviceTitle, marketerName: b.marketerName,
    businessName: b.businessName, price: b.price, status: b.status, createdAt: b.createdAt }))
    .sort((a, b) => b.createdAt - a.createdAt);
  json(res, 200, { bookings: safe });
});

// ---- static files --------------------------------------------------------

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
const PUBLIC = path.join(__dirname, 'public');

function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.normalize(path.join(PUBLIC, rel));
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { // SPA fallback: unknown non-API paths return index.html
      return fs.readFile(path.join(PUBLIC, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html);
      });
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---- server --------------------------------------------------------------

const server = http.createServer((req, res) => {
  const u = new URL(req.url, BASE_URL);
  const urlPath = u.pathname;

  if (!urlPath.startsWith('/api/')) return serveStatic(req, res, urlPath);

  const found = match(req.method, urlPath);
  if (!found) return json(res, 404, { error: 'Not found.' });

  // parse body then dispatch
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', async () => {
    try {
      req.body = raw ? JSON.parse(raw) : {};
    } catch (e) { return json(res, 400, { error: 'Invalid JSON.' }); }
    req.query = Object.fromEntries(u.searchParams);
    req.params = found.params;
    req.user = currentUser(req);
    try { await found.handler(req, res); }
    catch (e) { console.error(e); if (!res.headersSent) json(res, 500, { error: 'Server error.' }); }
  });
});

server.listen(PORT, () => {
  console.log('Tonight\'s Reserved running at ' + BASE_URL);
  console.log('Payment mode: ' + (stripe ? 'Stripe' : 'Simulated (no Stripe key set)'));
});
