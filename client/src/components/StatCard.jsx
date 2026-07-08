export default function StatCard({ label, number, desc }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-number">{number}</div>
      {desc && <div className="stat-desc">{desc}</div>}
    </div>
  );
}
