const { randomUUID } = require('crypto');
const db = require('../db/db');
const { recomputeQueue } = require('./queue');
const { sendStudentApproved, sendStudentRejected } = require('./email');

function logActivity({ jobId, action, performedBy, note }) {
  db.prepare(
    'INSERT INTO activity_log (id, job_id, action, performed_by, timestamp, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(`activity-${randomUUID()}`, jobId, action, performedBy, new Date().toISOString(), note || null);
}

function getJob(jobId) {
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
}

// Shared by both the admin/staff dashboard path and the public email-link path.
async function approveJob({ jobId, decidedBy, method, baseUrl }) {
  const job = getJob(jobId);
  if (!job) return { error: 'not_found' };
  if (job.status !== 'pending_approval') return { error: 'already_actioned', job };

  const nowIso = new Date().toISOString();
  db.prepare(
    "UPDATE jobs SET status = 'queued', decided_by = ?, decided_at = ?, decision_method = ?, updated_at = ? WHERE id = ?"
  ).run(decidedBy, nowIso, method, nowIso, jobId);

  recomputeQueue();

  const updatedJob = getJob(jobId);
  logActivity({ jobId, action: 'approved', performedBy: decidedBy, note: null });

  try {
    await sendStudentApproved({ job: updatedJob, baseUrl });
  } catch (err) {
    console.error('[jobDecision] Failed to send approval email to student:', err.message);
  }

  return { job: updatedJob };
}

async function rejectJob({ jobId, decidedBy, method, reason, baseUrl }) {
  const job = getJob(jobId);
  if (!job) return { error: 'not_found' };
  if (job.status !== 'pending_approval') return { error: 'already_actioned', job };

  const nowIso = new Date().toISOString();
  db.prepare(
    "UPDATE jobs SET status = 'rejected', rejection_reason = ?, decided_by = ?, decided_at = ?, decision_method = ?, updated_at = ? WHERE id = ?"
  ).run(reason || null, decidedBy, nowIso, method, nowIso, jobId);

  const updatedJob = getJob(jobId);
  logActivity({ jobId, action: 'rejected', performedBy: decidedBy, note: reason || null });

  try {
    await sendStudentRejected({ job: updatedJob, baseUrl });
  } catch (err) {
    console.error('[jobDecision] Failed to send rejection email to student:', err.message);
  }

  return { job: updatedJob };
}

function markJobStatus({ jobId, newStatus, performedBy, note }) {
  const job = getJob(jobId);
  if (!job) return { error: 'not_found' };

  const validTransitions = {
    queued: ['printing'],
    printing: ['completed', 'failed'],
  };
  const allowed = validTransitions[job.status] || [];
  if (!allowed.includes(newStatus)) {
    return { error: 'invalid_transition', job };
  }

  const nowIso = new Date().toISOString();
  db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, nowIso, jobId);

  recomputeQueue();

  const actionMap = { printing: 'marked_printing', completed: 'marked_completed', failed: 'marked_failed' };
  logActivity({ jobId, action: actionMap[newStatus], performedBy, note: note || null });

  return { job: getJob(jobId) };
}

module.exports = { approveJob, rejectJob, markJobStatus, logActivity, getJob };
