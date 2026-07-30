/* Tonight's Reserved — frontend (MVP milestone 1)
   Talks to the backend API. Auth token is kept in localStorage so login
   persists across refreshes. */

const CATEGORIES = ['All','Social Media','Photo & Video','Paid Ads','SEO & Google','Web Design','Email & SMS','Branding'];

const TR = {
  state: { token: localStorage.getItem('tr_token') || null, user: null, role: null,
           category: 'All', authRole: 'business', authMode: 'signup', history: ['auth'] },

  money(n){ return '$' + Number(n).toLocaleString(); },

  async api(path, method, body){
    const headers = { 'Content-Type': 'application/json' };
    if (this.state.token) headers.Authorization = 'Bearer ' + this.state.token;
    const res = await fetch('/api' + path, { method: method || 'GET', headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
  },

  go(screen, skipHistory){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(screen);
    if (el){ el.classList.add('active'); const sc = el.querySelector('.scroll'); if (sc) sc.scrollTop = 0; }
    if (!skipHistory && this.state.history[this.state.history.length-1] !== screen) this.state.history.push(screen);
  },
  back(){
    this.state.history.pop();
    const prev = this.state.history[this.state.history.length-1] || (this.state.role==='marketer'?'dash':'browse');
    this.go(prev, true);
  },

  toast(msg){
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 1800);
  },
  openModal(html){ document.getElementById('modalSheet').innerHTML = html; document.getElementById('modal').classList.add('show'); },
  closeModal(){ document.getElementById('modal').classList.remove('show'); },

  // ---------- init ----------
  async init(){
    document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') TR.closeModal(); });
    this.renderTabbars();
    this.bindAuth();

    // returning from Stripe checkout?
    const params = new URLSearchParams(location.search);
    if (params.get('booking') && params.get('status') === 'success'){
      try { await this.api('/bookings/' + params.get('booking') + '/confirm', 'POST'); } catch(e){}
      history.replaceState({}, '', '/');
      this.toast('Payment complete — booking confirmed ✦');
    }

    if (this.state.token){
      try {
        const me = await this.api('/me');
        if (me.user){ this.state.user = me.user; this.state.role = me.user.role;
          return this.enter(); }
      } catch(e){ localStorage.removeItem('tr_token'); this.state.token = null; }
    }
    this.renderAuth();
    this.go('auth');
  },

  enter(){
    if (this.state.role === 'admin'){ this.state.history = ['admin']; this.loadAdmin(); this.go('admin'); return; }
    if (this.state.role === 'marketer'){ this.routeMarketer(); return; }
    document.getElementById('browseAvatar').textContent = (this.state.user.name||'B')[0].toUpperCase();
    document.getElementById('greet').textContent = 'Welcome, ' + (this.state.user.name||'') + ' 👋';
    this.state.history = ['browse']; this.loadBrowse(); this.go('browse');
  },

  // marketers go to their dashboard only once verified; otherwise to the application flow
  async routeMarketer(){
    try {
      const { verified, application } = await this.api('/my/application');
      if (verified){ this.state.history = ['dash']; this.loadDashboard(); this.go('dash'); }
      else { this.state.history = ['application']; this.loadApplication(application); this.go('application'); }
    } catch(e){ this.toast(e.message); }
  },

  // ---------- auth ----------
  bindAuth(){
    document.querySelectorAll('#roleToggle div').forEach(d => d.onclick = () => {
      document.querySelectorAll('#roleToggle div').forEach(x => x.classList.remove('on'));
      d.classList.add('on'); this.state.authRole = d.dataset.role; this.renderAuth();
    });
    document.getElementById('authSubmit').onclick = () => this.submitAuth();
  },
  renderAuth(){
    const signup = this.state.authMode === 'signup';
    const isBiz = this.state.authRole === 'business';
    let f = '';
    if (signup) f += this.fieldHTML('name', isBiz ? 'Business name' : 'Your name', 'text');
    f += this.fieldHTML('email', 'Email', 'email');
    f += this.fieldHTML('password', 'Password', 'password');
    document.getElementById('authForm').innerHTML = f;
    document.getElementById('authSubmit').textContent = signup ? 'Create account' : 'Log in';
    document.getElementById('authErr').textContent = '';
    document.getElementById('authSwitch').innerHTML = signup
      ? 'Already have an account? <span class="link" onclick="TR.switchAuth(\'login\')">Log in</span>'
      : 'New here? <span class="link" onclick="TR.switchAuth(\'signup\')">Create an account</span>';
  },
  switchAuth(mode){ this.state.authMode = mode; this.renderAuth(); },
  fieldHTML(id, label, type){
    return '<div class="field"><label>'+label+'</label><input id="f_'+id+'" type="'+type+'" autocomplete="off"></div>';
  },
  async submitAuth(){
    const errEl = document.getElementById('authErr'); errEl.textContent = '';
    const get = id => (document.getElementById('f_'+id)||{}).value || '';
    const body = { role: this.state.authRole, email: get('email').trim(), password: get('password') };
    const signup = this.state.authMode === 'signup';
    if (signup){ body.name = get('name').trim(); if (this.state.authRole==='business') body.businessName = body.name; }
    if (!body.email || !body.password || (signup && !body.name)){ errEl.textContent = 'Please fill in all fields.'; return; }
    try {
      const path = signup ? '/auth/signup' : '/auth/login';
      const data = await this.api(path, 'POST', body);
      this.state.token = data.token; localStorage.setItem('tr_token', data.token);
      this.state.user = data.user; this.state.role = data.user.role;
      this.enter();
    } catch(e){ errEl.textContent = e.message; }
  },
  async logout(){
    try { await this.api('/auth/logout', 'POST'); } catch(e){}
    localStorage.removeItem('tr_token');
    this.state.token = null; this.state.user = null; this.state.role = null;
    this.state.authMode = 'login'; this.renderAuth(); this.go('auth');
  },

  // ---------- browse ----------
  renderCats(){
    document.getElementById('cats').innerHTML = CATEGORIES.map(c =>
      '<div class="chip'+(c===this.state.category?' active':'')+'" onclick="TR.pickCat(\''+c+'\')">'+c+'</div>').join('');
  },
  pickCat(c){ this.state.category = c; this.renderCats(); this.loadBrowse(); },
  async loadBrowse(){
    this.renderCats();
    const list = document.getElementById('mlist');
    list.innerHTML = '<div class="empty">Loading…</div>';
    try {
      const q = this.state.category && this.state.category !== 'All' ? '?category=' + encodeURIComponent(this.state.category) : '';
      const data = await this.api('/marketers' + q);
      this._marketers = data.marketers;
      this.paintMarketers(data.marketers);
    } catch(e){ list.innerHTML = '<div class="empty">'+e.message+'</div>'; }
  },
  paintMarketers(ms){
    const term = (document.getElementById('searchInput').value||'').toLowerCase();
    const filtered = ms.filter(m => !term || m.name.toLowerCase().includes(term) || (m.specialty||'').toLowerCase().includes(term));
    const list = document.getElementById('mlist');
    if (!filtered.length){ list.innerHTML = '<div class="empty">No marketers found.</div>'; return; }
    list.innerHTML = filtered.map(m => `
      <div class="card" onclick="TR.openProfile('${m.id}')">
        <div class="m-row">
          <div class="avatar">${m.avatar}</div>
          <div style="flex:1">
            <div class="m-name">${m.name} <span class="verified">✦</span></div>
            <div class="m-spec">${m.specialty||''}</div>
            <div class="meta"><span>★ <b>${m.rating||'—'}</b></span><span><b>${m.jobs||0}</b> jobs</span><span>${m.location||''}</span></div>
          </div>
          <div class="price-tag">${m.startingPrice!=null?'<small>from</small><b>'+this.money(m.startingPrice)+'</b>':''}</div>
        </div>
      </div>`).join('');
  },

  // ---------- profile ----------
  async openProfile(id){
    this.go('profile');
    const body = document.getElementById('profileBody');
    body.innerHTML = '<div class="empty">Loading…</div>';
    try {
      const { marketer: m } = await this.api('/marketers/' + id);
      this._currentMarketer = m;
      body.innerHTML = `
        <div class="m-row" style="align-items:flex-start">
          <div class="avatar lg">${m.avatar}</div>
          <div style="flex:1">
            <div class="m-name" style="font-size:19px">${m.name}</div>
            <div class="m-spec">${m.specialty||''}</div>
            <div style="margin-top:8px"><span class="verified">✦ Verified by Tonight's Reserved</span></div>
          </div>
        </div>
        <div class="statgrid">
          <div class="stat"><b>${m.rating||'—'}</b><small>★ Rating</small></div>
          <div class="stat"><b>${m.jobs||0}</b><small>Jobs done</small></div>
          <div class="stat"><b>${m.responseTime||'—'}</b><small>Responds in</small></div>
        </div>
        <p class="sub">${m.bio||''}</p>
        <div class="sec-head"><h3>Services</h3><span>📍 ${m.location||''}</span></div>
        <div>${(m.services||[]).map(s => `
          <div class="service">
            <h4>${s.title}</h4><p>${s.description}</p>
            <div class="foot"><div class="p"><small>marketer's price</small><b>${this.money(s.price)}</b></div>
            <button class="btn sm" onclick="TR.openCheckout('${s.id}')">Hire →</button></div>
          </div>`).join('') || '<div class="empty">No services yet.</div>'}</div>`;
    } catch(e){ body.innerHTML = '<div class="empty">'+e.message+'</div>'; }
  },

  // ---------- checkout ----------
  openCheckout(serviceId){
    const m = this._currentMarketer;
    const s = (m.services||[]).find(x => x.id === serviceId);
    if (!s) return;
    this._pending = { serviceId, service: s, marketer: m };
    this.go('checkout');
    document.getElementById('checkoutBody').innerHTML = `
      <div class="card" style="cursor:default">
        <div class="m-row"><div class="avatar" style="width:44px;height:44px;font-size:16px">${m.avatar}</div>
          <div><div class="m-name" style="font-size:14px">${m.name}</div><div class="m-spec">${s.title}</div></div></div>
      </div>
      <h3 style="margin:16px 0 4px;font-size:15px">Order summary</h3>
      <div class="sheet-line"><span>Service price</span><span>${this.money(s.price)}</span></div>
      <div class="sheet-line total"><span>You pay</span><span>${this.money(s.price)}</span></div>
      <div class="note">🔒 <b>Protected booking:</b> Your payment is held securely and only released to the marketer once the work is delivered. Powered by Stripe.</div>
      <div style="height:16px"></div>
      <button class="btn" id="payBtn" onclick="TR.pay()">Confirm & Pay ${this.money(s.price)}</button>
      <div style="height:10px"></div>
      <button class="btn ghost" onclick="TR.back()">Cancel</button>`;
  },
  async pay(){
    const btn = document.getElementById('payBtn'); btn.disabled = true; btn.textContent = 'Processing…';
    try {
      const data = await this.api('/bookings', 'POST', { serviceId: this._pending.serviceId });
      if (data.mode === 'stripe' && data.checkoutUrl){ location.href = data.checkoutUrl; return; }
      // simulated mode: confirm immediately
      await this.api('/bookings/' + data.bookingId + '/confirm', 'POST');
      this.toast('Booking confirmed ✦ (simulated payment)');
      setTimeout(() => this.go('browse'), 1200);
    } catch(e){ btn.disabled = false; btn.textContent = 'Confirm & Pay'; this.toast(e.message); }
  },

  // ---------- dashboard (marketer) ----------
  async loadDashboard(){
    document.getElementById('dashName').textContent = this.state.user.name || '—';
    const body = document.getElementById('dashBody');
    body.innerHTML = '<div class="empty">Loading…</div>';
    try {
      const { marketer: m, stats } = await this.api('/my/marketer');
      document.getElementById('dashBadge').style.display = m.verified ? '' : 'none';
      body.innerHTML = `
        <div class="earn">
          <small class="sub" style="font-size:11px">This month · earnings</small>
          <div class="big">${this.money(stats.earnings)}</div>
          <small class="sub" style="font-size:11px">from ${stats.bookings} booking${stats.bookings===1?'':'s'}</small>
          <div class="split">
            <div><small>Bookings</small><b>${stats.bookings}</b></div>
            <div><small>Avg. booking</small><b>${this.money(stats.avg)}</b></div>
            <div><small>Rating</small><b style="color:var(--gold)">${m.rating||'—'}</b></div>
          </div>
        </div>
        ${!m.verified ? '<div class="note" style="margin-bottom:14px">⏳ Your profile is pending verification. Businesses can\'t find you until the Tonight\'s Reserved team approves your account.</div>' : ''}
        <div class="sec-head"><h3>Your services</h3><span onclick="TR.addServiceModal()">+ Add</span></div>
        <div id="myServices">${(m.services||[]).map(s => `
          <div class="service">
            <h4>${s.title}</h4><p>${s.description}</p>
            <div class="foot"><div class="p"><small>your price</small><b>${this.money(s.price)}</b></div>
            <span class="verified" style="background:none;border:none;color:${s.active?'var(--green)':'var(--dim)'}">● ${s.active?'Active':'Off'}</span></div>
          </div>`).join('') || '<div class="empty">No services yet. Tap “+ Add” to create your first one.</div>'}</div>
        <div class="note">You set your own price for every service. Payouts land in your connected account after each booking is delivered.</div>`;
    } catch(e){ body.innerHTML = '<div class="empty">'+e.message+'</div>'; }
  },
  addServiceModal(){
    this.openModal(`
      <h3>Add a service</h3>
      <div class="field"><label>Service title</label><input id="s_title" placeholder="e.g. Restaurant Reels Package"></div>
      <div class="field"><label>Description</label><textarea id="s_desc" rows="3" placeholder="What's included?"></textarea></div>
      <div class="field"><label>Your price (USD)</label><input id="s_price" type="number" placeholder="1200"></div>
      <div class="err" id="s_err"></div>
      <button class="btn" onclick="TR.createService()">Publish service</button>`);
  },
  async createService(){
    const v = id => (document.getElementById(id)||{}).value;
    const body = { title: (v('s_title')||'').trim(), description: (v('s_desc')||'').trim(), price: v('s_price') };
    const err = document.getElementById('s_err');
    if (!body.title || !body.description || !(Number(body.price) > 0)){ err.textContent = 'Fill in all fields with a valid price.'; return; }
    try { await this.api('/my/services', 'POST', body); this.closeModal(); this.toast('Service published ✦'); this.loadDashboard(); }
    catch(e){ err.textContent = e.message; }
  },

  // ---------- bookings ----------
  async loadBookings(){
    const body = document.getElementById('bookingsBody'); body.innerHTML = '<div class="empty">Loading…</div>';
    try {
      const { bookings } = await this.api('/my/bookings');
      if (!bookings.length){ body.innerHTML = '<div class="empty">No bookings yet.</div>'; return; }
      const isMkt = this.state.role === 'marketer';
      body.innerHTML = '<div style="height:6px"></div>' + bookings.map(b => `
        <div class="card" style="cursor:default">
          <div class="m-row"><div style="flex:1">
            <div class="m-name" style="font-size:14px">${b.serviceTitle}</div>
            <div class="m-spec">${isMkt ? 'Client: '+b.businessName : 'Marketer: '+b.marketerName}</div></div>
            <div class="price-tag"><small>${b.status}</small><b>${this.money(b.price)}</b></div></div>
        </div>`).join('');
    } catch(e){ body.innerHTML = '<div class="empty">'+e.message+'</div>'; }
  },

  // ---------- account ----------
  loadAccount(){
    const u = this.state.user;
    document.getElementById('accountBody').innerHTML = `
      <div style="height:10px"></div>
      <div class="card" style="cursor:default">
        <div class="m-row"><div class="avatar">${(u.name||'?')[0].toUpperCase()}</div>
          <div><div class="m-name">${u.name||''}</div><div class="m-spec">${u.email||''}</div>
          <div style="margin-top:4px"><span class="verified">${u.role==='marketer'?'Marketer':'Business'}</span></div></div></div>
      </div>
      <div style="height:8px"></div>
      <button class="btn ghost" onclick="TR.go('bookings');TR.loadBookings()">My bookings</button>
      <div style="height:10px"></div>
      <button class="btn" style="background:#2a2418;color:var(--red)" onclick="TR.logout()">Log out</button>`;
  },

  // ---------- marketer application ----------
  loadApplication(app){
    app = app || { status: 'draft' };
    const body = document.getElementById('applicationBody');
    if (app.status === 'pending'){
      body.innerHTML = `
        <div style="height:24px"></div>
        <span class="kicker">Application received</span>
        <h2 class="title">Under review ⏳</h2>
        <p class="sub">Thanks! The Tonight's Reserved team is reviewing your application. Once you're approved, your profile goes live and businesses can hire you — you'll get an email when that happens.</p>
        <div class="note" style="margin-top:16px">You submitted <b>${(app.offeredServices||[]).length}</b> service${(app.offeredServices||[]).length===1?'':'s'} for review.</div>
        <div style="height:16px"></div>
        <button class="btn ghost" onclick="TR.logout()">Log out</button>`;
      return;
    }
    const rejected = app.status === 'rejected';
    this._appServices = (app.offeredServices && app.offeredServices.length) ? app.offeredServices.map(s=>({...s})) : [{title:'',description:'',price:''}];
    const opts = CATEGORIES.filter(c=>c!=='All').map(c=>`<option ${app.category===c?'selected':''}>${c}</option>`).join('');
    body.innerHTML = `
      ${rejected ? `<div class="note" style="margin:14px 0 4px;border-color:var(--red)"><b style="color:var(--red)">Not approved yet.</b> ${app.rejectionReason||''} Update your application below and resubmit.</div>` : ''}
      <span class="kicker">Become a Tonight's Reserved Pro</span>
      <h2 class="title">Your application</h2>
      <p class="sub">Tell us who you are and what you offer. Our team reviews every marketer before you go live — that's what makes the ✦ badge mean something.</p>
      <div style="height:14px"></div>
      <div class="field"><label>Your specialty area</label><select id="a_category">${opts}</select></div>
      <div class="field"><label>Headline</label><input id="a_specialty" placeholder='e.g. "Social Media & Reels"' value="${(app.specialty||'').replace(/"/g,'&quot;')}"></div>
      <div class="field"><label>Location</label><input id="a_location" placeholder="City or 'Remote'" value="${(app.location||'').replace(/"/g,'&quot;')}"></div>
      <div class="field"><label>Short bio</label><textarea id="a_bio" rows="3" placeholder="What you do and who you help">${app.bio||''}</textarea></div>
      <div class="field"><label>Portfolio links (one per line)</label><textarea id="a_links" rows="2" placeholder="https://your-work.com">${(app.portfolioLinks||[]).join('\n')}</textarea></div>
      <div class="field"><label>Anything else for our team (optional)</label><textarea id="a_note" rows="2">${app.portfolioNote||''}</textarea></div>
      <div class="sec-head"><h3>Services you'll offer</h3><span onclick="TR.addAppServiceRow()">+ Add</span></div>
      <div id="a_services"></div>
      <div class="err" id="a_err"></div>
      <button class="btn" onclick="TR.submitApplication()">Submit for review</button>
      <div style="height:10px"></div>
      <button class="btn ghost" onclick="TR.logout()">Log out</button>`;
    this.renderAppServiceRows();
  },
  renderAppServiceRows(){
    const wrap = document.getElementById('a_services');
    wrap.innerHTML = this._appServices.map((s,i)=>`
      <div class="service">
        <div class="field" style="margin-bottom:8px"><input data-i="${i}" data-k="title" class="a_svc" placeholder="Service title" value="${(s.title||'').replace(/"/g,'&quot;')}"></div>
        <div class="field" style="margin-bottom:8px"><textarea data-i="${i}" data-k="description" class="a_svc" rows="2" placeholder="What's included?">${s.description||''}</textarea></div>
        <div class="field" style="margin-bottom:0"><input data-i="${i}" data-k="price" class="a_svc" type="number" placeholder="Your price (USD)" value="${s.price||''}"></div>
        ${this._appServices.length>1?`<div style="text-align:right;margin-top:6px"><span class="link" style="color:var(--red)" onclick="TR.removeAppServiceRow(${i})">Remove</span></div>`:''}
      </div>`).join('');
    wrap.querySelectorAll('.a_svc').forEach(el=>el.oninput=()=>{ this._appServices[+el.dataset.i][el.dataset.k]=el.value; });
  },
  syncAppServices(){ document.querySelectorAll('#a_services .a_svc').forEach(el=>{ if(this._appServices[+el.dataset.i]) this._appServices[+el.dataset.i][el.dataset.k]=el.value; }); },
  addAppServiceRow(){ this.syncAppServices(); this._appServices.push({title:'',description:'',price:''}); this.renderAppServiceRows(); },
  removeAppServiceRow(i){ this.syncAppServices(); this._appServices.splice(i,1); this.renderAppServiceRows(); },
  async submitApplication(){
    this.syncAppServices();
    const v = id => (document.getElementById(id)||{}).value || '';
    const body = {
      category: v('a_category'), specialty: v('a_specialty').trim(), location: v('a_location').trim(), bio: v('a_bio').trim(),
      portfolioLinks: v('a_links').split('\n').map(s=>s.trim()).filter(Boolean),
      portfolioNote: v('a_note').trim(),
      offeredServices: this._appServices.map(s=>({ title:(s.title||'').trim(), description:(s.description||'').trim(), price:Number(s.price) }))
    };
    const err = document.getElementById('a_err'); err.textContent='';
    try { const r = await this.api('/my/application','POST',body); this.toast('Application submitted ✦'); this.loadApplication(r.application); }
    catch(e){ err.textContent = e.message; }
  },

  // ---------- admin ----------
  async loadAdmin(){
    const body = document.getElementById('adminBody'); body.innerHTML = '<div class="empty">Loading…</div>';
    try {
      const { applications } = await this.api('/admin/applications');
      const pending = applications.filter(a=>a.application.status==='pending');
      const others = applications.filter(a=>a.application.status!=='pending');
      body.innerHTML = `
        <div style="height:8px"></div>
        <div class="sec-head"><h3>Pending review (${pending.length})</h3></div>
        ${pending.length?pending.map(a=>this.adminCard(a)).join(''):'<div class="empty">No applications waiting 🎉</div>'}
        ${others.length?'<div class="sec-head"><h3>Reviewed</h3></div>'+others.map(a=>this.adminCard(a)).join(''):''}`;
    } catch(e){ body.innerHTML = '<div class="empty">'+e.message+'</div>'; }
  },
  adminCard(a){
    const app = a.application, st = app.status;
    const badge = st==='pending' ? '<span class="verified">⏳ Pending</span>'
      : st==='approved' ? '<span class="verified" style="color:var(--green);background:none;border:none">● Approved</span>'
      : '<span class="verified" style="color:var(--red);background:none;border:none">● Rejected</span>';
    const links = (app.portfolioLinks||[]).map(l=>`<a href="${l}" target="_blank" style="color:var(--gold)">${l}</a>`).join(', ');
    const svcs = (app.offeredServices||[]).map(s=>`${s.title} — ${this.money(s.price)}`).join(' · ') || '—';
    return `<div class="card" style="cursor:default">
      <div class="m-row"><div class="avatar">${(a.name||'?')[0].toUpperCase()}</div>
        <div style="flex:1"><div class="m-name">${a.name}</div><div class="m-spec">${a.specialty||a.category} · ${a.location||''}</div></div>${badge}</div>
      <p class="sub" style="margin:10px 0 6px">${a.bio||''}</p>
      ${links?`<div class="sub" style="font-size:12px;margin-bottom:6px">Portfolio: ${links}</div>`:''}
      ${app.portfolioNote?`<div class="sub" style="font-size:12px;margin-bottom:6px">Note: ${app.portfolioNote}</div>`:''}
      <div class="note" style="margin:8px 0">Services (${(app.offeredServices||[]).length}): ${svcs}</div>
      ${st==='pending'?`<div style="display:flex;gap:8px">
        <button class="btn sm" style="flex:1" onclick="TR.approve('${a.marketerId}')">Approve ✦</button>
        <button class="btn sm ghost" style="flex:1;color:var(--red);border-color:var(--red)" onclick="TR.rejectPrompt('${a.marketerId}')">Reject</button>
      </div>`:(app.rejectionReason?`<div class="sub" style="font-size:12px;color:var(--red)">Reason given: ${app.rejectionReason}</div>`:'')}
    </div>`;
  },
  async approve(id){ try { await this.api('/admin/applications/'+id+'/approve','POST'); this.toast('Approved ✦ — now live'); this.loadAdmin(); } catch(e){ this.toast(e.message); } },
  rejectPrompt(id){
    this.openModal(`<h3>Reject application</h3>
      <div class="field"><label>Reason (the marketer will see this)</label><textarea id="rej_reason" rows="3" placeholder="e.g. We'd like to see more portfolio examples first."></textarea></div>
      <button class="btn" style="background:var(--red);color:#fff" onclick="TR.reject('${id}')">Reject application</button>`);
  },
  async reject(id){
    const reason = (document.getElementById('rej_reason')||{}).value || '';
    try { await this.api('/admin/applications/'+id+'/reject','POST',{ reason }); this.closeModal(); this.toast('Application rejected'); this.loadAdmin(); }
    catch(e){ this.toast(e.message); }
  },

  // ---------- tabbars ----------
  renderTabbars(){
    const icon = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
    const search = '<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>';
    const cal = '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>';
    const grid = '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>';
    const user = '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>';
    document.getElementById('tabbarBuy').innerHTML =
      `<div class="tab active" onclick="TR.go('browse')">${icon(search)}Browse</div>
       <div class="tab" onclick="TR.go('bookings');TR.loadBookings()">${icon(cal)}Bookings</div>
       <div class="tab" onclick="TR.go('account');TR.loadAccount()">${icon(user)}Account</div>`;
    document.getElementById('tabbarSell').innerHTML =
      `<div class="tab active" onclick="TR.go('dash');TR.loadDashboard()">${icon(grid)}Dashboard</div>
       <div class="tab" onclick="TR.go('bookings');TR.loadBookings()">${icon(cal)}Bookings</div>
       <div class="tab" onclick="TR.go('account');TR.loadAccount()">${icon(user)}Account</div>`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchInput').addEventListener('input', () => { if (TR._marketers) TR.paintMarketers(TR._marketers); });
  TR.init();
});
