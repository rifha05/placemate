/* =========================================================
   PlaceMate API Connector  (public/api.js)
   Loads AFTER script.js. Matches server.js routes and
   the IDs/classes in index.html.
   ========================================================= */

(function () {
  'use strict';

  // Same origin by default (server.js serves the frontend).
  // Only set window.PLACEMATE_API if the frontend runs elsewhere
  // (and then set CORS_ORIGIN in .env).
  var BASE = (window.PLACEMATE_API || '').replace(/\/$/, '');
  var TOKEN_KEY = 'placemate_token';

  /* ---------------- helpers ---------------- */

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function say(message) {
    if (typeof window.toast === 'function') {
      window.toast(message);
    } else {
      alert(message);
    }
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* storage unavailable */ }
  }

  async function request(path, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers);
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    var body = opts.body;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    var res;
    try {
      res = await fetch(BASE + '/api/' + path, {
        method: opts.method || 'GET',
        headers: headers,
        body: body
      });
    } catch (e) {
      throw new Error('Cannot reach the server. Is PlaceMate running on localhost:3000?');
    }

    var data = null;
    try { data = await res.json(); } catch (e) { data = null; }

    if (!res.ok) {
      // Expired / invalid session -> back to intro
      if (res.status === 401 && token) {
        setToken(null);
        window.showIntro();
      }
      var err = new Error((data && data.error) || 'Request failed (' + res.status + ')');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = label || 'Please wait...';
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  }

  /* ---------------- screen switching ---------------- */

  function openDashboardUI(user) {
    var intro = $('introScreen');
    var login = $('loginScreen');
    var app = $('dashboardApp');
    if (intro) intro.style.display = 'none';
    if (login) login.style.display = 'none';
    if (app) app.style.display = 'flex';
    document.body.classList.remove('gate-open');

    var badge = document.querySelector('.top .user');
    if (badge && user && user.full_name) {
      badge.textContent = '👨‍🎓 ' + user.full_name;
    }
    window.showPage('dashboard');
  }

  /* ---------------- auth ---------------- */

  window.loginDemo = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    var btn = document.querySelector('#signInForm button[type="submit"]');
    setToken(null);
    setBusy(btn, true, 'Signing in...');
    try {
      var data = await request('auth/login', {
        method: 'POST',
        body: {
          email: $('loginEmail').value.trim(),
          password: $('loginPassword').value
        }
      });
      setToken(data.token);
      $('loginPassword').value = '';
      openDashboardUI(data.user);
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(btn, false);
    }
    return false;
  };

  window.registerDemo = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    var btn = document.querySelector('#registerForm button[type="submit"]');

    if ($('regPassword').value !== $('confirmPassword').value) {
      say('Passwords do not match.');
      return false;
    }

    setToken(null);
    setBusy(btn, true, 'Creating account...');
    try {
      var data = await request('auth/register', {
        method: 'POST',
        body: {
          full_name: $('regName').value.trim(),
          email: $('regEmail').value.trim(),
          phone: $('regPhone').value.trim(),
          password: $('regPassword').value
        }
      });
      setToken(data.token);
      $('regPassword').value = '';
      $('confirmPassword').value = '';
      say('Account created. Welcome to PlaceMate!');
      openDashboardUI(data.user);
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(btn, false);
    }
    return false;
  };

  window.logoutDemo = function () {
    setToken(null);
    window.showIntro();
  };

  /* ---------------- dashboard ---------------- */

  async function loadDashboard() {
    try {
      var d = await request('dashboard');
      var cards = document.querySelectorAll('#dashboard .grid .card');

      if (cards[0]) {
        cards[0].querySelector('.stat').textContent = d.atsScore + '/100';
        cards[0].querySelector('.bar').style.width = d.atsScore + '%';
      }
      if (cards[1]) {
        cards[1].querySelector('.stat').textContent = d.readiness + '%';
        cards[1].querySelector('.bar').style.width = d.readiness + '%';
      }
      if (cards[2]) {
        cards[2].querySelector('.stat').textContent = d.jobMatches;
        var note = cards[2].querySelector('p.muted');
        if (note) note.textContent = d.strongMatches + ' strong matches';
      }

      var list = document.querySelector('#dashboard .card.list');
      if (list && Array.isArray(d.activity)) {
        list.innerHTML = d.activity.map(function (a) {
          return '<div>' + esc(a.icon) + ' ' + esc(a.agent) + ' — ' + esc(a.text) + '</div>';
        }).join('');
      }
    } catch (err) {
      console.error('loadDashboard:', err);
    }
  }

  /* ---------------- resume ---------------- */

  function renderResume(r) {
    var box = $('resumeResult');
    if (!box || !r) return;

    var stats = box.querySelectorAll('.grid .card .stat');
    if (stats[0]) stats[0].textContent = r.atsScore + '/100';
    if (stats[1]) stats[1].textContent = r.skills.length;
    if (stats[2]) stats[2].textContent = r.suggestions.length;

    var ul = box.querySelector('ul');
    if (ul) {
      ul.innerHTML = r.suggestions.map(function (s) {
        return '<li>' + esc(s) + '</li>';
      }).join('');
    }
    box.style.display = 'block';
  }

  async function loadResume() {
    try {
      var r = await request('resume');
      if (r) {
        var name = $('fileName');
        if (name) name.textContent = r.filename || 'Previously uploaded resume';
        renderResume(r);
      }
    } catch (err) {
      console.error('loadResume:', err);
    }
  }

  window.analyzeResume = async function (input) {
    var file = input && input.files && input.files[0];
    if (!file) return;

    var name = $('fileName');
    if (name) name.textContent = file.name + ' — analyzing...';

    var form = new FormData();
    form.append('resume', file);

    try {
      var r = await request('resume', { method: 'POST', body: form });
      if (name) name.textContent = file.name;
      renderResume(r);
      say('Resume analyzed!');
      loadDashboard();
    } catch (err) {
      if (name) name.textContent = 'No file selected';
      say(err.message);
    } finally {
      input.value = '';
    }
  };

  /* ---------------- jobs ---------------- */

  async function loadJobs() {
    var list = document.querySelector('#jobs .list');
    if (!list) return;
    try {
      var data = await request('jobs');
      if (!data.jobs.length) {
        list.innerHTML = '<div class="card">No jobs available right now.</div>';
        return;
      }
      list.innerHTML = data.jobs.map(function (j) {
        var tags = j.skills.map(function (s) {
          return '<span class="tag">' + esc(s) + '</span>';
        }).join('');
        var missing = j.missing && j.missing.length
          ? '<p class="muted">Missing: ' + esc(j.missing.join(', ')) + '</p>'
          : '';
        return (
          '<div class="card job">' +
            '<div>' +
              '<h3>' + esc(j.title) + '</h3>' +
              '<p class="muted">' + esc(j.company) + ' • ' + esc(j.location) + '</p>' +
              '<div>' + tags + '</div>' + missing +
            '</div>' +
            '<div style="text-align:right">' +
              '<div class="match">' + esc(j.match) + '%</div>' +
              '<button type="button" class="btn secondary" data-save="' + esc(j.id) + '">' +
                (j.saved ? 'Saved ✓' : 'Save') +
              '</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    } catch (err) {
      list.innerHTML = '<div class="card">Could not load jobs: ' + esc(err.message) + '</div>';
    }
  }

  function wireJobs() {
    var list = document.querySelector('#jobs .list');
    if (!list) return;
    list.addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-save]');
      if (!btn) return;
      try {
        await request('jobs/' + btn.getAttribute('data-save') + '/save', { method: 'POST' });
        btn.textContent = 'Saved ✓';
        say('Job saved.');
      } catch (err) {
        say(err.message);
      }
    });
  }

  /* ---------------- mock interview ---------------- */

  var interview = { questions: [], index: 0 };

  function showQuestion() {
    var total = interview.questions.length;
    if (!total) return;
    var q = interview.questions[interview.index];
    if ($('qNum')) $('qNum').textContent = 'Question ' + (interview.index + 1) + ' of ' + total;
    if ($('question')) $('question').textContent = q.text;
    if ($('interviewBar')) {
      $('interviewBar').style.width = ((interview.index + 1) / total * 100) + '%';
    }
  }

  async function loadInterview() {
    try {
      var data = await request('interview/questions');
      interview.questions = data.questions || [];
      interview.index = 0;
      showQuestion();
    } catch (err) {
      if ($('question')) $('question').textContent = 'Could not load questions: ' + err.message;
    }
  }

  window.nextQuestion = async function () {
    var box = $('answer');
    var answer = box ? box.value.trim() : '';
    if (!interview.questions.length) {
      say('Questions are still loading.');
      return;
    }
    if (!answer) {
      say('Please type your answer first.');
      return;
    }

    var btn = document.querySelector('#interview .btn');
    setBusy(btn, true, 'Scoring...');
    try {
      var r = await request('interview/answer', {
        method: 'POST',
        body: { index: interview.index, answer: answer }
      });

      var tips = (r.tips || []).map(function (t) {
        return '<li>' + esc(t) + '</li>';
      }).join('');

      var html =
        '<div class="card">' +
          '<h3>Score: ' + esc(r.score) + '/100</h3>' +
          '<p>' + esc(r.feedback) + '</p>' +
          (tips ? '<ul>' + tips + '</ul>' : '') +
          '<p class="muted">Overall readiness: ' + esc(r.readiness) + '%</p>' +
          (r.last ? '<p><b>Interview complete! Check your dashboard.</b></p>' : '') +
        '</div>';
      if ($('feedback')) $('feedback').innerHTML = html;

      if (box) box.value = '';
      interview.index = r.last ? 0 : interview.index + 1;
      showQuestion();
      loadDashboard();
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(btn, false);
    }
  };

  /* ---------------- roadmap ---------------- */

  function paintRoadmapButton(btn, done) {
    btn.textContent = done ? 'Completed ✓' : 'Mark Complete';
    btn.dataset.done = done ? '1' : '0';
    btn.classList.toggle('green', done);
    btn.classList.toggle('secondary', !done);
  }

  async function loadRoadmap() {
    try {
      var data = await request('roadmap');
      var cards = document.querySelectorAll('#roadmap .road');
      data.weeks.forEach(function (w, i) {
        var btn = cards[i] && cards[i].querySelector('.btn');
        if (btn) paintRoadmapButton(btn, w.status === 'done');
      });
    } catch (err) {
      console.error('loadRoadmap:', err);
    }
  }

  function wireRoadmap() {
    var section = $('roadmap');
    if (!section) return;
    section.addEventListener('click', async function (e) {
      var btn = e.target.closest('.road .btn');
      if (!btn) return;
      var cards = Array.prototype.slice.call(section.querySelectorAll('.road'));
      var week = cards.indexOf(btn.closest('.road')) + 1;
      var makeDone = btn.dataset.done !== '1';
      try {
        await request('roadmap/' + week, {
          method: 'PUT',
          body: { status: makeDone ? 'done' : 'todo' }
        });
        paintRoadmapButton(btn, makeDone);
      } catch (err) {
        say(err.message);
      }
    });
  }

  /* ---------------- admin ---------------- */

  async function loadAdmin() {
    try {
      var s = await request('admin/stats');
      var stats = document.querySelectorAll('#admin .grid .card .stat');
      if (stats[0]) stats[0].textContent = s.students;
      if (stats[1]) stats[1].textContent = s.readyPct + '%';
      if (stats[2]) stats[2].textContent = s.drives;

      var bars = document.querySelectorAll('#admin > .card .bar');
      if (bars[0]) bars[0].style.width = s.readyPct + '%';
      if (bars[1]) bars[1].style.width = s.needPct + '%';
    } catch (err) {
      say(err.message); // e.g. "Admin access only"
    }
  }

  /* ---------------- load data when a page opens ---------------- */

  var loaders = {
    dashboard: loadDashboard,
    resume: loadResume,
    jobs: loadJobs,
    interview: loadInterview,
    roadmap: loadRoadmap,
    admin: loadAdmin
  };

  var baseShowPage = window.showPage;
  window.showPage = function (page, btn) {
    if (typeof baseShowPage === 'function') baseShowPage(page, btn);
    if (getToken() && loaders[page]) loaders[page]();
  };

  /* ---------------- startup ---------------- */

  function init() {
    wireJobs();
    wireRoadmap();

    if (getToken()) {
      request('me')
        .then(function (data) {
          openDashboardUI(data.user);
        })
        .catch(function () {
          setToken(null);
          window.showIntro();
        });
    } else {
      window.showIntro();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();