const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { approveJob, rejectJob } = require('../services/jobDecision');
const { getBaseUrl } = require('../utils/baseUrl');

const router = express.Router();
router.use(requireAdmin);

router.get('/pending', (req, res) => {
  const jobs = db.prepare("SELECT * FROM jobs WHERE status = 'pending_approval' ORDER BY created_at ASC").all();
  res.json(jobs);
});

router.get('/queue', (req, res) => {
  const jobs = db.prepare("SELECT * FROM jobs WHERE status IN ('queued', 'printing') ORDER BY status DESC, queue_position ASC").all();
  res.json(jobs);
});

router.get('/jobs', (req, res) => {
  const jobs = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
  res.json(jobs);
});

router.post('/jobs/:id/approve', async (req, res) => {
  const result = await approveJob({
    jobId: req.params.id,
    decidedBy: req.session.user.name,
    method: 'dashboard',
    baseUrl: getBaseUrl(req),
  });
  if (result.error === 'not_found') return res.status(404).json({ error: 'Job not found' });
  if (result.error === 'already_actioned') return res.status(409).json({ error: 'Job already actioned', job: result.job });
  res.json({ job: result.job });
});

router.post('/jobs/:id/reject', async (req, res) => {
  const result = await rejectJob({
    jobId: req.params.id,
    decidedBy: req.session.user.name,
    method: 'dashboard',
    reason: req.body.reason,
    baseUrl: getBaseUrl(req),
  });
  if (result.error === 'not_found') return res.status(404).json({ error: 'Job not found' });
  if (result.error === 'already_actioned') return res.status(409).json({ error: 'Job already actioned', job: result.job });
  res.json({ job: result.job });
});

// --- Staff account management -------------------------------------------------
router.get('/staff', (req, res) => {
  const staff = db.prepare('SELECT id, email, name, created_at FROM staff_accounts ORDER BY created_at ASC').all();
  res.json(staff);
});

// Passwords stored plaintext for now. TODO: replace with bcrypt before real deployment.
router.post('/staff', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name are required' });

  const existing = db.prepare('SELECT id FROM staff_accounts WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'A staff account with this email already exists' });

  const id = `staff-${randomUUID()}`;
  db.prepare('INSERT INTO staff_accounts (id, email, password, name, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    email,
    password,
    name,
    new Date().toISOString()
  );
  res.json({ id, email, name });
});

router.delete('/staff/:id', (req, res) => {
  const result = db.prepare('DELETE FROM staff_accounts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Staff account not found' });
  res.json({ ok: true });
});

router.get('/activity-log', (req, res) => {
  const log = db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 200').all();
  res.json(log);
});

module.exports = router;
