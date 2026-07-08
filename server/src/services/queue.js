const db = require('../db/db');

const MINUTES_PER_JOB = 10;

// Recomputes queue_position / expected_pickup_time for every 'queued' job,
// FIFO ordered by when each job was approved (decided_at). Called after any
// status transition that affects the queue (approve, printing, completed, failed)
// so reads are always served from up-to-date, already-persisted values.
function recomputeQueue() {
  const queuedJobs = db
    .prepare("SELECT id, decided_at, created_at FROM jobs WHERE status = 'queued' ORDER BY COALESCE(decided_at, created_at) ASC")
    .all();

  const now = Date.now();
  const update = db.prepare('UPDATE jobs SET queue_position = ?, expected_pickup_time = ?, updated_at = ? WHERE id = ?');
  const nowIso = new Date(now).toISOString();

  const tx = db.transaction((jobs) => {
    jobs.forEach((job, index) => {
      const position = index + 1;
      const pickupTime = new Date(now + position * MINUTES_PER_JOB * 60 * 1000).toISOString();
      update.run(position, pickupTime, nowIso, job.id);
    });
  });
  tx(queuedJobs);

  return queuedJobs.length;
}

module.exports = { recomputeQueue, MINUTES_PER_JOB };
