/* =========================================================
   PlaceMate API Connector (frontend/api.js)
   Loads after script.js and connects the PlaceMate UI to
   the Express API, including Adzuna multi-category search.
   ========================================================= */

(function () {
  'use strict';

  var BASE = (window.PLACEMATE_API || '').replace(/\/$/, '');
  var TOKEN_KEY = 'placemate_token';

  /* ---------------- helpers ---------------- */

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
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
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      // Storage may be unavailable in restricted browser modes.
    }
  }

  async function request(path, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {});
    var token = getToken();

    if (token) headers.Authorization = 'Bearer ' + token;

    var body = opts.body;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    var response;
    try {
      response = await fetch(BASE + '/api/' + path, {
        method: opts.method || 'GET',
        headers: headers,
        body: body
      });
    } catch (e) {
      throw new Error('Cannot reach the server. Is PlaceMate running on localhost:3000?');
    }

    var data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401 && token) {
        setToken(null);
        if (typeof window.showIntro === 'function') window.showIntro();
      }

      var error = new Error((data && data.error) || 'Request failed (' + response.status + ')');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  function setBusy(button, busy, label) {
    if (!button) return;

    if (busy) {
      if (!button.dataset.label) button.dataset.label = button.textContent;
      button.textContent = label || 'Please wait...';
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  }

  function safeHttpUrl(value) {
    try {
      var parsed = new URL(String(value || ''), window.location.origin);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
      return parsed.href;
    } catch (e) {
      return '';
    }
  }

  function formatSalary(min, max) {

  function isValidSalary(value) {
    return (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== '' &&
      Number.isFinite(Number(value))
    );
  }

  var hasMin = isValidSalary(min);
  var hasMax = isValidSalary(max);

  var formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  });

  if (hasMin && hasMax) {
    return '₹' + formatter.format(Number(min)) +
      ' – ₹' + formatter.format(Number(max));
  }

  if (hasMin) {
    return 'From ₹' + formatter.format(Number(min));
  }

  if (hasMax) {
    return 'Up to ₹' + formatter.format(Number(max));
  }

  return 'Salary not disclosed in listing';
}
  /* ---------------- screen switching ---------------- */

  function openDashboardUI(user) {
    var intro = $('introScreen');
    var login = $('loginScreen');
    var app = $('dashboardApp');

    if (intro) intro.style.display = 'none';
    if (login) login.style.display = 'none';
    if (app) app.style.display = 'flex';
    if (document.body) document.body.classList.remove('gate-open');

    var badge = document.querySelector('.top .user');
    if (badge && user && user.full_name) {
      badge.textContent = '👨‍🎓 ' + user.full_name;
    }

    var adminNav = $('adminNavBtn');
    if (adminNav) {
      adminNav.style.display = user && user.role === 'admin' ? '' : 'none';
    }

    if (typeof window.showPage === 'function') window.showPage('dashboard');
  }

  /* ---------------- auth ---------------- */

  var pendingEmail = '';
  var resetEmail = '';

  function showVerifyForm(email) {
    pendingEmail = email;
    $('signInForm').style.display = 'none';
    $('registerForm').style.display = 'none';
    $('verifyForm').style.display = 'block';
    $('verifyMsg').textContent = 'We emailed a 6-digit code to ' + email + '. If you do not see it, check your Spam folder. It expires in 10 minutes.';
    $('otpCode').value = '';
    $('otpCode').focus();
  }

  window.loginDemo = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    var button = document.querySelector('#signInForm button[type="submit"]');
    setToken(null);
    setBusy(button, true, 'Signing in...');

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
      if (err.data && err.data.needsVerification) {
        showVerifyForm(err.data.email);
        say('Please verify your email. Tap "Resend code" if you need a new one.');
      } else {
        say(err.message);
      }
    } finally {
      setBusy(button, false);
    }
    return false;
  };

  window.registerDemo = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    var button = document.querySelector('#registerForm button[type="submit"]');

    if ($('regPassword').value !== $('confirmPassword').value) {
      say('Passwords do not match.');
      return false;
    }

    setToken(null);
    setBusy(button, true, 'Creating account...');

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
      $('regPassword').value = '';
      $('confirmPassword').value = '';
      say('Code sent! Check your email and Spam folder.');
      showVerifyForm(data.email);
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(button, false);
    }
    return false;
  };

  window.verifyEmail = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    var button = document.querySelector('#verifyForm button[type="submit"]');
    setBusy(button, true, 'Verifying...');

    try {
      var data = await request('auth/verify', {
        method: 'POST',
        body: { email: pendingEmail, code: $('otpCode').value.trim() }
      });
      setToken(data.token);
      say('Email verified. Welcome to PlaceMate!');
      openDashboardUI(data.user);
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(button, false);
    }
    return false;
  };

  window.resendCode = async function () {
    try {
      await request('auth/resend', {
        method: 'POST',
        body: { email: pendingEmail }
      });
      say('A new code was sent.');
    } catch (err) {
      say(err.message);
    }
  };

  window.forgotPassword = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    var button = document.querySelector('#forgotForm button[type="submit"]');
    setBusy(button, true, 'Sending...');

    try {
      resetEmail = $('forgotEmail').value.trim().toLowerCase();
      await request('auth/forgot', {
        method: 'POST',
        body: { email: resetEmail }
      });
      say('If that email has an account, a code was sent. Check Spam too.');
      $('resetMsg').textContent = 'Enter the 6-digit code sent to ' + resetEmail + ' and choose a new password.';
      window.showAuthForm('resetForm');
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(button, false);
    }
    return false;
  };

  window.resetPassword = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if ($('newPassword').value !== $('confirmNewPassword').value) {
      say('Passwords do not match.');
      return false;
    }

    var button = document.querySelector('#resetForm button[type="submit"]');
    setBusy(button, true, 'Saving...');

    try {
      await request('auth/reset', {
        method: 'POST',
        body: {
          email: resetEmail,
          code: $('resetCode').value.trim(),
          password: $('newPassword').value
        }
      });
      ['resetCode', 'newPassword', 'confirmNewPassword'].forEach(function (id) {
        $(id).value = '';
      });
      say('Password changed. Please sign in.');
      window.showAuthForm('signInForm');
      $('loginEmail').value = resetEmail;
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(button, false);
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
      var data = await request('dashboard');
      var cards = document.querySelectorAll('#dashboard .grid .card');

      if (cards[0]) {
        var atsStat = cards[0].querySelector('.stat');
        var atsBar = cards[0].querySelector('.bar');
        if (atsStat) atsStat.textContent = data.atsScore + '/100';
        if (atsBar) atsBar.style.width = data.atsScore + '%';
      }
      if (cards[1]) {
        var readinessStat = cards[1].querySelector('.stat');
        var readinessBar = cards[1].querySelector('.bar');
        if (readinessStat) readinessStat.textContent = data.readiness + '%';
        if (readinessBar) readinessBar.style.width = data.readiness + '%';
      }
      if (cards[2]) {
        var jobsStat = cards[2].querySelector('.stat');
        var note = cards[2].querySelector('p.muted');
        if (jobsStat) jobsStat.textContent = data.jobMatches;
        if (note) note.textContent = data.strongMatches + ' strong matches';
      }

      var activityList = document.querySelector('#dashboard .card.list');
      if (activityList && Array.isArray(data.activity)) {
        activityList.innerHTML = data.activity.map(function (item) {
          return '<div>' + esc(item.icon) + ' ' + esc(item.agent) + ' — ' + esc(item.text) + '</div>';
        }).join('');
      }
    } catch (err) {
      console.error('loadDashboard:', err);
    }
  }

  /* ---------------- resume ---------------- */

  function renderResume(result) {
    var box = $('resumeResult');
    if (!box || !result) return;

    var stats = box.querySelectorAll('.grid .card .stat');
    if (stats[0]) stats[0].textContent = result.atsScore + '/100';
    if (stats[1]) stats[1].textContent = (result.skills || []).length;
    if (stats[2]) stats[2].textContent = (result.suggestions || []).length;

    var list = box.querySelector('ul');
    if (list) {
      list.innerHTML = (result.suggestions || []).map(function (suggestion) {
        return '<li>' + esc(suggestion) + '</li>';
      }).join('');
    }

    box.style.display = 'block';
  }

  async function loadResume() {
    try {
      var result = await request('resume');
      if (result) {
        var name = $('fileName');
        if (name) name.textContent = result.filename || 'Previously uploaded resume';
        renderResume(result);
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
      var result = await request('resume', { method: 'POST', body: form });
      if (name) name.textContent = file.name;
      renderResume(result);
      say('Resume analyzed!');
      loadDashboard();
    } catch (err) {
      if (name) name.textContent = 'No file selected';
      say(err.message);
    } finally {
      input.value = '';
    }
  };

  /* ---------------- jobs: categories + internal jobs ---------------- */

  var jobCategoriesLoaded = false;

  async function loadJobCategories() {
    var select = $('jobCategoryInput');
    if (!select || jobCategoriesLoaded) return;

    try {
      var data = await request('jobs/categories');
      var categories = Array.isArray(data.categories) ? data.categories : [];
      var currentValue = select.value;

      select.innerHTML = '<option value="">All categories</option>';
      categories.forEach(function (category) {
        if (!category || !category.tag || !category.label) return;
        var option = document.createElement('option');
        option.value = category.tag;
        option.textContent = category.label;
        select.appendChild(option);
      });

      if (currentValue) select.value = currentValue;
      jobCategoriesLoaded = true;

      if (!categories.length) {
        console.warn('Adzuna returned no job categories.');
      }
    } catch (err) {
      console.error('Could not load Adzuna categories:', err);
      // Keep the All categories option available; the user can still search.
    }
  }

  function renderInternalJobs(jobs) {
    var list = document.querySelector('#jobs .list');
    if (!list) return;

    if (!jobs || !jobs.length) {
      list.innerHTML = '<div class="card">No internal PlaceMate jobs are available right now. Search Adzuna above for more vacancies.</div>';
      return;
    }

    list.innerHTML = jobs.map(function (job) {
      var tags = (job.skills || []).map(function (skill) {
        return '<span class="tag">' + esc(skill) + '</span>';
      }).join('');

      var missing = job.missing && job.missing.length
        ? '<p class="muted">Missing: ' + esc(job.missing.join(', ')) + '</p>'
        : '';

      return (
        '<div class="card job">' +
          '<div>' +
            '<h3>' + esc(job.title) + '</h3>' +
            '<p class="muted">' + esc(job.company) + ' • ' + esc(job.location) + '</p>' +
            '<div>' + tags + '</div>' + missing +
          '</div>' +
          '<div style="text-align:right">' +
            '<div class="match">' + esc(job.match) + '%</div>' +
            '<button type="button" class="btn secondary" data-save="' + esc(job.id) + '" ' +
              (job.saved ? 'disabled' : '') + '>' +
              (job.saved ? 'Saved ✓' : 'Save') +
            '</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  
async function loadJobs() {
  var list = document.querySelector('#jobs .list');
  if (!list) return;

  loadJobCategories();

  try {
    var data = await request('jobs');
    renderInternalJobs(data.jobs || []);

    var resume = await request('resume');

    if (resume && Array.isArray(resume.skills) && resume.skills.length) {
      var searchInput = $('jobSearchInput');

      if (searchInput) {
        searchInput.value = resume.skills.slice(0, 3).join(' ');
        await searchExternalJobs();
      }
    }
  } catch (err) {
    list.innerHTML =
      '<div class="card">Could not load jobs: ' + esc(err.message) + '</div>';
  }
}


  /* ---------------- jobs: Adzuna search ---------------- */

  var currentExternalJobs = [];

  function renderExternalJobs(jobs) {
    var list = document.querySelector('#jobs .list');
    if (!list) return;

    if (!jobs.length) {
      list.innerHTML = '<div class="card">No matching Adzuna vacancies were found. Try another keyword, location, or category.</div>' +
        '<p class="muted">Listings provided by <a href="https://www.adzuna.in/" target="_blank" rel="noopener noreferrer">Adzuna</a>.</p>';
      return;
    }

    list.innerHTML = jobs.map(function (job, index) {
      var tags = (job.skills || []).map(function (skill) {
        return '<span class="tag">' + esc(skill) + '</span>';
      }).join('');

      var missing = job.missing && job.missing.length
        ? '<p class="muted"><b>Skills to improve:</b> ' + esc(job.missing.join(', ')) + '</p>'
        : '';

      var description = job.description
        ? '<p>' + esc(job.description.slice(0, 260)) +
          (job.description.length > 260 ? '…' : '') + '</p>'
        : '';

      var salary = '<p class="muted">' + esc(formatSalary(job.salaryMin, job.salaryMax)) + '</p>';
      var applyUrl = safeHttpUrl(job.redirectUrl);
      var applyButton = applyUrl
        ? '<a class="btn" href="' + esc(applyUrl) + '" target="_blank" rel="noopener noreferrer">Apply Now ↗</a>'
        : '<span class="muted">Application link unavailable</span>';

      var matchText = job.match == null ? '—' : String(job.match) + '%';
      var saveButton = job.saved
        ? '<button type="button" class="btn secondary" disabled>Saved ✓</button>'
        : '<button type="button" class="btn secondary" data-external-save="' + index + '">Save Job</button>';

      return (
        '<div class="card job">' +
          '<div>' +
            '<h3>' + esc(job.title) + '</h3>' +
            '<p class="muted">' + esc(job.company || 'Company not specified') + ' • ' +
              esc(job.location || 'Location not specified') + '</p>' +
            salary +
            description +
            '<div>' + tags + '</div>' + missing +
          '</div>' +
          '<div style="text-align:right;min-width:120px">' +
            '<div class="match">' + esc(matchText) + '</div>' +
            '<p class="muted">Resume match</p>' +
            saveButton +
            '<div style="margin-top:8px">' + applyButton + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('') +
    '<p class="muted" style="text-align:center;margin-top:14px">Job listings provided by <a href="https://www.adzuna.in/" target="_blank" rel="noopener noreferrer">Adzuna</a>.</p>';
  }

  async function searchExternalJobs() {
    var list = document.querySelector('#jobs .list');
    if (!list) return;

    var whatInput = $('jobSearchInput');
    var whereInput = $('jobLocationInput');
    var categoryInput = $('jobCategoryInput');
    var searchButton = $('jobSearchBtn');

    var what = whatInput ? whatInput.value.trim() : '';
    var where = whereInput ? whereInput.value.trim() : '';
    var category = categoryInput ? categoryInput.value : '';

    if (!what && !where && !category) {
      say('Enter a job title, location, or select a category.');
      return;
    }

    var params = new URLSearchParams({ page: '1' });
    if (what) params.set('what', what);
    if (where) params.set('where', where);
    if (category) params.set('category', category);

    setBusy(searchButton, true, 'Searching...');
    list.innerHTML = '<div class="card">Searching Adzuna vacancies...</div>';

    try {
      var data = await request('jobs/search?' + params.toString());
      currentExternalJobs = Array.isArray(data.jobs) ? data.jobs : [];
      renderExternalJobs(currentExternalJobs);
    } catch (err) {
      currentExternalJobs = [];
      list.innerHTML = '<div class="card">Job search failed: ' + esc(err.message) + '</div>';
      console.error('Adzuna job search failed:', err);
    } finally {
      setBusy(searchButton, false);
    }
  }

  // Also expose the function for optional use by an inline HTML handler.
  window.searchAdzunaJobs = searchExternalJobs;

  async function saveExternalJob(index, button) {
    var job = currentExternalJobs[index];
    if (!job) return;

    setBusy(button, true, 'Saving...');

    try {
      await request('jobs/adzuna/' + encodeURIComponent(job.id) + '/save', {
        method: 'POST',
        body: {
          title: job.title,
          company: job.company,
          location: job.location,
          applyUrl: job.redirectUrl,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          description: job.description,
          skills: job.skills || []
        }
      });

      job.saved = true;
      button.textContent = 'Saved ✓';
      button.disabled = true;
      say('Job saved successfully.');
    } catch (err) {
      say(err.message);
      setBusy(button, false);
    }
  }

  function wireJobs() {
    var section = $('jobs');
    if (!section || section.dataset.jobsWired) return;
    section.dataset.jobsWired = '1';

    section.addEventListener('click', async function (e) {
      var externalButton = e.target.closest('[data-external-save]');
      if (externalButton) {
        var externalIndex = Number(externalButton.getAttribute('data-external-save'));
        await saveExternalJob(externalIndex, externalButton);
        return;
      }

      var internalButton = e.target.closest('[data-save]');
      if (!internalButton) return;

      try {
        await request('jobs/' + encodeURIComponent(internalButton.getAttribute('data-save')) + '/save', {
          method: 'POST'
        });
        internalButton.textContent = 'Saved ✓';
        internalButton.disabled = true;
        say('Job saved.');
      } catch (err) {
        say(err.message);
      }
    });

    var searchButton = $('jobSearchBtn');
    if (searchButton) {
      searchButton.addEventListener('click', searchExternalJobs);
    }

    var searchInput = $('jobSearchInput');
    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchExternalJobs();
        }
      });
    }

    var locationInput = $('jobLocationInput');
    if (locationInput) {
      locationInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchExternalJobs();
        }
      });
    }
  }

  /* ---------------- mock interview ---------------- */

  var interview = { questions: [], index: 0 };

  function showQuestion() {
    var total = interview.questions.length;
    if (!total) return;

    var question = interview.questions[interview.index];
    if ($('qNum')) $('qNum').textContent = 'Question ' + (interview.index + 1) + ' of ' + total;
    if ($('question')) $('question').textContent = question.text;
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
    var answerBox = $('answer');
    var answer = answerBox ? answerBox.value.trim() : '';

    if (!interview.questions.length) {
      say('Questions are still loading.');
      return;
    }
    if (!answer) {
      say('Please type your answer first.');
      return;
    }

    var button = document.querySelector('#interview .btn');
    setBusy(button, true, 'Scoring...');

    try {
      var result = await request('interview/answer', {
        method: 'POST',
        body: { index: interview.index, answer: answer }
      });

      var tips = (result.tips || []).map(function (tip) {
        return '<li>' + esc(tip) + '</li>';
      }).join('');

      var html =
        '<div class="card">' +
          '<h3>Score: ' + esc(result.score) + '/100</h3>' +
          '<p>' + esc(result.feedback) + '</p>' +
          (tips ? '<ul>' + tips + '</ul>' : '') +
          '<p class="muted">Overall readiness: ' + esc(result.readiness) + '%</p>' +
          (result.last ? '<p><b>Interview complete! Check your dashboard.</b></p>' : '') +
        '</div>';

      if ($('feedback')) $('feedback').innerHTML = html;
      if (answerBox) answerBox.value = '';
      interview.index = result.last ? 0 : interview.index + 1;
      showQuestion();
      loadDashboard();
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(button, false);
    }
  };

  /* ---------------- roadmap ---------------- */

  function paintRoadmapButton(button, done) {
    button.textContent = done ? 'Completed ✓' : 'Mark Complete';
    button.dataset.done = done ? '1' : '0';
    button.classList.toggle('green', done);
    button.classList.toggle('secondary', !done);
  }

  async function loadRoadmap() {
    try {
      var data = await request('roadmap');
      var cards = document.querySelectorAll('#roadmap .road');
      data.weeks.forEach(function (week, index) {
        var button = cards[index] && cards[index].querySelector('.btn');
        if (button) paintRoadmapButton(button, week.status === 'done');
      });
    } catch (err) {
      console.error('loadRoadmap:', err);
    }
  }

  function wireRoadmap() {
    var section = $('roadmap');
    if (!section || section.dataset.roadmapWired) return;
    section.dataset.roadmapWired = '1';

    section.addEventListener('click', async function (e) {
      var button = e.target.closest('.road .btn');
      if (!button) return;

      var cards = Array.prototype.slice.call(section.querySelectorAll('.road'));
      var week = cards.indexOf(button.closest('.road')) + 1;
      var makeDone = button.dataset.done !== '1';

      try {
        await request('roadmap/' + week, {
          method: 'PUT',
          body: { status: makeDone ? 'done' : 'todo' }
        });
        paintRoadmapButton(button, makeDone);
      } catch (err) {
        say(err.message);
      }
    });
  }

  /* ---------------- admin ---------------- */

  async function loadAdminJobs() {
    var box = $('adminJobs');
    if (!box) return;

    try {
      var data = await request('admin/jobs');
      box.innerHTML = data.jobs.length ? data.jobs.map(function (job) {
        return '<div class="job" style="padding:10px 0;border-bottom:1px solid #e8ebf2">' +
          '<div><b>' + esc(job.title) + '</b>' +
          '<p class="muted">' + esc(job.company) + ' • ' + esc(job.location) + ' • ' +
            esc((job.skills || []).join(', ')) + '</p></div>' +
          '<button type="button" class="btn ' + (job.active ? 'secondary' : 'green') + '" data-job="' +
            esc(job.id) + '" data-active="' + (job.active ? '1' : '0') + '">' +
            (job.active ? 'Close drive' : 'Reopen') + '</button>' +
          '</div>';
      }).join('') : '<p class="muted">No drives yet.</p>';
    } catch (err) {
      box.innerHTML = '<p class="muted">' + esc(err.message) + '</p>';
    }
  }

  async function loadAdmin() {
    try {
      var statsData = await request('admin/stats');
      var stats = document.querySelectorAll('#admin .grid .card .stat');
      if (stats[0]) stats[0].textContent = statsData.students;
      if (stats[1]) stats[1].textContent = statsData.readyPct + '%';
      if (stats[2]) stats[2].textContent = statsData.drives;

      var bars = document.querySelectorAll('#admin > .card .bar');
      if (bars[0]) bars[0].style.width = statsData.readyPct + '%';
      if (bars[1]) bars[1].style.width = statsData.needPct + '%';
      loadAdminJobs();
    } catch (err) {
      say(err.message);
    }
  }

  window.addJob = async function () {
    var button = $('addJobBtn');
    setBusy(button, true, 'Adding...');

    try {
      await request('admin/jobs', {
        method: 'POST',
        body: {
          title: $('jobTitle').value.trim(),
          company: $('jobCompany').value.trim(),
          location: $('jobLocation').value.trim(),
          skills: $('jobSkills').value
        }
      });
      ['jobTitle', 'jobCompany', 'jobLocation', 'jobSkills'].forEach(function (id) {
        $(id).value = '';
      });
      say('Drive added.');
      loadAdmin();
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(button, false);
    }
  };

  function wireAdminJobs() {
    var box = $('adminJobs');
    if (!box || box.dataset.adminJobsWired) return;
    box.dataset.adminJobsWired = '1';

    box.addEventListener('click', async function (e) {
      var button = e.target.closest('[data-job]');
      if (!button) return;

      try {
        await request('admin/jobs/' + button.getAttribute('data-job'), {
          method: 'PUT',
          body: { active: button.getAttribute('data-active') !== '1' }
        });
        loadAdmin();
      } catch (err) {
        say(err.message);
      }
    });
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
  window.showPage = function (page, button) {
    if (typeof baseShowPage === 'function') baseShowPage(page, button);
    if (getToken() && loaders[page]) loaders[page]();
  };

  /* ---------------- startup ---------------- */

  function init() {
    wireJobs();
    wireRoadmap();
    wireAdminJobs();

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
