/* PlaceMate frontend <-> backend connector.
   Loaded AFTER script.js; it wraps/overrides the demo functions so your existing UI keeps working.
   If the frontend is hosted on a different domain than the backend, set this BEFORE api.js:
   <script>window.PLACEMATE_API = "https://your-backend.example.com";</script> */
(function () {
  const BASE = (window.PLACEMATE_API || '').replace(/\/$/, '');
  const KEY = 'placemate_token';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => (typeof window.toast === 'function' ? window.toast(m) : console.log(m));

  const getToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const setToken = t => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch {} };

  async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    const t = getToken();
    if (t) headers.Authorization = 'Bearer ' + t;
    let body = opts.body;
    if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    const res = await fetch(`${BASE}/api/${path}`, { ...opts, headers, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && path !== 'auth/login') { setToken(null); location.reload(); }
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  function openDashboardUI() {
    document.body.classList.remove('gate-open');
    ['introScreen', 'loginScreen'].forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
    const app = $('dashboardApp');
    if (app) app.style.display = '';
  }

  /* ---------- dashboard ---------- */
  async function loadDashboard() {
    const d = await api('dashboard');
    const stats = document.querySelectorAll('#dashboard .grid .stat');
    const bars = document.querySelectorAll('#dashboard .grid .bar');
    if (stats[0]) stats[0].textContent = d.atsScore + '/100';
    if (bars[0]) bars[0].style.width = d.atsScore + '%';
    if (stats[1]) stats[1].textContent = d.readiness + '%';
    if (bars[1]) bars[1].style.width = d.readiness + '%';
    if (stats[2]) stats[2].textContent = d.jobMatches;
    const note = document.querySelector('#dashboard .grid .card:nth-child(3) p.muted');
    if (note) note.textContent = `${d.strongMatches} strong matches (80%+)`;
    const list = document.querySelector('#dashboard .card.list');
    if (list) list.innerHTML = d.activity.map(a => `<div>${a.icon} <b>${esc(a.agent)}</b> — ${esc(a.text)}</div>`).join('');
  }

  /* ---------- resume ---------- */
  window.analyzeResume = async function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    $('fileName').textContent = file.name + ' — analysing…';
    const fd = new FormData();
    fd.append('resume', file);
    try {
      const r = await api('resume', { method: 'POST', body: fd });
      $('fileName').textContent = file.name;
      const stats = document.querySelectorAll('#resumeResult .stat');
      if (stats[0]) stats[0].textContent = r.atsScore + '/100';
      if (stats[1]) stats[1].textContent = r.skills.length;
      if (stats[2]) stats[2].textContent = r.suggestions.length;
      const ul = document.querySelector('#resumeResult ul');
      if (ul) ul.innerHTML = r.suggestions.map(s => `<li>${esc(s)}</li>`).join('');
      let sk = $('skillsFound');
      if (!sk) {
        sk = document.createElement('p');
        sk.id = 'skillsFound';
        sk.className = 'muted';
        const h3 = document.querySelector('#resumeResult h3');
        h3 && h3.parentNode.insertBefore(sk, h3);
      }
      sk.textContent = 'Skills detected: ' + (r.skills.join(', ') || 'none found');
      $('resumeResult').style.display = 'block';
      say('Resume analysed!');
      loadDashboard().catch(() => {});
    } catch (e) {
      $('fileName').textContent = 'No file selected';
      input.value = '';
      say(e.message);
    }
  };

  /* ---------- jobs ---------- */
  async function loadJobs() {
    const { jobs } = await api('jobs');
    const box = document.querySelector('#jobs .list');
    if (!box) return;
    box.innerHTML = jobs.map(j => `
      <div class="card job"><div><h3>${esc(j.title)}</h3>
        <div class="muted">${esc(j.company)} • ${esc(j.location)}</div>
        ${j.skills.map(s => `<span class="tag">${esc(s)}</span>`).join('')}
        ${j.missing.length ? `<div class="muted" style="margin-top:6px">Missing: ${esc(j.missing.join(', '))}</div>` : ''}
      </div><div><div class="match">${j.match}%</div>
        <button class="btn" data-job="${j.id}">${j.saved ? 'Saved ✓' : 'Apply Prep'}</button></div></div>`).join('');
    box.querySelectorAll('button[data-job]').forEach(b => {
      b.onclick = async () => {
        try { await api(`jobs/${b.dataset.job}/save`, { method: 'POST' }); b.textContent = 'Saved ✓'; say('Job saved to your shortlist'); }
        catch (e) { say(e.message); }
      };
    });
  }

  /* ---------- interview ---------- */
  const iv = { qs: [], i: 0, awaitingNext: false, busy: false };
  const ivBtn = () => document.querySelector('#interview .btn');

  function renderQ() {
    const q = iv.qs[iv.i];
    $('qNum').textContent = `Question ${iv.i + 1} of ${iv.qs.length}`;
    $('question').textContent = q.text;
    $('interviewBar').style.width = ((iv.i + 1) / iv.qs.length) * 100 + '%';
    $('answer').value = '';
    $('answer').disabled = false;
    $('feedback').innerHTML = '';
    ivBtn().textContent = 'Submit Answer →';
    iv.awaitingNext = false;
  }

  async function loadInterview() {
    if (!iv.qs.length) iv.qs = (await api('interview/questions')).questions;
    if (!iv.awaitingNext) renderQ();
  }

  window.nextQuestion = async function () {
    if (iv.busy) return;
    try {
      if (!iv.qs.length) await loadInterview();
      if (iv.awaitingNext) {                       // move on after seeing feedback
        iv.i = iv.i < iv.qs.length - 1 ? iv.i + 1 : 0;
        renderQ();
        return;
      }
      const answer = $('answer').value.trim();
      if (!answer) return say('Please type an answer first');
      iv.busy = true;
      const r = await api('interview/answer', { method: 'POST', body: { index: iv.i, answer } });
      $('answer').disabled = true;
      $('feedback').innerHTML =
        `<div class="card"><b>Score: ${r.score}/100</b> — ${esc(r.feedback)}` +
        (r.tips.length ? `<ul>${r.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '') +
        (r.last ? `<p><b>Interview complete! Readiness: ${r.readiness}%</b></p>` : '') + '</div>';
      iv.awaitingNext = true;
      ivBtn().textContent = r.last ? 'Start Over ↺' : 'Next Question →';
      loadDashboard().catch(() => {});
    } catch (e) { say(e.message); }
    finally { iv.busy = false; }
  };

  /* ---------- roadmap ---------- */
  async function loadRoadmap() {
    const { weeks } = await api('roadmap');
    document.querySelectorAll('#roadmap .road').forEach((card, idx) => {
      const w = weeks[idx];
      const b = card.querySelector('button');
      if (!w || !b) return;
      const paint = status => { b.dataset.status = status; b.textContent = status === 'done' ? 'Completed ✓ (undo)' : 'Mark Complete'; };
      paint(w.status);
      b.onclick = async () => {
        const next = b.dataset.status === 'done' ? 'todo' : 'done';
        try { await api(`roadmap/${w.week}`, { method: 'PUT', body: { status: next } }); paint(next); say(next === 'done' ? `Week ${w.week} marked complete` : `Week ${w.week} reopened`); }
        catch (e) { say(e.message); }
      };
    });
  }

  /* ---------- admin ---------- */
  async function loadAdmin() {
    const s = await api('admin/stats');
    const stats = document.querySelectorAll('#admin .grid .stat');
    if (stats[0]) stats[0].textContent = s.students;
    if (stats[1]) stats[1].textContent = s.readyPct + '%';
    if (stats[2]) stats[2].textContent = s.drives;
    const bars = document.querySelectorAll('#admin .progress .bar');
    if (bars[0]) bars[0].style.width = s.readyPct + '%';
    if (bars[1]) bars[1].style.width = s.needPct + '%';
  }

  /* ---------- navigation hook ---------- */
  const loaders = { dashboard: loadDashboard, jobs: loadJobs, interview: loadInterview, roadmap: loadRoadmap, admin: loadAdmin };
  const origShowPage = window.showPage;
  window.showPage = function (page, btn) {
    if (origShowPage) origShowPage(page, btn);
    if (loaders[page]) loaders[page]().catch(e => say(e.message));
  };

  /* ---------- login / logout ---------- */
  const origLogin = window.loginDemo;
  window.loginDemo = async function (e) {
    e.preventDefault();
    const err = $('loginError');
    const btn = e.target.querySelector('button[type=submit]');
    err.style.display = 'none';
    if (btn) btn.disabled = true;
    try {
      const r = await api('auth/login', { method: 'POST', body: { email: $('email').value, password: $('password').value } });
      setToken(r.token);
      if (origLogin) { try { origLogin({ preventDefault() {}, target: e.target }); } catch {} }
      openDashboardUI();
      loadDashboard().catch(() => {});
      say(r.created ? 'Account created — welcome to PlaceMate!' : 'Welcome back!');
    } catch (ex) {
      err.textContent = ex.message;
      err.style.display = 'block';
    } finally { if (btn) btn.disabled = false; }
  };

  const origLogout = window.logoutDemo;
  window.logoutDemo = function () {
    setToken(null);
    if (origLogout) origLogout(); else location.reload();
  };

  /* ---------- restore session on page load ---------- */
  if (getToken()) {
    api('me').then(() => { openDashboardUI(); loadDashboard().catch(() => {}); }).catch(() => setToken(null));
  }
})();
