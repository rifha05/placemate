/* P//laceMate UI helpers.
   Login, registration and data loading are handled in api.js (loaded after this file). */

// ---------- SCREEN SWITCHING ----------

// SHOW INTRODUCTION
function showIntro() {
  document.getElementById('introScreen').style.display = 'flex';
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardApp').style.display = 'none';
  document.body.classList.add('gate-open');
  window.scrollTo(0, 0);
}

// SHOW LOGIN SCREEN
function showLogin() {
  document.getElementById('introScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboardApp').style.display = 'none';
  showSignIn();
  document.body.classList.add('gate-open');
  window.scrollTo(0, 0);
}

 // SHOW ONE AUTH FORM (hides the others)
const AUTH_FORMS = ['signInForm', 'registerForm', 'verifyForm', 'forgotForm', 'resetForm'];

function showAuthForm(id) {
  AUTH_FORMS.forEach(function (f) {
    const el = document.getElementById(f);
    if (el) el.style.display = (f === id) ? 'block' : 'none';
  });
}

function showRegister() { showAuthForm('registerForm'); }
function showSignIn() { showAuthForm('signInForm'); }
function showForgot() { showAuthForm('forgotForm'); }
// ---------- PAGE SWITCHING (dashboard sections) ----------
function showPage(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(page);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  const target = btn || [...document.querySelectorAll('.nav button')]
    .find(b => (b.getAttribute('onclick') || '').includes("'" + page + "'"));
  if (target) target.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    resume: 'Resume AI',
    jobs: 'Job Match',
    interview: 'Mock Interview',
    roadmap: 'Skill Roadmap',
    admin: 'Placement Admin',
  };
  const title = document.getElementById('title');
  if (title) title.textContent = titles[page] || 'Dashboard';

  window.scrollTo(0, 0);
}

// ---------- TOAST NOTIFICATION ----------
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return alert(msg);
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3000);
}
function toggleSidebar() {
  const app = document.getElementById('dashboardApp');
  if (window.innerWidth <= 850) app.classList.toggle('open');
  else app.classList.toggle('collapsed');
}
// Make everything reachable from inline onclick handlers and api.js
window.showIntro = showIntro;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showSignIn = showSignIn;
window.showPage = showPage;
window.toast = toast;
window.toggleSidebar = toggleSidebar;
window.showAuthForm = showAuthForm;
window.showForgot = showForgot;

