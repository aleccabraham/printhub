import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function ConfirmationStep({ state }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p className="micro-label">Step 4</p>
      <h2 className="section-heading" style={{ fontSize: 22, marginBottom: 20 }}>
        Request submitted
      </h2>

      <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)', marginBottom: 20 }}>
        <p className="text-muted" style={{ marginBottom: 6 }}>Job ID</p>
        <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{state.jobId}</p>
        <StatusBadge status="pending_approval" />
      </div>

      <p className="text-muted" style={{ lineHeight: 1.6 }}>
        Your request is awaiting confirmation that your payment was received. Once approved, you'll get an
        email at <strong>{state.studentEmail}</strong> with your queue position and an expected pickup time.
      </p>

      <Link to={`/status/${state.jobId}`} className="btn btn-primary" style={{ marginTop: 16 }}>
        Check status
      </Link>
    </div>
  );
}
