const express = require('express');
const db = require('../db/db');
const { requireStaff } = require('../middleware/auth');
const { markJobStatus } = require('../services/jobDecision');

const router = express.Router();
router.use(requireStaff);

router.get('/queue', (req, res) => {
  const jobs = db.prepare("SELECT * FROM jobs WHERE status IN ('queued', 'printing') ORDER BY status DESC, queue_position ASC").all();
  res.json(jobs);
});

router.post('/jobs/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['printing', 'completed', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'status must be printing, completed, or failed' });
  }

  const result = markJobStatus({
    jobId: req.params.id,
    newStatus: status,
    performedBy: req.session.user.name,
  });

  if (result.error === 'not_found') return res.status(404).json({ error: 'Job not found' });
  if (result.error === 'invalid_transition') {
    return res.status(409).json({ error: `Cannot move job from ${result.job.status} to ${status}` });
  }
  res.json({ job: result.job });
});

module.exports = router;
