import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import PageHeader from '../../components/PageHeader.jsx';
import NavBar from '../../components/NavBar.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

const TABS = [
  { key: 'pending', label: 'Pending Approval' },
  { key: 'queue', label: 'Print Queue' },
  { key: 'staff', label: 'Staff' },
  { key: 'activity', label: 'Activity Log' },
];

function PendingTab({ jobs, onDecided }) {
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const approve = async (id) => {
    setBusy(true);
    try {
      await api.post(`/admin/jobs/${id}/approve`);
      onDecided();
    } catch (err) {
      alert(err.response?.data?.error || 'Approve failed');
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async (id) => {
    setBusy(true);
    try {
      await api.post(`/admin/jobs/${id}/reject`, { reason });
      setRejecting(null);
      setReason('');
      onDecided();
    } catch (err) {
      alert(err.response?.data?.error || 'Reject failed');
    } finally {
      setBusy(false);
    }
  };

  if (jobs.length === 0) return <p className="text-muted">No jobs waiting for approval.</p>;

  return (
    <div>
      {jobs.map((job) => (
        <div key={job.id} className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 700, margin: 0 }}>{job.student_name} ({job.register_no}) &middot; {job.student_email}</p>
              <p className="text-muted" style={{ margin: '4px 0' }}>
                {job.file_name} &middot; {job.pages_to_print} pages &middot; {job.paper_size} &middot; {job.print_mode} &middot; {job.copies}x
              </p>
              <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
                Total: <strong style={{ color: 'var(--color-text)' }}>₹{job.total_amount}</strong> &middot; UPI ref: <strong style={{ color: 'var(--color-text)' }}>{job.upi_reference_id}</strong>
              </p>
              <a href={`/${job.screenshot_path}`} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>View payment screenshot</a>
              {' · '}
              <a href={`/${job.file_path}`} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>View document</a>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => approve(job.id)}>Approve</button>
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setRejecting(rejecting === job.id ? null : job.id)}>Reject</button>
            </div>
          </div>
          {rejecting === job.id && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
              <textarea placeholder="Reason (optional, shown to student)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="btn btn-danger btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={() => confirmReject(job.id)}>
                Confirm rejection
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QueueTab({ jobs }) {
  if (jobs.length === 0) return <p className="text-muted">Queue is empty.</p>;
  return (
    <div className="card">
      <div className="row-list">
        {jobs.map((job) => (
          <div key={job.id} className="row-item">
            <div>
              <strong>{job.status === 'printing' ? 'Printing now' : `#${job.queue_position}`}</strong>{' '}
              {job.student_name} &middot; {job.file_name}
              <div className="timestamp">
                {job.status === 'queued' && job.expected_pickup_time
                  ? `Ready by ${new Date(job.expected_pickup_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                  : ''}
              </div>
            </div>
            <StatusBadge status={job.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffTab() {
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/admin/staff').then((res) => setStaff(res.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addStaff = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/staff', { name, email, password });
      setName(''); setEmail(''); setPassword('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add staff account');
    }
  };

  const removeStaff = async (id) => {
    if (!confirm('Remove this staff account?')) return;
    await api.delete(`/admin/staff/${id}`);
    load();
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <p className="micro-label">Add staff account</p>
        <form onSubmit={addStaff} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label>Password</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <div className="row-list">
          {staff.map((s) => (
            <div key={s.id} className="row-item">
              <div>
                <strong>{s.name}</strong> <span className="text-muted">{s.email}</span>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => removeStaff(s.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityTab() {
  const [log, setLog] = useState([]);
  useEffect(() => { api.get('/admin/activity-log').then((res) => setLog(res.data)); }, []);

  if (log.length === 0) return <p className="text-muted">No activity yet.</p>;

  return (
    <div className="card">
      <div className="row-list">
        {log.map((entry) => (
          <div key={entry.id} className="row-item">
            <div>
              <strong>{entry.action.replace(/_/g, ' ')}</strong> &middot; {entry.job_id}
              {entry.note && <div className="text-muted" style={{ fontSize: 13 }}>{entry.note}</div>}
            </div>
            <div>
              <div>{entry.performed_by}</div>
              <div className="timestamp">{new Date(entry.timestamp).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [queue, setQueue] = useState([]);
  const navigate = useNavigate();

  const loadJobs = useCallback(() => {
    api.get('/admin/pending').then((res) => setPending(res.data));
    api.get('/admin/queue').then((res) => setQueue(res.data));
  }, []);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        if (res.data.user.role !== 'admin') return navigate('/admin/login');
        setUser(res.data.user);
        loadJobs();
      })
      .catch(() => navigate('/admin/login'));
  }, [navigate, loadJobs]);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    navigate('/admin/login');
  };

  if (!user) return null;

  return (
    <div className="page">
      <PageHeader />
      <NavBar roleLabel="Admin" userName={user.name} tabs={TABS} activeTab={tab} onTabChange={setTab} onLogout={handleLogout} />

      <p className="micro-label">Dashboard</p>
      <h2 className="section-heading">Dashboard Overview</h2>

      <div className="stat-row">
        <StatCard label="Pending Approval" number={pending.length} desc="Awaiting payment confirmation" />
        <StatCard label="In Queue" number={queue.filter((j) => j.status === 'queued').length} desc="Approved, waiting to print" />
        <StatCard label="Printing" number={queue.filter((j) => j.status === 'printing').length} desc="Currently on the printer" />
      </div>

      {tab === 'pending' && <PendingTab jobs={pending} onDecided={loadJobs} />}
      {tab === 'queue' && <QueueTab jobs={queue} />}
      {tab === 'staff' && <StaffTab />}
      {tab === 'activity' && <ActivityTab />}
    </div>
  );
}
