import { Link } from 'react-router-dom';

export default function PublicHeader() {
  return (
    <div className="nav-pill">
      <div className="nav-user">
        <strong>PrintHub</strong> <span className="text-muted">College print management</span>
      </div>
      <div className="nav-actions">
        <Link className="nav-link" to="/">
          New Request
        </Link>
        <Link className="nav-link" to="/status">
          Check Status
        </Link>
      </div>
    </div>
  );
}
