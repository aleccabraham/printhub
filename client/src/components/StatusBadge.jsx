const STATUS_MAP = {
  pending_approval: { label: 'Pending Approval', cls: 'badge-amber' },
  queued: { label: 'Queued', cls: 'badge-plum' },
  printing: { label: 'Printing', cls: 'badge-plum' },
  completed: { label: 'Completed', cls: 'badge-green' },
  failed: { label: 'Failed', cls: 'badge-red' },
  rejected: { label: 'Rejected', cls: 'badge-red' },
};

export default function StatusBadge({ status }) {
  const entry = STATUS_MAP[status] || { label: status, cls: 'badge-neutral' };
  return <span className={`badge ${entry.cls}`}>{entry.label}</span>;
}
