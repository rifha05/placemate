const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pdfParse = require('pdf-parse');

const { q, init } = require('./db');
const { analyzeResume, scoreAnswer, QUESTIONS } = require('./analyzer');

const PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (PROD ? null : 'dev-secret-change-me');
if (!JWT_SECRET) {
  console.error('FATAL: set JWT_SECRET in production.');
  process.exit(1);
}
const ADMINS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false })); // frontend uses inline onclick handlers
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(',').map(s => s.trim()) }));
}
app.use(express.json({ limit: '100kb' }));

/* ---------- helpers ---------- */
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sign = u => jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: '7d' });
const publicUser = u => ({
  id: u.id,
  full_name: u.full_name,
  email: u.email,
  phone: u.phone,
  role: u.role,
});

const auth = wrap(async (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in' });

  let id;
  try {
    id = jwt.verify(token, JWT_SECRET).id;
  } catch {
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }

  const { rows } = await q(
    'SELECT id, full_name, email, phone, role FROM users WHERE id = $1',
    [id]
  );
  if (!rows[0]) return res.status(401).json({ error: 'Session expired, please sign in again' });

  req.user = rows[0];
  next();
});

const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access only' });

async function latestResume(uid) {
  const { rows } = await q(
    'SELECT * FROM resumes WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
    [uid]
  );
  return rows[0] || null;
}

// Readiness = average of the latest score for each question (unanswered count as 0)
async function readiness(uid) {
  const { rows } = await q(
    `SELECT COALESCE(SUM(score),0)::int AS total FROM (
       SELECT DISTINCT ON (q_index) score FROM interview_attempts
       WHERE user_id = $1 ORDER BY q_index, id DESC) t`,
    [uid]
  );
  return Math.round(rows[0].total / QUESTIONS.length);
}

async function rankJobs(uid) {
  const resume = await latestResume(uid);
  const have = resume ? new Set(resume.skills.map(s => s.toLowerCase())) : null;
  const saved = new Set(
    (await q('SELECT job_id FROM saved_jobs WHERE user_id = $1', [uid])).rows.map(r => r.job_id)
  );
  const { rows } = await q('SELECT * FROM jobs WHERE active = true');

  return rows
    .map(j => {
      const required = j.skills;
      let match = j.base_match;
      let missing = [];
      if (have) {
        const hit = required.filter(s => have.has(s.toLowerCase()));
        missing = required.filter(s => !have.has(s.toLowerCase()));
        match = Math.round(35 + 65 * (hit.length / required.length));
      }
      return {
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        skills: required,
        missing,
        match,
        saved: saved.has(j.id),
      };
    })
    .sort((a, b) => b.match - a.match);
}

/* ---------- rate limiters ---------- */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads. Try again in a few minutes.' },
});

app.use('/api', apiLimiter);

/* ---------- health check (for hosting platforms) ---------- */
app.get('/healthz', wrap(async (req, res) => {
  await q('SELECT 1');
  res.send('ok');
}));

/* ---------- auth: register ---------- */
app.post('/api/auth/register', authLimiter, wrap(async (req, res) => {
  const full_name = String(req.body.full_name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');

  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Full name and phone number are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 8–128 characters.' });
  }

  const exists = (await q('SELECT 1 FROM users WHERE email = $1', [email])).rows[0];
  if (exists) {
    return res.status(409).json({ error: 'This email is already registered. Please sign in.' });
  }

  const role = ADMINS.includes(email) ? 'admin' : 'student';
  const ins = await q(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, full_name, email, phone, role`,
    [full_name, email, phone, await bcrypt.hash(password, 10), role]
  );

  const user = ins.rows[0];
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

/* ---------- auth: login ---------- */
app.post('/api/auth/login', authLimiter, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password || password.length > 128) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  const user = (await q('SELECT * FROM users WHERE email = $1', [email])).rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

  if (ADMINS.includes(email) && user.role !== 'admin') {
    await q("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
    user.role = 'admin';
  }

  res.json({ token: sign(user), user: publicUser(user) });
}));

app.get('/api/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

/* ---------- dashboard ---------- */
app.get('/api/dashboard', auth, wrap(async (req, res) => {
  const uid = req.user.id;
  const resume = await latestResume(uid);
  const jobs = await rankJobs(uid);
  const activity = [];

  activity.push({
    icon: '🤖',
    agent: 'Resume Analyzer',
    text: resume
      ? `found ${resume.suggestions.length} improvement areas`
      : 'waiting for your resume — upload a PDF to begin',
  });

  if (jobs[0]) {
    activity.push({
      icon: '🎯',
      agent: 'Job Matcher',
      text: `ranked ${jobs[0].title} at ${jobs[0].match}%`,
    });
  }

  const weakest = (await q(
    `SELECT q_index, score FROM (
       SELECT DISTINCT ON (q_index) q_index, score FROM interview_attempts
       WHERE user_id = $1 ORDER BY q_index, id DESC) t
     ORDER BY score ASC LIMIT 1`,
    [uid]
  )).rows[0];

  activity.push({
    icon: '🧠',
    agent: 'Feedback Agent',
    text: weakest
      ? `identified "${QUESTIONS[weakest.q_index].topic}" as your weakest area`
      : 'complete a mock interview to get feedback',
  });

  res.json({
    atsScore: resume ? resume.ats_score : 0,
    readiness: await readiness(uid),
    jobMatches: jobs.length,
    strongMatches: jobs.filter(j => j.match >= 80).length,
    activity,
  });
}));

/* ---------- resume ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

app.post('/api/resume', auth, uploadLimiter, upload.single('resume'), wrap(async (req, res) => {
  const f = req.file;
  if (!f) return res.status(400).json({ error: 'Please upload a PDF file.' });
  if (f.buffer.slice(0, 4).toString() !== '%PDF') {
    return res.status(400).json({ error: 'That file is not a valid PDF.' });
  }

  let text;
  try {
    text = (await pdfParse(f.buffer)).text || '';
  } catch (err) {
    console.error('PDF parsing error:', err);
    return res.status(422).json({ error: 'Could not read this PDF.' });
  }

  if (text.trim().length < 50) {
    return res.status(422).json({
      error: 'No readable text found. Scanned PDFs are not supported — export a text PDF.',
    });
  }

  // ---- FIX: this part was missing, so the request never got a response ----
  const result = analyzeResume(text);

  await q(
    `INSERT INTO resumes (user_id, filename, ats_score, skills, suggestions)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      req.user.id,
      f.originalname,
      result.atsScore,
      JSON.stringify(result.skills),
      JSON.stringify(result.suggestions),
    ]
  );

  res.json({
    filename: f.originalname,
    atsScore: result.atsScore,
    skills: result.skills,
    suggestions: result.suggestions,
  });
}));

app.get('/api/resume', auth, wrap(async (req, res) => {
  const r = await latestResume(req.user.id);

  res.json(r ? {
    filename: r.filename,
    atsScore: r.ats_score,
    skills: r.skills,
    suggestions: r.suggestions
  } : null);
}));

/* ---------- jobs ---------- */
app.get('/api/jobs', auth, wrap(async (req, res) => {
  res.json({
    jobs: await rankJobs(req.user.id),
    personalised: !!(await latestResume(req.user.id)),
  });
}));

app.post('/api/jobs/:id/save', auth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !(await q('SELECT 1 FROM jobs WHERE id = $1', [id])).rows[0]) {
    return res.status(404).json({ error: 'Job not found' });
  }
  await q(
    'INSERT INTO saved_jobs (user_id, job_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.user.id, id]
  );
  res.json({ saved: true });
}));

/* ---------- interview ---------- */
app.get('/api/interview/questions', auth, (req, res) => {
  res.json({
    role: 'Junior Python Developer',
    questions: QUESTIONS.map(x => ({ topic: x.topic, text: x.text })),
  });
});

app.post('/api/interview/answer', auth, wrap(async (req, res) => {
  const index = Number(req.body.index);
  const answer = String(req.body.answer || '').trim();

  if (!Number.isInteger(index) || index < 0 || index >= QUESTIONS.length) {
    return res.status(400).json({ error: 'Invalid question.' });
  }
  if (!answer || answer.length > 3000) {
    return res.status(400).json({ error: 'Answer must be 1–3000 characters.' });
  }

  const r = scoreAnswer(QUESTIONS[index], answer);
  await q(
    'INSERT INTO interview_attempts (user_id, q_index, answer, score, feedback) VALUES ($1,$2,$3,$4,$5)',
    [req.user.id, index, answer, r.score, r.feedback]
  );
  res.json({
    ...r,
    readiness: await readiness(req.user.id),
    last: index === QUESTIONS.length - 1,
  });
}));

/* ---------- roadmap ---------- */
app.get('/api/roadmap', auth, wrap(async (req, res) => {
  const { rows } = await q(
    'SELECT week, status FROM roadmap_progress WHERE user_id = $1',
    [req.user.id]
  );
  const map = Object.fromEntries(rows.map(r => [r.week, r.status]));
  res.json({ weeks: [1, 2, 3, 4].map(w => ({ week: w, status: map[w] || 'todo' })) });
}));

app.put('/api/roadmap/:week', auth, wrap(async (req, res) => {
  const week = Number(req.params.week);
  const status = req.body.status;

  if (![1, 2, 3, 4].includes(week) || !['todo', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid week or status.' });
  }

  await q(
    `INSERT INTO roadmap_progress (user_id, week, status) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, week) DO UPDATE SET status = EXCLUDED.status`,
    [req.user.id, week, status]
  );
  res.json({ week, status });
}));

/* ---------- admin ---------- */
app.get('/api/admin/stats', auth, adminOnly, wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT u.id, COALESCE(SUM(l.score),0)::int AS total
     FROM users u
     LEFT JOIN (SELECT DISTINCT ON (user_id, q_index) user_id, score
                FROM interview_attempts ORDER BY user_id, q_index, id DESC) l ON l.user_id = u.id
     WHERE u.role = 'student' GROUP BY u.id`
  );

  const ready = rows.filter(r => Math.round(r.total / QUESTIONS.length) >= 70).length;
  const pct = rows.length ? Math.round((100 * ready) / rows.length) : 0;
  const drives = (await q('SELECT COUNT(*)::int AS n FROM jobs WHERE active = true')).rows[0].n;

  res.json({
    students: rows.length,
    readyPct: pct,
    needPct: rows.length ? 100 - pct : 0,
    drives,
  });
}));

/* ---------- static frontend ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));

/* ---------- error handler ---------- */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5 MB).' : 'Upload failed.',
    });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request data.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 3000;
init()
  .then(() => app.listen(PORT, () => console.log(`PlaceMate running on http://localhost:${PORT}`)))
  .catch(e => {
    console.error('Database init failed:', e);
    process.exit(1);
  });