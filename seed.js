// Seeds the database with a few verified marketers and their services so the
// app has something to show on first run. Safe to re-run: it resets the data.
// Run with:  npm run seed

const pw = require('./password');
const { save, id, emptyDb } = require('./db');

const PW = pw.hash('password123'); // demo password for every seeded account

function marketer(name, email, spec, category, location, rating, jobs, resp, bio, services) {
  const uid = id('usr');
  const mid = id('mkt');
  return {
    user: { id: uid, role: 'marketer', name, email, password: PW, marketerId: mid, createdAt: Date.now() },
    marketer: {
      id: mid, userId: uid, name, specialty: spec, category, location,
      rating, jobs, responseTime: resp, bio, verified: true, avatar: name[0].toUpperCase(),
      application: { status: 'approved', offeredServices: [], portfolioLinks: [], portfolioNote: '',
        submittedAt: Date.now(), reviewedAt: Date.now(), rejectionReason: '' }
    },
    services: services.map(s => ({
      id: id('svc'), marketerId: mid, title: s.t, description: s.d, price: s.p, active: true, createdAt: Date.now()
    }))
  };
}

const seedData = [
  marketer('Kayla M.', 'kayla@demo.com', 'Social Media & Reels', 'Social Media', 'Los Angeles', 4.9, 128, '1h',
    'Restaurant & hospitality social media specialist. I turn empty weeknights into booked tables with scroll-stopping content and consistent posting.',
    [
      { t: 'Restaurant Reels Package', d: '8 short-form videos per month, shot and edited on-site. Optimized for Instagram & TikTok.', p: 1200 },
      { t: 'Full Social Management', d: 'Content calendar, daily posting, engagement & monthly reporting across all channels.', p: 1500 },
      { t: 'Content Shoot Day', d: 'One on-site day, 30+ edited photos & 6 reels delivered ready to post.', p: 900 }
    ]),
  marketer('Marcus T.', 'marcus@demo.com', 'Photography & Video', 'Photo & Video', 'Austin', 5.0, 94, '2h',
    'Commercial food & product photographer. Menus, brand shoots, and video that makes your product irresistible.',
    [
      { t: 'Menu Photography Day', d: 'Full menu shoot, 40 professionally edited images delivered within 48h.', p: 900 },
      { t: 'Brand Video (60s)', d: 'Scripted, shot & edited hero video for web and paid ads.', p: 1400 },
      { t: 'Product Photo Mini', d: 'Up to 10 products, white-background + lifestyle set.', p: 400 }
    ]),
  marketer('Priya S.', 'priya@demo.com', 'Paid Ads (Meta & Google)', 'Paid Ads', 'Remote', 4.8, 156, '30m',
    'Performance marketer focused on local businesses. I run ads that turn browsers into bookings and track every dollar.',
    [
      { t: 'Meta Ads Management', d: 'Full campaign build & management. Ad spend billed separately.', p: 1000 },
      { t: 'Google Ads Setup + Manage', d: 'Local search & maps campaigns, conversion tracking, monthly optimization.', p: 1100 },
      { t: 'Ad Strategy Audit', d: 'Deep audit of current ads + 90-day growth plan.', p: 800 }
    ]),
  marketer('Devon R.', 'devon@demo.com', 'SEO & Google Business', 'SEO & Google', 'Chicago', 4.9, 71, '3h',
    'Local SEO & reputation specialist. I get you found first and keep your reviews glowing.',
    [
      { t: 'Google Business + Reviews', d: 'Optimize your listing, build a review funnel, monthly reporting.', p: 650 },
      { t: 'Local SEO Package', d: 'On-page SEO, citations, and local ranking growth over 90 days.', p: 1200 },
      { t: 'Reputation Recovery', d: 'Respond to and offset negative reviews, rebuild your rating.', p: 500 }
    ]),
  marketer('Jordan L.', 'jordan@demo.com', 'Web Design & Branding', 'Web Design', 'Miami', 5.0, 63, '4h',
    'Designer building booking-ready websites and brand identities for hospitality and local business.',
    [
      { t: 'Booking-Ready Website', d: 'Custom 5-page site with reservations & mobile-first design.', p: 2500 },
      { t: 'Brand Identity Kit', d: 'Logo, colors, typography & brand guide.', p: 1500 },
      { t: 'Menu Redesign', d: 'Print + digital menu design, ready to use.', p: 600 }
    ])
];

const db = emptyDb();

// a demo business (buyer) account so you can log in and browse/book immediately
db.users.push({
  id: id('usr'), role: 'business', name: 'Rosa\'s Cantina', email: 'business@demo.com',
  password: PW, businessName: 'Rosa\'s Cantina', createdAt: Date.now()
});

// a demo ADMIN account — this is you (the Tonight's Reserved team) reviewing marketer applications
db.users.push({
  id: id('usr'), role: 'admin', name: 'TR Admin', email: 'admin@demo.com',
  password: PW, createdAt: Date.now()
});

for (const m of seedData) {
  db.users.push(m.user);
  db.marketers.push(m.marketer);
  db.services.push(...m.services);
}

save(db);
console.log('Seeded ' + db.marketers.length + ' marketers, ' + db.services.length + ' services, and ' + db.users.length + ' accounts.');
console.log('Demo logins (password for all: password123):');
console.log('  Business:  business@demo.com');
console.log('  Marketer:  kayla@demo.com');
console.log('  Admin:     admin@demo.com   (reviews & approves marketer applications)');
