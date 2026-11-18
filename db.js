const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Create a free Postgres DB (e.g. neon.tech) and put its connection string in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Hosted Postgres (Neon, Supabase, Render) needs SSL. Set DATABASE_SSL=false for a local Postgres.
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 5,
});

const q = (text, params) => pool.query(text, params);

async function init() {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS resumes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT,
      ats_score INTEGER NOT NULL,
      skills JSONB NOT NULL,
      suggestions JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      skills JSONB NOT NULL,
      base_match INTEGER NOT NULL DEFAULT 60,
      active BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS saved_jobs (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, job_id)
    );
    CREATE TABLE IF NOT EXISTS interview_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      q_index INTEGER NOT NULL,
      answer TEXT NOT NULL,
      score INTEGER NOT NULL,
      feedback TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS roadmap_progress (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      PRIMARY KEY (user_id, week)
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_user ON interview_attempts(user_id, q_index, id);
    CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id, id);
  `);

  const { rows } = await q('SELECT COUNT(*)::int AS n FROM jobs');
  if (rows[0].n === 0) {
    const seed = [
      ['Junior Python Developer', 'TechNova', 'Kochi / Hybrid', ['Python', 'SQL', 'Django'], 92],
      ['Graduate Software Engineer', 'CodeCraft', 'Bengaluru', ['Java', 'DSA', 'Git'], 86],
      ['Frontend Developer Intern', 'WebWorks', 'Remote', ['React', 'JavaScript', 'CSS'], 81],
      ['Data Analyst Trainee', 'InsightLabs', 'Chennai', ['SQL', 'Python', 'Excel'], 74],
      ['Backend Developer (Node.js)', 'CloudNest', 'Remote', ['Node.js', 'JavaScript', 'MongoDB'], 70],
    ];
    for (const j of seed) {
      await q('INSERT INTO jobs (title, company, location, skills, base_match) VALUES ($1,$2,$3,$4,$5)',
        [j[0], j[1], j[2], JSON.stringify(j[3]), j[4]]);
    }
  }
}

module.exports = { q, init, pool };
