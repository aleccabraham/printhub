const { randomUUID } = require('crypto');
const db = require('./db');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      student_name TEXT NOT NULL,
      register_no TEXT NOT NULL DEFAULT '',
      student_email TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      total_pages INTEGER NOT NULL,
      paper_size TEXT NOT NULL,
      print_mode TEXT NOT NULL,
      sides TEXT NOT NULL,
      copies INTEGER NOT NULL,
      binding TEXT NOT NULL,
      page_range_type TEXT NOT NULL,
      page_range TEXT,
      pages_to_print INTEGER NOT NULL,
      per_page_rate REAL NOT NULL,
      binding_fee REAL NOT NULL,
      total_amount REAL NOT NULL,
      screenshot_path TEXT NOT NULL,
      upi_reference_id TEXT NOT NULL,
      payment_submitted_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_approval',
      rejection_reason TEXT,
      decided_by TEXT,
      decided_at TEXT,
      decision_method TEXT,
      queue_position INTEGER,
      expected_pickup_time TEXT,
      approval_token TEXT NOT NULL,
      approval_token_used INTEGER NOT NULL DEFAULT 0,
      approval_token_expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_accounts (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, -- PLAINTEXT: replace with bcrypt hashing before any real deployment
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_accounts (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, -- PLAINTEXT: replace with bcrypt hashing before any real deployment
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      note TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_student_email ON jobs(student_email);
    CREATE INDEX IF NOT EXISTS idx_activity_log_job_id ON activity_log(job_id);
  `);

  migrateSchema();
  seedDemoAccounts();
}

// CREATE TABLE IF NOT EXISTS doesn't add new columns to an already-existing
// table, so any column added after the initial release needs an explicit
// migration here for databases created before that column existed.
function migrateSchema() {
  const jobColumns = db.prepare('PRAGMA table_info(jobs)').all().map((c) => c.name);
  if (!jobColumns.includes('register_no')) {
    db.exec("ALTER TABLE jobs ADD COLUMN register_no TEXT NOT NULL DEFAULT ''");
  }
}

// Demo accounts, plaintext passwords for local testing only.
// TODO: replace with bcrypt hashing before any real deployment.
function seedDemoAccounts() {
  const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admin_accounts').get().c;
  const staffCount = db.prepare('SELECT COUNT(*) AS c FROM staff_accounts').get().c;

  const insertAdmin = db.prepare(
    'INSERT INTO admin_accounts (id, email, password, name, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const insertStaff = db.prepare(
    'INSERT INTO staff_accounts (id, email, password, name, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  const now = new Date().toISOString();
  const seeded = [];

  if (adminCount === 0) {
    const admins = [
      { email: 'admin1@printhub.local', password: 'admin123', name: 'Admin One' },
      { email: 'admin2@printhub.local', password: 'admin123', name: 'Admin Two' },
    ];
    for (const a of admins) {
      insertAdmin.run(`admin-${randomUUID()}`, a.email, a.password, a.name, now);
      seeded.push(`ADMIN   | ${a.email} / ${a.password}`);
    }
  }

  if (staffCount === 0) {
    const staff = [
      { email: 'staff1@printhub.local', password: 'staff123', name: 'Staff One' },
      { email: 'staff2@printhub.local', password: 'staff123', name: 'Staff Two' },
    ];
    for (const s of staff) {
      insertStaff.run(`staff-${randomUUID()}`, s.email, s.password, s.name, now);
      seeded.push(`STAFF   | ${s.email} / ${s.password}`);
    }
  }

  if (seeded.length > 0) {
    console.log('\n=== Seeded demo accounts (plaintext passwords, local testing only) ===');
    seeded.forEach((line) => console.log(line));
    console.log('========================================================================\n');
  }
}

module.exports = { initSchema };
