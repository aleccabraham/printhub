const express = require('express');
const db = require('../db/db');
const { approveJob, rejectJob } = require('../services/jobDecision');
const { getBaseUrl } = require('../utils/baseUrl');

const router = express.Router();

function page({ title, heading, body, color = '#5B2A6B' }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, Segoe UI, sans-serif; background: #F5F1EA; margin: 0; padding: 40px 20px; }
  .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); padding: 32px; }
  h1 { color: ${color}; font-size: 22px; margin-top: 0; }
  p { color: #444; line-height: 1.5; }
  textarea { width: 100%; box-sizing: border-box; border-radius: 8px; border: 1px solid #ddd; padding: 10px; font-family: inherit; min-height: 80px; }
  button { background: ${color}; color: #fff; border: none; border-radius: 999px; padding: 10px 24px; font-size: 15px; cursor: pointer; margin-top: 12px; }
</style></head>
<body><div class="card"><h1>${heading}</h1>${body}</div></body></html>`;
}

function findJobByToken(token) {
  return db.prepare('SELECT * FROM jobs WHERE approval_token = ?').get(token);
}

function tokenState(job) {
  if (!job) return 'invalid';
  if (job.approval_token_used) return 'used';
  if (new Date(job.approval_token_expires_at).getTime() < Date.now()) return 'expired';
  if (job.status !== 'pending_approval') return 'used';
  return 'valid';
}

router.get('/approve/:token', async (req, res) => {
  const job = findJobByToken(req.params.token);
  const state = tokenState(job);

  if (state === 'invalid') return res.status(404).send(page({ title: 'Invalid link', heading: 'Invalid link', body: '<p>This approval link is not valid.</p>' }));
  if (state === 'used') return res.send(page({ title: 'Already actioned', heading: 'Already actioned', body: `<p>This job (${job.id}) has already been actioned. Current status: <strong>${job.status}</strong>.</p>` }));
  if (state === 'expired') return res.send(page({ title: 'Link expired', heading: 'Link expired', body: '<p>This approval link has expired (links are valid for 24 hours).</p>' }));

  const result = await approveJob({ jobId: job.id, decidedBy: 'email-link', method: 'email_link', baseUrl: getBaseUrl(req) });
  if (result.error) {
    return res.send(page({ title: 'Already actioned', heading: 'Already actioned', body: `<p>This job has already been actioned.</p>` }));
  }
  db.prepare('UPDATE jobs SET approval_token_used = 1 WHERE id = ?').run(job.id);

  const updated = result.job;
  const pickup = new Date(updated.expected_pickup_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  res.send(
    page({
      title: 'Job approved',
      heading: 'Job approved',
      color: '#4E8B5C',
      body: `<p>Job <strong>${updated.id}</strong> for ${updated.student_name} has been approved and added to the queue.</p>
             <p>Queue position: <strong>${updated.queue_position}</strong><br/>Expected pickup: <strong>${pickup}</strong></p>
             <p>The student has been emailed automatically.</p>`,
    })
  );
});

router.get('/reject/:token', (req, res) => {
  const job = findJobByToken(req.params.token);
  const state = tokenState(job);

  if (state === 'invalid') return res.status(404).send(page({ title: 'Invalid link', heading: 'Invalid link', body: '<p>This rejection link is not valid.</p>' }));
  if (state === 'used') return res.send(page({ title: 'Already actioned', heading: 'Already actioned', body: `<p>This job (${job.id}) has already been actioned. Current status: <strong>${job.status}</strong>.</p>` }));
  if (state === 'expired') return res.send(page({ title: 'Link expired', heading: 'Link expired', body: '<p>This rejection link has expired (links are valid for 24 hours).</p>' }));

  res.send(
    page({
      title: 'Reject job',
      heading: `Reject job ${job.id}?`,
      color: '#C0392B',
      body: `<p>Student: ${job.student_name} (${job.student_email})<br/>Amount: Rs.${job.total_amount}</p>
             <form method="POST" action="/api/link/reject/${req.params.token}">
               <label>Reason (optional, shown to student):</label>
               <textarea name="reason" placeholder="e.g. payment reference did not match"></textarea><br/>
               <button type="submit">Confirm rejection</button>
             </form>`,
    })
  );
});

router.post('/reject/:token', express.urlencoded({ extended: true }), async (req, res) => {
  const job = findJobByToken(req.params.token);
  const state = tokenState(job);

  if (state === 'invalid') return res.status(404).send(page({ title: 'Invalid link', heading: 'Invalid link', body: '<p>This rejection link is not valid.</p>' }));
  if (state === 'used') return res.send(page({ title: 'Already actioned', heading: 'Already actioned', body: `<p>This job has already been actioned. Current status: <strong>${job.status}</strong>.</p>` }));
  if (state === 'expired') return res.send(page({ title: 'Link expired', heading: 'Link expired', body: '<p>This rejection link has expired.</p>' }));

  const result = await rejectJob({
    jobId: job.id,
    decidedBy: 'email-link',
    method: 'email_link',
    reason: req.body.reason,
    baseUrl: getBaseUrl(req),
  });
  if (result.error) {
    return res.send(page({ title: 'Already actioned', heading: 'Already actioned', body: `<p>This job has already been actioned.</p>` }));
  }
  db.prepare('UPDATE jobs SET approval_token_used = 1 WHERE id = ?').run(job.id);

  res.send(
    page({
      title: 'Job rejected',
      heading: 'Job rejected',
      color: '#C0392B',
      body: `<p>Job <strong>${job.id}</strong> for ${job.student_name} has been rejected. The student has been notified by email.</p>`,
    })
  );
});

module.exports = router;
