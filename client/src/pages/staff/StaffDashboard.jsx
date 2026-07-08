import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import PageHeader from '../../components/PageHeader.jsx';
import NavBar from '../../components/NavBar.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function StaffDashboard() {
  const [user, setUser] = useState(null);
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(null);
  const navigate = useNavigate();

  const loadQueue = useCallback(() => {
    api.get('/staff/queue').then((res) => setQueue(res.data));
  }, []);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        loadQueue();
      })
      .catch(() => navigate('/staff/login'));
  }, [navigate, loadQueue]);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    navigate('/staff/login');
  };

  const updateStatus = async (id, status) => {
    setBusy(id);
    try {
      await api.post(`/staff/jobs/${id}/status`, { status });
      loadQueue();
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;

  const queued = queue.filter((j) => j.status === 'queued');
  const printing = queue.filter((j) => j.status === 'printing');

  return (
    <div className="page">
      <PageHeader />
      <NavBar roleLabel="Staff" userName={user.name} onLogout={handleLogout} />

      <p className="micro-label">Print Queue</p>
      <h2 className="section-heading">Live Queue</h2>

      <div className="stat-row">
        <StatCard label="Queued" number={queued.length} desc="Waiting to print" />
        <StatCard label="Printing" number={printing.length} desc="On the printer now" />
      </div>

      {queue.length === 0 ? (
        <p className="text-muted">Queue is empty.</p>
      ) : (
        <div className="card">
          <div className="row-list">
            {queue.map((job) => (
              <div key={job.id} className="row-item">
                <div>
                  <strong>{job.status === 'printing' ? 'Printing' : `#${job.queue_position}`}</strong>{' '}
                  {job.student_name} &middot; {job.file_name} &middot; {job.pages_to_print}p × {job.copies}
                  <div className="timestamp">
                    {job.status === 'queued' && job.expected_pickup_time
                      ? `Ready by ${new Date(job.expected_pickup_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                      : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={job.status} />
                  {job.status === 'queued' && (
                    <button className="btn btn-primary btn-sm" disabled={busy === job.id} onClick={() => updateStatus(job.id, 'printing')}>
                      Mark printing
                    </button>
                  )}
                  {job.status === 'printing' && (
                    <>
                      <button className="btn btn-primary btn-sm" disabled={busy === job.id} onClick={() => updateStatus(job.id, 'completed')}>
                        Mark completed
                      </button>
                      <button className="btn btn-danger btn-sm" disabled={busy === job.id} onClick={() => updateStatus(job.id, 'failed')}>
                        Mark failed
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
