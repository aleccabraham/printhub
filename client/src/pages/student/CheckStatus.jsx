import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client.js';
import PageHeader from '../../components/PageHeader.jsx';
import PublicHeader from '../../components/PublicHeader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

function JobCard({ job }) {
  const pickup = job.expected_pickup_time
    ? new Date(job.expected_pickup_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>Job ID</p>
          <p style={{ fontWeight: 700, margin: 0 }}>{job.id}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <div className="row-list">
        <div className="row-item"><span>Document</span><span>{job.file_name}</span></div>
        <div className="row-item"><span>Pages / copies</span><span>{job.pages_to_print} × {job.copies}</span></div>
        <div className="row-item"><span>Total amount</span><span>₹{job.total_amount}</span></div>
        {job.status === 'queued' && (
          <>
            <div className="row-item"><span>Queue position</span><span>#{job.queue_position}</span></div>
            <div className="row-item"><span>Expected pickup</span><span>{pickup}</span></div>
          </>
        )}
        {job.status === 'rejected' && job.rejection_reason && (
          <div className="row-item"><span>Reason</span><span>{job.rejection_reason}</span></div>
        )}
      </div>
    </div>
  );
}

export default function CheckStatus() {
  const { id } = useParams();
  const [email, setEmail] = useState('');
  const [job, setJob] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/jobs/${id}`)
      .then((res) => setJob(res.data))
      .catch(() => setError('Job not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLookup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/jobs', { params: { email } });
      setJobs(res.data);
      if (res.data.length === 0) setError('No requests found for this email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader />
      <PublicHeader />
      <p className="micro-label">Status</p>
      <h2 className="section-heading">Check your request</h2>

      {id ? (
        <div className="form-column">
          {loading && <p className="text-muted">Loading…</p>}
          {error && <p className="error-text">{error}</p>}
          {job && <JobCard job={job} />}
          <Link to="/status" className="btn btn-secondary" style={{ marginTop: 16 }}>Look up another request</Link>
        </div>
      ) : (
        <div className="status-layout">
          <form onSubmit={handleLookup} className="card">
            <div className="field">
              <label>College email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@college.edu" required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Looking up…' : 'Find my requests'}
            </button>
            {error && <p className="error-text">{error}</p>}
          </form>

          <div className="results-column">
            {jobs && jobs.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </div>
      )}
    </div>
  );
}
