const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error(
    'FATAL: DATABASE_URL is not set. Add your Postgres connection string to .env'
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
  max: 5,
});

const q = (text, params) => pool.query(text, params);

async function init() {

  // USERS TABLE
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  // ADD USER DETAILS
  await q(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT
  `);

  // EMAIL VERIFICATION
  await q(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true
  `);

  await q(`
    ALTER TABLE users
    ALTER COLUMN email_verified SET DEFAULT false
  `);

  await q(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS otp_hash TEXT,
    ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0
  `);

  // RESUMES TABLE
  await q(`
    CREATE TABLE IF NOT EXISTS resumes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT,
      ats_score INTEGER NOT NULL,
      skills JSONB NOT NULL,
      suggestions JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  // EXISTING JOBS TABLE
  await q(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      skills JSONB NOT NULL,
      base_match INTEGER NOT NULL DEFAULT 60,
      active BOOLEAN NOT NULL DEFAULT true
    )
  `);

  // EXISTING SAVED JOBS TABLE
  await q(`
    CREATE TABLE IF NOT EXISTS saved_jobs (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, job_id)
    )
  `);

  // NEW TABLE FOR SAVED ADZUNA JOBS
  await q(`
    CREATE TABLE IF NOT EXISTS saved_external_jobs (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      adzuna_job_id TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT,
      location TEXT,
      apply_url TEXT,
      salary_min NUMERIC,
      salary_max NUMERIC,
      description TEXT,
      skills JSONB DEFAULT '[]'::jsonb,
      saved_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (user_id, adzuna_job_id)
    )
  `);

  // INTERVIEW ATTEMPTS TABLE
  await q(`
    CREATE TABLE IF NOT EXISTS interview_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      q_index INTEGER NOT NULL,
      answer TEXT NOT NULL,
      score INTEGER NOT NULL,
      feedback TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  // ROADMAP PROGRESS TABLE
  await q(`
    CREATE TABLE IF NOT EXISTS roadmap_progress (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      PRIMARY KEY (user_id, week)
    )
  `);

  // DATABASE INDEXES
  await q(`
    CREATE INDEX IF NOT EXISTS idx_attempts_user
    ON interview_attempts(user_id, q_index, id)
  `);

  await q(`
    CREATE INDEX IF NOT EXISTS idx_resumes_user
    ON resumes(user_id, id)
  `);

  // CHECK EXISTING JOBS
  const { rows } = await q(
    'SELECT COUNT(*)::int AS n FROM jobs'
  );

  // INSERT SAMPLE JOBS IF EMPTY
  if (rows[0].n === 0) {

    const seed = [
      ['Junior Python Developer', 'TechNova', 'Kochi / Hybrid', ['Python', 'SQL', 'Django'], 92],
      ['Graduate Software Engineer', 'CodeCraft', 'Bengaluru', ['Java', 'DSA', 'Git'], 86],
      ['Frontend Developer Intern', 'WebWorks', 'Remote', ['React', 'JavaScript', 'CSS'], 81],
      ['Data Analyst Trainee', 'InsightLabs', 'Chennai', ['SQL', 'Python', 'Excel'], 74],
      ['Backend Developer (Node.js)', 'CloudNest', 'Remote', ['Node.js', 'JavaScript', 'MongoDB'], 70],
    ];

    for (const j of seed) {
      await q(
        `INSERT INTO jobs
        (title, company, location, skills, base_match)
        VALUES ($1, $2, $3, $4, $5)`,
        [j[0], j[1], j[2], JSON.stringify(j[3]), j[4]]
      );
    }
  }

  console.log('Database initialized successfully!');
}

module.exports = { q, init, pool };